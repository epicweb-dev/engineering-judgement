import { createRouter } from 'remix/fetch-router'
import { type AppEnv } from '#types/env-schema.ts'
import { createHealthHandler } from './handlers/health.ts'
import { home, scheduleHostPage, scheduleRespondPage } from './handlers/schedule-pages.ts'
import {
	createCreateScheduleHandler,
	createReadHostScheduleHandler,
	createReadScheduleHandler,
	createSubmitResponseHandler,
	createUpdateHostScheduleHandler,
} from './handlers/schedules-api.ts'
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

	router.map(routes.home, home)
	router.map(routes.scheduleRespondPage, scheduleRespondPage)
	router.map(routes.scheduleHostPage, scheduleHostPage)
	router.map(routes.health, createHealthHandler(appEnv))
	router.map(routes.apiCreateSchedule, createCreateScheduleHandler(appEnv))
	router.map(routes.apiSchedule, createReadScheduleHandler(appEnv))
	router.map(routes.apiScheduleResponses, createSubmitResponseHandler(appEnv))
	router.map(routes.apiHostSchedule, createReadHostScheduleHandler(appEnv))
	router.map(routes.apiHostScheduleUpdate, createUpdateHostScheduleHandler(appEnv))

	return router
}
