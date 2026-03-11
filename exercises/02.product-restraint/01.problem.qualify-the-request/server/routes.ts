import { post, route } from 'remix/fetch-router/routes'

export const routes = route({
	home: '/',
	schedulePage: '/s/:shareToken',
	scheduleHostPage: '/s/:shareToken/:hostAccessToken',
	howItWorks: '/how-it-works',
	features: '/meeting-scheduler-features',
	blog: '/blog',
	blogPost: '/blog/:slug',
	privacy: '/privacy',
	terms: '/terms',
	robotsTxt: '/robots.txt',
	sitemapXml: '/sitemap.xml',
	health: '/health',
	scheduleCreate: post('/api/schedules'),
	scheduleRead: '/api/schedules/:shareToken',
	scheduleHostRead: '/api/schedules/:shareToken/host-snapshot',
	scheduleSubmitAvailability: post('/api/schedules/:shareToken/availability'),
	scheduleDeleteSubmission: post(
		'/api/schedules/:shareToken/submission-delete',
	),
	scheduleRenameSubmission: post(
		'/api/schedules/:shareToken/submission-rename',
	),
	scheduleHostUpdate: post('/api/schedules/:shareToken/host'),
})
