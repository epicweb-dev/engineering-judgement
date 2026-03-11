import { type BuildAction } from 'remix/fetch-router'
import { getRequestIp, logAuditEvent } from '#server/audit-log.ts'
import { normalizeRedirectPath } from '#server/auth-redirect.ts'
import { createHostLoginRequest } from '#shared/host-account-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { isRecordValue } from './schedule-handler-utils.ts'

type LoginRequestBody = {
	email?: unknown
	redirectTo?: unknown
}

export function createLoginRequestHandler(appEnv: Pick<AppEnv, 'APP_DB'>) {
	return {
		middleware: [],
		async action({ request, url }) {
			let body: LoginRequestBody
			try {
				const parsed = await request.json()
				if (!isRecordValue(parsed)) {
					return Response.json(
						{ ok: false, error: 'Invalid JSON payload.' },
						{ status: 400 },
					)
				}
				body = parsed as LoginRequestBody
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON payload.' },
					{ status: 400 },
				)
			}

			const email = typeof body.email === 'string' ? body.email : ''
			const redirectTo = normalizeRedirectPath(
				typeof body.redirectTo === 'string' ? body.redirectTo : null,
			)
			const requestIp = getRequestIp(request) ?? undefined

			try {
				const loginRequest = await createHostLoginRequest(appEnv.APP_DB, {
					email,
				})
				const loginUrl = new URL('/login/verify', url)
				loginUrl.searchParams.set('token', loginRequest.loginToken)
				loginUrl.searchParams.set('redirectTo', redirectTo)

				void logAuditEvent({
					category: 'auth',
					action: 'login_link_requested',
					result: 'success',
					email: loginRequest.email,
					ip: requestIp,
					path: url.pathname,
				})

				return Response.json({
					ok: true,
					email: loginRequest.email,
					expiresAt: loginRequest.expiresAt,
					loginLink: loginUrl.toString(),
				})
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Unable to create sign-in link.'
				void logAuditEvent({
					category: 'auth',
					action: 'login_link_requested',
					result: 'failure',
					email,
					ip: requestIp,
					path: url.pathname,
					reason: message,
				})
				return Response.json({ ok: false, error: message }, { status: 400 })
			}
		},
	} satisfies BuildAction<
		typeof routes.loginRequest.method,
		typeof routes.loginRequest.pattern
	>
}
