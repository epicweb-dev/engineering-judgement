import { ScheduleRoute } from './schedule.tsx'

export const clientRoutes = {
	'/': <ScheduleRoute />,
	'/s/:scheduleKey': <ScheduleRoute />,
	'/s/:scheduleKey/:hostKey': <ScheduleRoute />,
}
