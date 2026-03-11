import { type BuildAction } from 'remix/fetch-router'
import {
	getScheduleSnapshot,
	updateScheduleHostSettings,
} from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { getShareToken, isRecordValue } from './schedule-handler-utils.ts'
import { authorizeHostScheduleRequest } from './schedule-host-auth.ts'

type HostUpdateRequest = {
	hostName?: unknown
	title?: unknown
	blockedSlots?: unknown
	rangeStartUtc?: unknown
	rangeEndUtc?: unknown
	submissionId?: unknown
	submissionName?: unknown
	deleteSubmission?: unknown
}

function toOptionalString(value: unknown) {
	return typeof value === 'string' ? value : undefined
}

function toOptionalBoolean(value: unknown) {
	return typeof value === 'boolean' ? value : undefined
}

function toOptionalStringArray(value: unknown) {
	if (value === undefined) return undefined
	if (!Array.isArray(value)) return undefined
	return value as Array<string>
}

function toSubmissionUpdate(body: HostUpdateRequest) {
	const attendeeId = toOptionalString(body.submissionId)
	if (typeof attendeeId !== 'string') return undefined
	return {
		attendeeId,
		name: toOptionalString(body.submissionName),
		delete: toOptionalBoolean(body.deleteSubmission),
	}
}

function isHostUpdateValidationError(message: string) {
	return /(required|requires|invalid|must|range|interval|too large|cannot|flag)/i.test(
		message,
	)
}

function isNotFoundError(message: string) {
	return /not found/i.test(message)
}

export function createScheduleHostUpdateHandler(
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
			const authorization = await authorizeHostScheduleRequest({
				db: appEnv.APP_DB,
				request,
				shareToken,
			})
			if (!authorization.ok) return authorization.response

			let body: HostUpdateRequest
			try {
				const parsed = await request.json()
				if (!isRecordValue(parsed)) {
					return Response.json(
						{ ok: false, error: 'Invalid JSON payload.' },
						{ status: 400 },
					)
				}
				body = parsed as HostUpdateRequest
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			if (body.title !== undefined && typeof body.title !== 'string') {
				return Response.json(
					{ ok: false, error: 'title must be a string.' },
					{ status: 400 },
				)
			}
			if (body.hostName !== undefined && typeof body.hostName !== 'string') {
				return Response.json(
					{ ok: false, error: 'hostName must be a string.' },
					{ status: 400 },
				)
			}
			if (
				body.rangeStartUtc !== undefined &&
				typeof body.rangeStartUtc !== 'string'
			) {
				return Response.json(
					{ ok: false, error: 'rangeStartUtc must be a string.' },
					{ status: 400 },
				)
			}
			if (
				body.rangeEndUtc !== undefined &&
				typeof body.rangeEndUtc !== 'string'
			) {
				return Response.json(
					{ ok: false, error: 'rangeEndUtc must be a string.' },
					{ status: 400 },
				)
			}
			if (
				body.blockedSlots !== undefined &&
				(!Array.isArray(body.blockedSlots) ||
					body.blockedSlots.some((slot) => typeof slot !== 'string'))
			) {
				return Response.json(
					{ ok: false, error: 'blockedSlots must be an array of strings.' },
					{ status: 400 },
				)
			}
			if (
				body.submissionId !== undefined &&
				typeof body.submissionId !== 'string'
			) {
				return Response.json(
					{ ok: false, error: 'submissionId must be a string.' },
					{ status: 400 },
				)
			}
			if (
				body.submissionName !== undefined &&
				typeof body.submissionName !== 'string'
			) {
				return Response.json(
					{ ok: false, error: 'submissionName must be a string.' },
					{ status: 400 },
				)
			}
			if (
				body.deleteSubmission !== undefined &&
				typeof body.deleteSubmission !== 'boolean'
			) {
				return Response.json(
					{ ok: false, error: 'deleteSubmission must be a boolean.' },
					{ status: 400 },
				)
			}
			if (
				body.submissionId === undefined &&
				(body.submissionName !== undefined || body.deleteSubmission === true)
			) {
				return Response.json(
					{
						ok: false,
						error: 'submissionId is required for submission updates.',
					},
					{ status: 400 },
				)
			}
			if (
				typeof body.submissionId === 'string' &&
				body.deleteSubmission !== true &&
				body.submissionName === undefined
			) {
				return Response.json(
					{
						ok: false,
						error: 'Provide submissionName or set deleteSubmission to true.',
					},
					{ status: 400 },
				)
			}
			if (body.deleteSubmission === true && body.submissionName !== undefined) {
				return Response.json(
					{
						ok: false,
						error:
							'Submission update cannot include both submissionName and deleteSubmission.',
					},
					{ status: 400 },
				)
			}

			try {
				await updateScheduleHostSettings(appEnv.APP_DB, {
					shareToken,
					hostName: toOptionalString(body.hostName),
					title: toOptionalString(body.title),
					blockedSlots: toOptionalStringArray(body.blockedSlots),
					rangeStartUtc: toOptionalString(body.rangeStartUtc),
					rangeEndUtc: toOptionalString(body.rangeEndUtc),
					submissionUpdate: toSubmissionUpdate(body),
				})
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Unable to update schedule host settings.'
				if (isNotFoundError(message)) {
					return Response.json({ ok: false, error: message }, { status: 404 })
				}
				if (isHostUpdateValidationError(message)) {
					return Response.json({ ok: false, error: message }, { status: 400 })
				}
				console.error('schedule host update failed:', error)
				return Response.json(
					{ ok: false, error: 'Unable to update schedule host settings.' },
					{ status: 500 },
				)
			}

			const snapshot = await getScheduleSnapshot(appEnv.APP_DB, shareToken)
			if (!snapshot) {
				return Response.json(
					{ ok: false, error: 'Schedule not found.' },
					{ status: 404 },
				)
			}

			const roomId = appEnv.SCHEDULE_ROOM.idFromName(shareToken)
			const room = appEnv.SCHEDULE_ROOM.get(roomId)
			try {
				await room.fetch('https://schedule-room/broadcast', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'schedule-updated',
						shareToken,
						updatedAt: new Date().toISOString(),
					}),
				})
			} catch (broadcastError) {
				console.error('schedule host update broadcast failed:', broadcastError)
			}

			return Response.json({ ok: true, snapshot })
		},
	} satisfies BuildAction<
		typeof routes.scheduleHostUpdate.method,
		typeof routes.scheduleHostUpdate.pattern
	>
}
