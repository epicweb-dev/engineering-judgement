import { type BuildAction } from 'remix/fetch-router'
import { getRequestIp, logAuditEvent } from '#server/audit-log.ts'
import { createAuthCookie } from '#server/auth-session.ts'
import { normalizeRedirectPath } from '#server/auth-redirect.ts'
import { consumeHostLoginToken } from '#shared/host-account-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'

export function createLoginVerifyHandler(appEnv: Pick<AppEnv, 'APP_DB'>) {
	return {
		middleware: [],
		async action({ request, url }) {
			const loginToken = url.searchParams.get('token') ?? ''
			const redirectTo = normalizeRedirectPath(url.searchParams.get('redirectTo'))
			const requestIp = getRequestIp(request) ?? undefined

			const loginResult = await consumeHostLoginToken(appEnv.APP_DB, loginToken)
			if (loginResult.status !== 'valid') {
				const loginUrl = new URL('/login', url)
				loginUrl.searchParams.set('redirectTo', redirectTo)
				loginUrl.searchParams.set(
					'error',
					loginResult.status === 'expired' ? 'expired-link' : 'invalid-link',
				)
				void logAuditEvent({
					category: 'auth',
					action: 'login_link_verified',
					result: 'failure',
					ip: requestIp,
					path: url.pathname,
					reason: loginResult.status,
				})
				return Response.redirect(loginUrl, 302)
			}

			const cookie = await createAuthCookie(
				loginResult.session,
				url.protocol === 'https:',
			)
			void logAuditEvent({
				category: 'auth',
				action: 'login_link_verified',
				result: 'success',
				email: loginResult.session.email,
				ip: requestIp,
				path: url.pathname,
			})

			return new Response(null, {
				status: 302,
				headers: {
					Location: redirectTo,
					'Set-Cookie': cookie,
				},
			})
		},
	} satisfies BuildAction<
		typeof routes.loginVerify.method,
		typeof routes.loginVerify.pattern
	>
}
