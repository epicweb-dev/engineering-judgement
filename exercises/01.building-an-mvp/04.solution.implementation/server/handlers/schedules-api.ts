import { type BuildAction } from 'remix/fetch-router'
import {
	normalizeIanaTimeZone,
	slotIncrementOptions,
	type SlotIncrement,
} from '#shared/scheduling-time.ts'
import {
	createSchedule,
	listAttendeeAvailability,
	listAttendeeSummary,
	listResponseCountsBySlot,
	listScheduleSlotsUtc,
	readScheduleByHostAccess,
	readScheduleByKey,
	updateScheduleByHostAccess,
	upsertAttendeeAvailability,
} from '#server/scheduling-repository.ts'
import { type routes } from '#server/routes.ts'
import { type AppEnv } from '#types/env-schema.ts'

type ScheduleView = {
	scheduleKey: string
	title: string
	startDate: string
	endDate: string
	slotMinutes: SlotIncrement
	timezone: string
	slotsUtc: Array<string>
	responseCounts: Record<string, number>
	totalResponders: number
	bestSlotUtc: string | null
}

function isIsoDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseSlotIncrement(value: unknown): SlotIncrement | null {
	const numeric =
		typeof value === 'number'
			? value
			: typeof value === 'string'
				? Number(value)
				: NaN
	if (!Number.isInteger(numeric)) return null
	return slotIncrementOptions.includes(numeric as SlotIncrement)
		? (numeric as SlotIncrement)
		: null
}

function parseSlotList(value: unknown) {
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === 'string')
}

function validateSchedulePayload(body: unknown) {
	if (!body || typeof body !== 'object') return null

	const raw = body as Record<string, unknown>
	const title =
		typeof raw.title === 'string' && raw.title.trim()
			? raw.title.trim()
			: 'New plan'
	const startDate =
		typeof raw.startDate === 'string' ? raw.startDate.trim() : ''
	const endDate = typeof raw.endDate === 'string' ? raw.endDate.trim() : ''
	const slotMinutes = parseSlotIncrement(raw.slotMinutes)
	const timezone = normalizeIanaTimeZone(
		typeof raw.timezone === 'string' ? raw.timezone : '',
	)
	const selectedSlotUtc = parseSlotList(raw.selectedSlotsUtc)

	if (!isIsoDate(startDate) || !isIsoDate(endDate) || !slotMinutes) {
		return null
	}

	return {
		title,
		startDate,
		endDate,
		slotMinutes,
		timezone,
		selectedSlotUtc,
	}
}

function mapResponseCountsToRecord(counts: Map<string, number>) {
	const responseCounts: Record<string, number> = {}
	for (const [slot, count] of counts.entries()) {
		responseCounts[slot] = count
	}
	return responseCounts
}

function computeBestSlot(counts: Map<string, number>) {
	let bestSlotUtc: string | null = null
	let bestCount = -1
	for (const [slotUtc, count] of counts.entries()) {
		if (count > bestCount) {
			bestSlotUtc = slotUtc
			bestCount = count
			continue
		}
		if (count === bestCount && bestSlotUtc && slotUtc.localeCompare(bestSlotUtc) < 0) {
			bestSlotUtc = slotUtc
		}
	}
	return bestSlotUtc
}

async function buildScheduleView(
	db: D1Database,
	scheduleId: number,
	schedule: {
		scheduleKey: string
		title: string
		startDate: string
		endDate: string
		slotMinutes: SlotIncrement
		timezone: string
	},
) {
	const slotsUtc = await listScheduleSlotsUtc(db, scheduleId)
	const responseCountsMap = await listResponseCountsBySlot(db, scheduleId)
	const responseCounts = mapResponseCountsToRecord(responseCountsMap)
	const bestSlotUtc = computeBestSlot(responseCountsMap)
	const totalRespondersRows = await db
		.prepare(
			'select count(distinct attendee_name_key) as total from attendee_availability where schedule_id = ?',
		)
		.bind(scheduleId)
		.first<{ total: number }>()

	return {
		scheduleKey: schedule.scheduleKey,
		title: schedule.title,
		startDate: schedule.startDate,
		endDate: schedule.endDate,
		slotMinutes: schedule.slotMinutes,
		timezone: schedule.timezone,
		slotsUtc,
		responseCounts,
		totalResponders: Number(totalRespondersRows?.total ?? 0),
		bestSlotUtc,
	} satisfies ScheduleView
}

