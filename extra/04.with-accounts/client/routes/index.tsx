import { AccountSchedulesRoute } from './account-schedules.tsx'
import { HomeRoute } from './home.tsx'
import { LoginRoute } from './login.tsx'
import { ScheduleRoute } from './schedule.tsx'
import { ScheduleHostRoute } from './schedule-host.tsx'

export const clientRoutes = {
	'/': <HomeRoute />,
	'/login': <LoginRoute />,
	'/account/schedules': <AccountSchedulesRoute />,
	'/account/schedules/:shareToken': <ScheduleHostRoute />,
	'/s/:shareToken/:hostAccessToken': <ScheduleHostRoute />,
	'/s/:shareToken': <ScheduleRoute />,
}
