import { post, route } from 'remix/fetch-router/routes'

export const routes = route({
	home: '/',
	health: '/health',
	scheduleRespondPage: '/s/:scheduleKey',
	scheduleHostPage: '/s/:scheduleKey/:hostKey',
	apiCreateSchedule: post('/api/schedules'),
	apiSchedule: '/api/schedules/:scheduleKey',
	apiScheduleResponses: post('/api/schedules/:scheduleKey/responses'),
	apiHostSchedule: '/api/schedules/:scheduleKey/:hostKey',
	apiHostScheduleUpdate: post('/api/schedules/:scheduleKey/:hostKey'),
})
