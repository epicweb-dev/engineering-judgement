import { post, route } from 'remix/fetch-router/routes'

export const routes = route({
	home: '/',
	createEvent: post('/events'),
	eventPage: '/event/:eventId',
	eventData: '/events/:eventId/data',
	submitAvailability: post('/event/:eventId/respond'),
	hostPage: '/host/:eventId',
	hostData: '/host/:eventId/data',
	finalizeEvent: post('/host/:eventId/finalize'),
	chat: '/chat',
	health: '/health',
	login: '/login',
	signup: '/signup',
	account: '/account',
	auth: post('/auth'),
	session: '/session',
	logout: post('/logout'),
	passwordResetRequest: post('/password-reset'),
	passwordResetConfirm: post('/password-reset/confirm'),
})
