import { type BuildAction } from '#server/build-action.ts'
import { readAuthSession } from '#server/auth-session.ts'
import { type routes } from '#server/routes.ts'

export const session = {
	middleware: [],
	async handler({ request }) {
		const authSession = await readAuthSession(request)
		return Response.json({
			ok: true,
			authenticated: authSession !== null,
			session: authSession,
		})
	},
} satisfies BuildAction<typeof routes.session.method, typeof routes.session.pattern>
