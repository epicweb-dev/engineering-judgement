import { type BuildAction } from 'remix/fetch-router'
import { getScheduleSnapshot } from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { getShareToken } from './schedule-handler-utils.ts'
import { authorizeHostScheduleRequest } from './schedule-host-auth.ts'

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

			const authorization = await authorizeHostScheduleRequest({
				db: appEnv.APP_DB,
				request,
				shareToken,
			})
			if (!authorization.ok) return authorization.response

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
