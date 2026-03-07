import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'

export const scheduleShell = {
	middleware: [],
	async action() {
		return render(Layout({ title: 'epic-scheduler' }))
	},
}

