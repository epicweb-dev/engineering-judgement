import { type BuildAction } from 'remix/fetch-router'
import { getScheduleSnapshot } from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { getShareToken, isRecordValue } from './schedule-handler-utils.ts'

type RenameSubmissionRequest = {
	currentName?: unknown
	nextName?: unknown
}

type RenameSubmissionRoomPayload = {
	ok?: boolean
	renamed?: boolean
	error?: string
}

export function createScheduleRenameSubmissionHandler(
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

			let body: RenameSubmissionRequest
			try {
				const parsed = await request.json()
				if (!isRecordValue(parsed)) {
					return Response.json(
						{ ok: false, error: 'Invalid JSON payload.' },
						{ status: 400 },
					)
				}
				body = parsed as RenameSubmissionRequest
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			const currentName =
				typeof body.currentName === 'string' ? body.currentName : ''
			const nextName = typeof body.nextName === 'string' ? body.nextName : ''
			const roomId = appEnv.SCHEDULE_ROOM.idFromName(shareToken)
			const room = appEnv.SCHEDULE_ROOM.get(roomId)
			let roomResponse: Response
			try {
				roomResponse = await room.fetch(
					'https://schedule-room/availability/rename',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							shareToken,
							currentName,
							nextName,
						}),
					},
				)
			} catch (error) {
				console.error('schedule rename submission room call failed:', error)
				return Response.json(
					{ ok: false, error: 'Unable to rename submission.' },
					{ status: 502 },
				)
			}
			const roomPayload = (await roomResponse
				.json()
				.catch(() => null)) as RenameSubmissionRoomPayload | null
			if (!roomResponse.ok || !roomPayload?.ok) {
				return Response.json(
					{
						ok: false,
						error:
							typeof roomPayload?.error === 'string'
								? roomPayload.error
								: 'Unable to rename submission.',
					},
					{ status: roomResponse.status },
				)
			}

			let snapshot: Awaited<ReturnType<typeof getScheduleSnapshot>>
			try {
				snapshot = await getScheduleSnapshot(appEnv.APP_DB, shareToken)
			} catch (error) {
				console.error('schedule rename submission snapshot load failed:', error)
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
				renamed: roomPayload.renamed === true,
				snapshot,
			})
		},
	} satisfies BuildAction<
		typeof routes.scheduleRenameSubmission.method,
		typeof routes.scheduleRenameSubmission.pattern
	>
}
