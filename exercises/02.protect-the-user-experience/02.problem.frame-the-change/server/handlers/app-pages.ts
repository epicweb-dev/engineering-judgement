import { type BuildAction } from 'remix/fetch-router'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

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
