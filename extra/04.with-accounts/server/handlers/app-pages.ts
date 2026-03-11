import { type BuildAction } from 'remix/fetch-router'
import { readAuthSession } from '#server/auth-session.ts'
import { redirectToLogin } from '#server/auth-redirect.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const loginPage = {
	middleware: [],
	async action({ request }) {
		const session = await readAuthSession(request)
		if (session) {
			return Response.redirect(new URL('/account/schedules', request.url), 302)
		}
		return render(
			Layout({
				title: 'Host login | Epic Scheduler',
				description:
					'Use a one-time sign-in link to get back to the schedules you have claimed.',
			}),
		)
	},
} satisfies BuildAction<typeof routes.loginPage.method, typeof routes.loginPage.pattern>

export const accountSchedulesPage = {
	middleware: [],
	async action({ request }) {
		const session = await readAuthSession(request)
		if (!session) {
			return redirectToLogin(request)
		}
		return render(
			Layout({
				title: 'Your schedules | Epic Scheduler',
				description:
					'Open the schedules you have claimed without hunting for a saved host link.',
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.accountSchedulesPage.method,
	typeof routes.accountSchedulesPage.pattern
>

export const accountSchedulePage = {
	middleware: [],
	async action({ request }) {
		const session = await readAuthSession(request)
		if (!session) {
			return redirectToLogin(request)
		}
		return render(
			Layout({
				title: 'Saved host dashboard | Epic Scheduler',
				description:
					'Manage a claimed schedule from your account while preserving host-link fallback access.',
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.accountSchedulePage.method,
	typeof routes.accountSchedulePage.pattern
>

export const schedulePage = {
	middleware: [],
	async action() {
		return render(
			Layout({
				title: 'Schedule availability | Epic Scheduler',
				description:
					'Submit your availability for this shared schedule and review overlap in your local timezone.',
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.schedulePage.method,
	typeof routes.schedulePage.pattern
>

export const scheduleHostPage = {
	middleware: [],
	async action() {
		return render(
			Layout({
				title: 'Host dashboard | Epic Scheduler',
				description:
					'Manage host settings, blocked slots, and attendee overlap for this shared schedule.',
			}),
		)
	},
} satisfies BuildAction<
	typeof routes.scheduleHostPage.method,
	typeof routes.scheduleHostPage.pattern
>
