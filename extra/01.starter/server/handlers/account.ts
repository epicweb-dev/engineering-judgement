import { type BuildAction } from '#server/build-action.ts'
import { readAuthSession } from '#server/auth-session.ts'
import { redirectToLogin } from '#server/auth-redirect.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const account = {
	middleware: [],
	async handler({ request }) {
		const session = await readAuthSession(request)

		if (!session) {
			return redirectToLogin(request)
		}

		return render(
			Layout({
				title: 'Account',
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.account.method,
	typeof routes.account.pattern
>