export function createCreateScheduleHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request, url }) {
			let body: unknown
			try {
				body = await request.json()
			} catch {
				return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
			}

			const payload = validateSchedulePayload(body)
			if (!payload) {
				return Response.json({ error: 'Invalid schedule payload.' }, { status: 400 })
			}

			try {
				const schedule = await createSchedule(appEnv.APP_DB, payload)
				const attendeeUrl = `/s/${schedule.scheduleKey}`
				const hostUrl = `/s/${schedule.scheduleKey}/${schedule.hostKey}`
				return Response.json(
					{
						ok: true,
						scheduleKey: schedule.scheduleKey,
						hostKey: schedule.hostKey,
						attendeeUrl,
						hostUrl,
					},
					{
						status: 201,
						headers: {
							Location: new URL(hostUrl, url.origin).toString(),
						},
					},
				)
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to create schedule.'
				return Response.json({ error: message }, { status: 400 })
			}
		},
	} satisfies BuildAction<
		typeof routes.apiCreateSchedule.method,
		typeof routes.apiCreateSchedule.pattern
	>
}

export function createReadScheduleHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ params, url }) {
			const scheduleKey = params.scheduleKey
			const schedule = await readScheduleByKey(appEnv.APP_DB, scheduleKey)
			if (!schedule) {
				return Response.json({ error: 'Schedule not found.' }, { status: 404 })
			}

			const view = await buildScheduleView(appEnv.APP_DB, schedule.id, schedule)
			const attendeeName = url.searchParams.get('attendeeName')?.trim() ?? ''
			const attendeeSelection = attendeeName
				? await listAttendeeAvailability(appEnv.APP_DB, schedule.id, attendeeName)
				: []

			return Response.json({
				ok: true,
				mode: 'respond',
				schedule: view,
				attendeeSelection,
			})
		},
	} satisfies BuildAction<
		typeof routes.apiSchedule.method,
		typeof routes.apiSchedule.pattern
	>
}

export function createSubmitResponseHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request, params }) {
			const schedule = await readScheduleByKey(appEnv.APP_DB, params.scheduleKey)
			if (!schedule) {
				return Response.json({ error: 'Schedule not found.' }, { status: 404 })
			}

			let body: unknown
			try {
				body = await request.json()
			} catch {
				return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
			}

			if (!body || typeof body !== 'object') {
				return Response.json({ error: 'Invalid payload.' }, { status: 400 })
			}

			const raw = body as Record<string, unknown>
			const attendeeName =
				typeof raw.attendeeName === 'string' ? raw.attendeeName : ''
			const selectedSlotUtc = parseSlotList(raw.selectedSlotsUtc)

			try {
				const result = await upsertAttendeeAvailability(appEnv.APP_DB, schedule.id, {
					attendeeName,
					selectedSlotUtc,
				})
				return Response.json({ ok: true, attendeeName: result.attendeeName })
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to save response.'
				return Response.json({ error: message }, { status: 400 })
			}
		},
	} satisfies BuildAction<
		typeof routes.apiScheduleResponses.method,
		typeof routes.apiScheduleResponses.pattern
	>
}

export function createReadHostScheduleHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ params }) {
			const schedule = await readScheduleByHostAccess(
				appEnv.APP_DB,
				params.scheduleKey,
				params.hostKey,
			)
			if (!schedule) {
				return Response.json({ error: 'Host schedule not found.' }, { status: 404 })
			}

			const view = await buildScheduleView(appEnv.APP_DB, schedule.id, schedule)
			const attendeeSummary = await listAttendeeSummary(appEnv.APP_DB, schedule.id)
			return Response.json({
				ok: true,
				mode: 'host',
				schedule: view,
				hostKey: schedule.hostKey,
				attendeeSummary,
			})
		},
	} satisfies BuildAction<
		typeof routes.apiHostSchedule.method,
		typeof routes.apiHostSchedule.pattern
	>
}

export function createUpdateHostScheduleHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request, params }) {
			let body: unknown
			try {
				body = await request.json()
			} catch {
				return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
			}

			const payload = validateSchedulePayload(body)
			if (!payload) {
				return Response.json({ error: 'Invalid schedule payload.' }, { status: 400 })
			}

			try {
				const schedule = await updateScheduleByHostAccess(
					appEnv.APP_DB,
					params.scheduleKey,
					params.hostKey,
					payload,
				)
				if (!schedule) {
					return Response.json({ error: 'Host schedule not found.' }, { status: 404 })
				}

				const view = await buildScheduleView(appEnv.APP_DB, schedule.id, schedule)
				const attendeeSummary = await listAttendeeSummary(appEnv.APP_DB, schedule.id)
				return Response.json({
					ok: true,
					mode: 'host',
					schedule: view,
					hostKey: schedule.hostKey,
					attendeeSummary,
				})
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to update schedule.'
				return Response.json({ error: message }, { status: 400 })
			}
		},
	} satisfies BuildAction<
		typeof routes.apiHostScheduleUpdate.method,
		typeof routes.apiHostScheduleUpdate.pattern
	>
}

