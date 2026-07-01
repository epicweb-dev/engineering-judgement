import { type BuildAction } from '#server/build-action.ts'
import { destroyAuthCookie, readAuthSession } from '#server/auth-session.ts'
import { normalizeRedirectPath } from '#server/auth-redirect.ts'
import { type routes } from '#server/routes.ts'

export const logout = {
	middleware: [],
	async handler({ request, url }) {
		const session = await readAuthSession(request)
		const redirectTo = normalizeRedirectPath(url.searchParams.get('redirectTo'), '/')
		const cookie = await destroyAuthCookie(url.protocol === 'https:')
		return new Response(null, {
			status: 302,
			headers: {
				Location: session ? redirectTo : '/',
				'Set-Cookie': cookie,
			},
		})
	},
} satisfies BuildAction<typeof routes.logout.method, typeof routes.logout.pattern>
