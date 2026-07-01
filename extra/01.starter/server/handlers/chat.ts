import { type BuildAction } from '#server/build-action.ts'
import { readAuthSession } from '#server/auth-session.ts'
import { redirectToLogin } from '#server/auth-redirect.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const chat = {
	middleware: [],
	async handler({ request }) {
		const session = await readAuthSession(request)

		if (!session) {
			return redirectToLogin(request)
		}

		return render(Layout({}))
	},
} satisfies BuildAction<typeof routes.chat.method, typeof routes.chat.pattern>
