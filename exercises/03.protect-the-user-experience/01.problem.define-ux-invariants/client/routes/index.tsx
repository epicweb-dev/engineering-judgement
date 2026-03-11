import { HomeRoute } from './home.tsx'
import { ScheduleRoute } from './schedule.tsx'
import { ScheduleHostRoute } from './schedule-host.tsx'

export const clientRoutes = {
	'/': <HomeRoute />,
	'/s/:shareToken/:hostAccessToken': <ScheduleHostRoute />,
	'/s/:shareToken': <ScheduleRoute />,
}
