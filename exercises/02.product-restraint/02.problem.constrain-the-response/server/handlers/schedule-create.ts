import { type BuildAction } from 'remix/fetch-router'
import { createSchedule, getScheduleSnapshot } from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { isRecordValue } from './schedule-handler-utils.ts'

type CreateScheduleRequest = {
	title?: unknown
	intervalMinutes?: unknown
	rangeStartUtc?: unknown
	rangeEndUtc?: unknown
	hostName?: unknown
	hostTimeZone?: unknown
	selectedSlots?: unknown
	blockedSlots?: unknown
}

function toStringValue(value: unknown) {
	return typeof value === 'string' ? value : ''
}

function toStringArray(value: unknown) {
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === 'string')
}

function toIntervalMinutes(value: unknown) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	if (typeof value === 'string') {
		const parsed = Number.parseInt(value, 10)
		if (Number.isFinite(parsed)) {
			return parsed
		}
	}
	return 0
}

function isCreateScheduleValidationError(message: string) {
	return /(invalid|required|must|later than|range|interval|too large)/i.test(
		message,
	)
}

export function createScheduleCreateHandler(appEnv: Pick<AppEnv, 'APP_DB'>) {
	return {
		middleware: [],
		async action({ request }) {
			let body: CreateScheduleRequest
			try {
				const parsed = await request.json()
				if (!isRecordValue(parsed)) {
					return Response.json(
						{ ok: false, error: 'Invalid JSON payload.' },
						{ status: 400 },
					)
				}
				body = parsed as CreateScheduleRequest
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			try {
				const created = await createSchedule(appEnv.APP_DB, {
					title: toStringValue(body.title),
					intervalMinutes: toIntervalMinutes(body.intervalMinutes),
					rangeStartUtc: toStringValue(body.rangeStartUtc),
					rangeEndUtc: toStringValue(body.rangeEndUtc),
					hostName: toStringValue(body.hostName),
					hostTimeZone: toStringValue(body.hostTimeZone),
					selectedSlots: toStringArray(body.selectedSlots),
					blockedSlots: toStringArray(body.blockedSlots),
				})
				const snapshot = await getScheduleSnapshot(
					appEnv.APP_DB,
					created.shareToken,
				)
				if (!snapshot) {
					throw new Error('Unable to load schedule after creation.')
				}
				return Response.json({
					ok: true,
					shareToken: created.shareToken,
					hostAccessToken: created.hostAccessToken,
					schedulePath: `/s/${created.shareToken}`,
					snapshot,
				})
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to create schedule.'
				if (isCreateScheduleValidationError(message)) {
					return Response.json({ ok: false, error: message }, { status: 400 })
				}

				console.error('create schedule handler failed:', error)
				return Response.json(
					{ ok: false, error: 'Unable to create schedule.' },
					{ status: 500 },
				)
			}
		},
	} satisfies BuildAction<
		typeof routes.scheduleCreate.method,
		typeof routes.scheduleCreate.pattern
	>
}
