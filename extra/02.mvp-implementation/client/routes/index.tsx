import { CreateScheduleRoute } from './create-schedule.tsx'
import { HostScheduleRoute } from './host-schedule.tsx'
import { RespondScheduleRoute } from './respond-schedule.tsx'

export const clientRoutes = {
	'/': <CreateScheduleRoute />,
	'/s/:scheduleKey/:hostKey': <HostScheduleRoute />,
	'/s/:scheduleKey': <RespondScheduleRoute />,
}
