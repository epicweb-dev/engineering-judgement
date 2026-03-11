import { type BuildAction } from 'remix/fetch-router'
import { readAuthSession } from '#server/auth-session.ts'
import { type routes } from '#server/routes.ts'

export const session = {
	middleware: [],
	async action({ request }) {
		const authSession = await readAuthSession(request)
		return Response.json({
			ok: true,
			authenticated: authSession !== null,
			session: authSession,
		})
	},
} satisfies BuildAction<typeof routes.session.method, typeof routes.session.pattern>
