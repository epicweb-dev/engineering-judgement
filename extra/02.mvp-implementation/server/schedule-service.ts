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
import { type AppEnv } from '#types/env-schema.ts'

export type ScheduleView = {
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

export type ReadScheduleResult = {
	ok: true
	mode: 'respond'
	schedule: ScheduleView
	attendeeSelection: Array<string>
}

export type ReadHostScheduleResult = {
	ok: true
	mode: 'host'
	schedule: ScheduleView
	hostKey: string
	attendeeSummary: Array<{ attendeeName: string; slots: Array<string> }>
}

export type CreateScheduleResult = {
	ok: true
	scheduleKey: string
	hostKey: string
	attendeeUrl: string
	hostUrl: string
}

export type ValidSchedulePayload = {
	title: string
	startDate: string
	endDate: string
	slotMinutes: SlotIncrement
	timezone: string
	selectedSlotUtc: Array<string>
}

function isIsoDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function parseSlotIncrement(value: unknown): SlotIncrement | null {
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

export function parseSlotList(value: unknown) {
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === 'string')
}

export function validateSchedulePayload(body: unknown): ValidSchedulePayload | null {
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
		if (
			count === bestCount &&
			bestSlotUtc &&
			slotUtc.localeCompare(bestSlotUtc) < 0
		) {
			bestSlotUtc = slotUtc
		}
	}
	return bestSlotUtc
}

export async function buildScheduleView(
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

export async function createScheduleWithUrls(
	appEnv: AppEnv,
	payload: ValidSchedulePayload,
) {
	const schedule = await createSchedule(appEnv.APP_DB, payload)
	const attendeeUrl = `/s/${schedule.scheduleKey}`
	const hostUrl = `/s/${schedule.scheduleKey}/${schedule.hostKey}`
	return {
		ok: true,
		scheduleKey: schedule.scheduleKey,
		hostKey: schedule.hostKey,
		attendeeUrl,
		hostUrl,
	} satisfies CreateScheduleResult
}

export async function readScheduleForAttendee(
	appEnv: AppEnv,
	scheduleKey: string,
	attendeeName = '',
) {
	const schedule = await readScheduleByKey(appEnv.APP_DB, scheduleKey)
	if (!schedule) return null

	const view = await buildScheduleView(appEnv.APP_DB, schedule.id, schedule)
	const attendeeSelection = attendeeName.trim()
		? await listAttendeeAvailability(appEnv.APP_DB, schedule.id, attendeeName)
		: []

	return {
		ok: true,
		mode: 'respond',
		schedule: view,
		attendeeSelection,
	} satisfies ReadScheduleResult
}

export async function readScheduleForHost(
	appEnv: AppEnv,
	scheduleKey: string,
	hostKey: string,
) {
	const schedule = await readScheduleByHostAccess(
		appEnv.APP_DB,
		scheduleKey,
		hostKey,
	)
	if (!schedule) return null

	const view = await buildScheduleView(appEnv.APP_DB, schedule.id, schedule)
	const attendeeSummary = await listAttendeeSummary(appEnv.APP_DB, schedule.id)
	return {
		ok: true,
		mode: 'host',
		schedule: view,
		hostKey: schedule.hostKey,
		attendeeSummary,
	} satisfies ReadHostScheduleResult
}

export async function updateScheduleForHost(
	appEnv: AppEnv,
	scheduleKey: string,
	hostKey: string,
	payload: ValidSchedulePayload,
) {
	const schedule = await updateScheduleByHostAccess(
		appEnv.APP_DB,
		scheduleKey,
		hostKey,
		payload,
	)
	if (!schedule) return null

	const view = await buildScheduleView(appEnv.APP_DB, schedule.id, schedule)
	const attendeeSummary = await listAttendeeSummary(appEnv.APP_DB, schedule.id)
	return {
		ok: true,
		mode: 'host',
		schedule: view,
		hostKey: schedule.hostKey,
		attendeeSummary,
	} satisfies ReadHostScheduleResult
}

export async function saveAttendeeAvailability(
	appEnv: AppEnv,
	scheduleKey: string,
	attendeeName: string,
	selectedSlotUtc: ReadonlyArray<string>,
) {
	const schedule = await readScheduleByKey(appEnv.APP_DB, scheduleKey)
	if (!schedule) return null

	const result = await upsertAttendeeAvailability(appEnv.APP_DB, schedule.id, {
		attendeeName,
		selectedSlotUtc,
	})
	return {
		ok: true,
		attendeeName: result.attendeeName,
		selectedSlotUtc: result.selectedSlotUtc,
	}
}
