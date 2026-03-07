import { type BuildAction } from 'remix/fetch-router'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const home = {
	middleware: [],
	async action() {
		return render(Layout({ title: 'Epic Scheduler' }))
	},
} satisfies BuildAction<typeof routes.home.method, typeof routes.home.pattern>

export const scheduleRespondPage = {
	middleware: [],
	async action() {
		return render(Layout({ title: 'Respond | Epic Scheduler' }))
	},
} satisfies BuildAction<
	typeof routes.scheduleRespondPage.method,
	typeof routes.scheduleRespondPage.pattern
>

export const scheduleHostPage = {
	middleware: [],
	async action() {
		return render(Layout({ title: 'Host dashboard | Epic Scheduler' }))
	},
} satisfies BuildAction<
	typeof routes.scheduleHostPage.method,
	typeof routes.scheduleHostPage.pattern
>

