import { type BuildAction } from 'remix/fetch-router'
import { getScheduleSnapshot } from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { getShareToken } from './schedule-handler-utils.ts'

type SubmitAvailabilityRequest = {
	name?: unknown
	attendeeTimeZone?: unknown
	selectedSlots?: unknown
}

function toStringArray(value: unknown) {
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === 'string')
}

export function createScheduleSubmitAvailabilityHandler(
	appEnv: Pick<AppEnv, 'APP_DB' | 'SCHEDULE_ROOM'>,
) {
	return {
		middleware: [],
		async action({ request, url }) {
			const shareToken = getShareToken(url.pathname)
			if (!shareToken) {
				return Response.json(
					{ ok: false, error: 'Missing schedule token.' },
					{ status: 400 },
				)
			}

			let body: SubmitAvailabilityRequest
			try {
				body = (await request.json()) as SubmitAvailabilityRequest
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			const name = typeof body.name === 'string' ? body.name : ''
			const attendeeTimeZone =
				typeof body.attendeeTimeZone === 'string' ? body.attendeeTimeZone : ''
			const selectedSlots = toStringArray(body.selectedSlots)
			const roomId = appEnv.SCHEDULE_ROOM.idFromName(shareToken)
			const room = appEnv.SCHEDULE_ROOM.get(roomId)
			const response = await room.fetch('https://schedule-room/availability', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shareToken,
					name,
					attendeeTimeZone,
					selectedSlots,
				}),
			})

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					error?: string
				} | null
				return Response.json(
					{
						ok: false,
						error:
							typeof payload?.error === 'string'
								? payload.error
								: 'Unable to save availability.',
					},
					{ status: response.status },
				)
			}

			const snapshot = await getScheduleSnapshot(appEnv.APP_DB, shareToken)
			if (!snapshot) {
				return Response.json(
					{ ok: false, error: 'Schedule not found.' },
					{ status: 404 },
				)
			}

			return Response.json({ ok: true, snapshot })
		},
	} satisfies BuildAction<
		typeof routes.scheduleSubmitAvailability.method,
		typeof routes.scheduleSubmitAvailability.pattern
	>
}
