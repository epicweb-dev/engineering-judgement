import { type BuildAction } from 'remix/fetch-router'
import { getScheduleSnapshot } from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { getShareToken, isRecordValue } from './schedule-handler-utils.ts'

type DeleteSubmissionRequest = {
	name?: unknown
}

type DeleteSubmissionRoomPayload = {
	ok?: boolean
	deleted?: boolean
	error?: string
}

export function createScheduleDeleteSubmissionHandler(
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

			let body: DeleteSubmissionRequest
			try {
				const parsed = await request.json()
				if (!isRecordValue(parsed)) {
					return Response.json(
						{ ok: false, error: 'Invalid JSON payload.' },
						{ status: 400 },
					)
				}
				body = parsed as DeleteSubmissionRequest
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			const name = typeof body.name === 'string' ? body.name : ''
			const roomId = appEnv.SCHEDULE_ROOM.idFromName(shareToken)
			const room = appEnv.SCHEDULE_ROOM.get(roomId)
			let roomResponse: Response
			try {
				roomResponse = await room.fetch(
					'https://schedule-room/availability/delete',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							shareToken,
							name,
						}),
					},
				)
			} catch (error) {
				console.error('schedule delete submission room call failed:', error)
				return Response.json(
					{ ok: false, error: 'Unable to delete submission.' },
					{ status: 502 },
				)
			}
			const roomPayload = (await roomResponse
				.json()
				.catch(() => null)) as DeleteSubmissionRoomPayload | null
			if (!roomResponse.ok || !roomPayload?.ok) {
				return Response.json(
					{
						ok: false,
						error:
							typeof roomPayload?.error === 'string'
								? roomPayload.error
								: 'Unable to delete submission.',
					},
					{ status: roomResponse.status },
				)
			}

			let snapshot: Awaited<ReturnType<typeof getScheduleSnapshot>>
			try {
				snapshot = await getScheduleSnapshot(appEnv.APP_DB, shareToken)
			} catch (error) {
				console.error('schedule delete submission snapshot load failed:', error)
				return Response.json(
					{ ok: false, error: 'Unable to load schedule snapshot.' },
					{ status: 500 },
				)
			}
			if (!snapshot) {
				return Response.json(
					{ ok: false, error: 'Schedule not found.' },
					{ status: 404 },
				)
			}

			return Response.json({
				ok: true,
				deleted: roomPayload.deleted === true,
				snapshot,
			})
		},
	} satisfies BuildAction<
		typeof routes.scheduleDeleteSubmission.method,
		typeof routes.scheduleDeleteSubmission.pattern
	>
}
