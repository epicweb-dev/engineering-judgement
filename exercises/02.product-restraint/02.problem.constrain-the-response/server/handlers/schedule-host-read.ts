import { type BuildAction } from 'remix/fetch-router'
import {
	getScheduleSnapshot,
	verifyScheduleHostAccessToken,
} from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { getShareToken } from './schedule-handler-utils.ts'

export function createScheduleHostReadHandler(appEnv: Pick<AppEnv, 'APP_DB'>) {
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

			const providedHostToken = request.headers.get('X-Host-Token')?.trim()
			if (!providedHostToken) {
				return Response.json(
					{ ok: false, error: 'Missing host access token.' },
					{ status: 401 },
				)
			}

			const hostAccessVerification = await verifyScheduleHostAccessToken(
				appEnv.APP_DB,
				shareToken,
				providedHostToken,
			)
			if (hostAccessVerification === 'not-found') {
				return Response.json(
					{ ok: false, error: 'Schedule not found.' },
					{ status: 404 },
				)
			}
			if (hostAccessVerification !== 'valid') {
				return Response.json(
					{ ok: false, error: 'Invalid host access token.' },
					{ status: 403 },
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
		typeof routes.scheduleHostRead.method,
		typeof routes.scheduleHostRead.pattern
	>
}
