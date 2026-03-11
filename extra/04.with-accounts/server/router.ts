import { createRouter } from 'remix/fetch-router'
import { type AppEnv } from '#types/env-schema.ts'
import { createAccountSchedulesReadHandler } from './handlers/account-schedules-read.ts'
import { robotsTxt, sitemapXml } from './handlers/seo-assets.ts'
import { createHealthHandler } from './handlers/health.ts'
import { createLoginRequestHandler } from './handlers/login-request.ts'
import { createLoginVerifyHandler } from './handlers/login-verify.ts'
import { createScheduleHostReadHandler } from './handlers/schedule-host-read.ts'
import {
	accountSchedulePage,
	accountSchedulesPage,
	loginPage,
	scheduleHostPage,
	schedulePage,
} from './handlers/app-pages.ts'
import { home } from './handlers/home.ts'
import { logout } from './handlers/logout.ts'
import { createScheduleCreateHandler } from './handlers/schedule-create.ts'
import { createScheduleClaimHandler } from './handlers/schedule-claim.ts'
import { createScheduleDeleteSubmissionHandler } from './handlers/schedule-delete-submission.ts'
import { createScheduleHostUpdateHandler } from './handlers/schedule-host-update.ts'
import { createScheduleRenameSubmissionHandler } from './handlers/schedule-rename-submission.ts'
import { createScheduleReadHandler } from './handlers/schedule-read.ts'
import { createScheduleSubmitAvailabilityHandler } from './handlers/schedule-submit-availability.ts'
import { session } from './handlers/session.ts'
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
	router.map(routes.loginPage, loginPage)
	router.map(routes.loginVerify, createLoginVerifyHandler(appEnv))
	router.map(routes.accountSchedulesPage, accountSchedulesPage)
	router.map(routes.accountSchedulePage, accountSchedulePage)
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
	router.map(routes.session, session)
	router.map(routes.loginRequest, createLoginRequestHandler(appEnv))
	router.map(routes.logout, logout)
	router.map(
		routes.accountSchedulesRead,
		createAccountSchedulesReadHandler(appEnv),
	)
	router.map(routes.scheduleCreate, createScheduleCreateHandler(appEnv))
	router.map(routes.scheduleRead, createScheduleReadHandler(appEnv))
	router.map(routes.scheduleHostRead, createScheduleHostReadHandler(appEnv))
	router.map(routes.scheduleClaim, createScheduleClaimHandler(appEnv))
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
