import { type BuildAction } from 'remix/fetch-router'
import { readAuthSession } from '#server/auth-session.ts'
import { listSchedulesOwnedByUser } from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'

export function createAccountSchedulesReadHandler(
	appEnv: Pick<AppEnv, 'APP_DB'>,
) {
	return {
		middleware: [],
		async action({ request }) {
			const session = await readAuthSession(request)
			if (!session) {
				return Response.json(
					{ ok: false, error: 'Sign in required.' },
					{ status: 401 },
				)
			}

			const schedules = await listSchedulesOwnedByUser(appEnv.APP_DB, session.id)
			return Response.json({
				ok: true,
				email: session.email,
				schedules,
			})
		},
	} satisfies BuildAction<
		typeof routes.accountSchedulesRead.method,
		typeof routes.accountSchedulesRead.pattern
	>
}
