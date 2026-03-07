import { post, route } from 'remix/fetch-router/routes'

export const routes = route({
	scheduleCreatePage: '/',
	scheduleRespondPage: '/s/:scheduleKey',
	scheduleEditPage: '/s/:scheduleKey/:hostKey',
	health: '/health',
	scheduleApiCreate: post('/api/schedules'),
	scheduleApiRead: '/api/schedules/:scheduleKey',
	scheduleApiUpdate: {
		method: 'PUT',
		pattern: '/api/schedules/:scheduleKey/:hostKey',
	},
	scheduleApiResponse: post('/api/schedules/:scheduleKey/responses'),
})
