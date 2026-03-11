import { type BuildAction } from 'remix/fetch-router'
import { readAuthSession } from '#server/auth-session.ts'
import {
	claimScheduleOwnership,
	getScheduleSnapshot,
	verifyScheduleHostAccessToken,
} from '#shared/schedule-store.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { getShareToken } from './schedule-handler-utils.ts'

function isClaimValidationError(message: string) {
	return /(not found|required|claimed)/i.test(message)
}

export function createScheduleClaimHandler(appEnv: Pick<AppEnv, 'APP_DB'>) {
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

			const session = await readAuthSession(request)
			if (!session) {
				return Response.json(
					{ ok: false, error: 'Sign in required.' },
					{ status: 401 },
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

			try {
				await claimScheduleOwnership(appEnv.APP_DB, {
					shareToken,
					ownerUserId: session.id,
				})
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to claim schedule.'
				const status = /not found/i.test(message)
					? 404
					: isClaimValidationError(message)
						? 409
						: 500
				if (status === 500) {
					console.error('schedule claim failed:', error)
				}
				return Response.json({ ok: false, error: message }, { status })
			}

			const snapshot = await getScheduleSnapshot(appEnv.APP_DB, shareToken)
			if (!snapshot) {
				return Response.json(
					{ ok: false, error: 'Schedule not found.' },
					{ status: 404 },
				)
			}

			return Response.json({
				ok: true,
				accountPath: `/account/schedules/${encodeURIComponent(shareToken)}`,
				snapshot,
			})
		},
	} satisfies BuildAction<
		typeof routes.scheduleClaim.method,
		typeof routes.scheduleClaim.pattern
	>
}
