import { createRouter } from 'remix/fetch-router'
import { type AppEnv } from '#types/env-schema.ts'
import { robotsTxt, sitemapXml } from './handlers/seo-assets.ts'
import { createHealthHandler } from './handlers/health.ts'
import { createScheduleHostReadHandler } from './handlers/schedule-host-read.ts'
import { scheduleHostPage, schedulePage } from './handlers/app-pages.ts'
import { home } from './handlers/home.ts'
import { createScheduleCreateHandler } from './handlers/schedule-create.ts'
import { createScheduleDeleteSubmissionHandler } from './handlers/schedule-delete-submission.ts'
import { createScheduleHostUpdateHandler } from './handlers/schedule-host-update.ts'
import { createScheduleRenameSubmissionHandler } from './handlers/schedule-rename-submission.ts'
import { createScheduleReadHandler } from './handlers/schedule-read.ts'
import { createScheduleSubmitAvailabilityHandler } from './handlers/schedule-submit-availability.ts'
import {
	blogIndex,
	blogPost,
	features,
	howItWorks,
	privacy,
	terms,
} from './handlers/seo-pages.ts'
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
	router.map(routes.schedulePage, schedulePage)
	router.map(routes.scheduleHostPage, scheduleHostPage)
	router.map(routes.howItWorks, howItWorks)
	router.map(routes.features, features)
	router.map(routes.blog, blogIndex)
	router.map(routes.blogPost, blogPost)
	router.map(routes.privacy, privacy)
	router.map(routes.terms, terms)
	router.map(routes.robotsTxt, robotsTxt)
	router.map(routes.sitemapXml, sitemapXml)
	router.map(routes.health, createHealthHandler(appEnv))
	router.map(routes.scheduleCreate, createScheduleCreateHandler(appEnv))
	router.map(routes.scheduleRead, createScheduleReadHandler(appEnv))
	router.map(routes.scheduleHostRead, createScheduleHostReadHandler(appEnv))
	router.map(
		routes.scheduleSubmitAvailability,
		createScheduleSubmitAvailabilityHandler(appEnv),
	)
	router.map(
		routes.scheduleDeleteSubmission,
		createScheduleDeleteSubmissionHandler(appEnv),
	)
	router.map(
		routes.scheduleRenameSubmission,
		createScheduleRenameSubmissionHandler(appEnv),
	)
	router.map(routes.scheduleHostUpdate, createScheduleHostUpdateHandler(appEnv))

	return router
}
