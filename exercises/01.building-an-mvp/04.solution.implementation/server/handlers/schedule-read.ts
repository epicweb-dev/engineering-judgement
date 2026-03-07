import { type BuildAction } from 'remix/fetch-router'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { createScheduleStore } from '#server/schedule-store.ts'

export function createScheduleReadHandler(appEnv: AppEnv) {
	const store = createScheduleStore(appEnv.APP_DB)
	return {
		middleware: [],
		async action({ params }) {
			const schedule = await store.getSchedule(params.scheduleKey)
			if (!schedule) {
				return Response.json({ error: 'Schedule not found.' }, { status: 404 })
			}

			return Response.json({
				ok: true,
				schedule: {
					scheduleKey: schedule.scheduleKey,
					title: schedule.title,
					startDate: schedule.startDate,
					endDate: schedule.endDate,
					hostSlots: schedule.hostSlots,
					responses: schedule.responses,
					updatedAt: schedule.updatedAt,
				},
			})
		},
	} satisfies BuildAction<
		typeof routes.scheduleApiRead.method,
		typeof routes.scheduleApiRead.pattern
	>
}

