import { createRouter } from 'remix/fetch-router'
import { type AppEnv } from '#types/env-schema.ts'
import { createHealthHandler } from './handlers/health.ts'
import { createScheduleCreateHandler } from './handlers/schedule-create.ts'
import { createScheduleReadHandler } from './handlers/schedule-read.ts'
import { createScheduleResponseHandler } from './handlers/schedule-response.ts'
import { scheduleShell } from './handlers/schedule-shell.ts'
import { createScheduleUpdateHandler } from './handlers/schedule-update.ts'
import { Layout } from './layout.ts'
import { render } from './render.ts'
import { routes } from './routes.ts'

export function createAppRouter(appEnv: AppEnv) {
	const router = createRouter({
		middleware: [],
		async defaultHandler() {
			return render(Layout({}))
		},
	})

	router.map(routes.scheduleCreatePage, scheduleShell)
	router.map(routes.scheduleRespondPage, scheduleShell)
	router.map(routes.scheduleEditPage, scheduleShell)
	router.map(routes.health, createHealthHandler(appEnv))
	router.map(routes.scheduleApiCreate, createScheduleCreateHandler(appEnv))
	router.map(routes.scheduleApiRead, createScheduleReadHandler(appEnv))
	router.map(routes.scheduleApiUpdate, createScheduleUpdateHandler(appEnv))
	router.map(routes.scheduleApiResponse, createScheduleResponseHandler(appEnv))

	return router
}
