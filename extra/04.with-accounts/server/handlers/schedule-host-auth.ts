import { readAuthSession } from '#server/auth-session.ts'
import {
	verifyScheduleHostAccessToken,
	verifyScheduleOwnerAccess,
} from '#shared/schedule-store.ts'

type D1DatabaseLike = Pick<Env, 'APP_DB'>['APP_DB']

type AuthorizedHostAccess =
	| {
			ok: true
			accessMethod: 'host-link'
			session: null
	  }
	| {
			ok: true
			accessMethod: 'account'
			session: NonNullable<Awaited<ReturnType<typeof readAuthSession>>>
	  }
	| {
			ok: false
			response: Response
	  }

export async function authorizeHostScheduleRequest(params: {
	db: D1DatabaseLike
	request: Request
	shareToken: string
}) {
	const providedHostToken = params.request.headers.get('X-Host-Token')?.trim()
	if (providedHostToken) {
		const hostAccessVerification = await verifyScheduleHostAccessToken(
			params.db,
			params.shareToken,
			providedHostToken,
		)
		if (hostAccessVerification === 'not-found') {
			return {
				ok: false,
				response: Response.json(
					{ ok: false, error: 'Schedule not found.' },
					{ status: 404 },
				),
			} satisfies AuthorizedHostAccess
		}
		if (hostAccessVerification !== 'valid') {
			return {
				ok: false,
				response: Response.json(
					{ ok: false, error: 'Invalid host access token.' },
					{ status: 403 },
				),
			} satisfies AuthorizedHostAccess
		}
		return {
			ok: true,
			accessMethod: 'host-link',
			session: null,
		} satisfies AuthorizedHostAccess
	}

	const session = await readAuthSession(params.request)
	if (!session) {
		return {
			ok: false,
			response: Response.json(
				{ ok: false, error: 'Sign in required.' },
				{ status: 401 },
			),
		} satisfies AuthorizedHostAccess
	}

	const ownerAccess = await verifyScheduleOwnerAccess(
		params.db,
		params.shareToken,
		session.id,
	)
	if (ownerAccess === 'not-found') {
		return {
			ok: false,
			response: Response.json(
				{ ok: false, error: 'Schedule not found.' },
				{ status: 404 },
			),
		} satisfies AuthorizedHostAccess
	}
	if (ownerAccess !== 'valid') {
		return {
			ok: false,
			response: Response.json(
				{ ok: false, error: 'You do not have access to this schedule.' },
				{ status: 403 },
			),
		} satisfies AuthorizedHostAccess
	}

	return {
		ok: true,
		accessMethod: 'account',
		session,
	} satisfies AuthorizedHostAccess
}
