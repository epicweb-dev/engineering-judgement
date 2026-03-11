import { type BuildAction } from 'remix/fetch-router'
import { getScheduleSnapshot } from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { getShareToken } from './schedule-handler-utils.ts'

export function createScheduleReadHandler(appEnv: Pick<AppEnv, 'APP_DB'>) {
	return {
		middleware: [],
		async action({ url }) {
			const shareToken = getShareToken(url.pathname)
			if (!shareToken) {
				return Response.json(
					{ ok: false, error: 'Missing schedule token.' },
					{ status: 400 },
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
		typeof routes.scheduleRead.method,
		typeof routes.scheduleRead.pattern
	>
}
