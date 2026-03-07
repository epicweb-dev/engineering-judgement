import { type BuildAction } from 'remix/fetch-router'
import { type ScheduleInput } from '#shared/schedule-model.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { createScheduleStore } from '#server/schedule-store.ts'

function parseScheduleInput(value: unknown): ScheduleInput | null {
	if (!value || typeof value !== 'object') return null
	const candidate = value as {
		title?: unknown
		startDate?: unknown
		endDate?: unknown
		hostSlots?: unknown
	}
	if (
		typeof candidate.title !== 'string' ||
		typeof candidate.startDate !== 'string' ||
		typeof candidate.endDate !== 'string' ||
		!Array.isArray(candidate.hostSlots) ||
		!candidate.hostSlots.every((entry) => typeof entry === 'string')
	) {
		return null
	}
	return {
		title: candidate.title,
		startDate: candidate.startDate,
		endDate: candidate.endDate,
		hostSlots: candidate.hostSlots,
	}
}

export function createScheduleCreateHandler(appEnv: AppEnv) {
	const store = createScheduleStore(appEnv.APP_DB)
	return {
		middleware: [],
		async action({ request }) {
			const payload = await request.json().catch(() => null)
			const input = parseScheduleInput(payload)
			if (!input) {
				return Response.json({ error: 'Invalid request body.' }, { status: 400 })
			}

			const created = await store.createSchedule(input)
			if (!created.ok) {
				return Response.json({ error: created.error }, { status: 400 })
			}

			return Response.json({
				ok: true,
				scheduleKey: created.value.scheduleKey,
				hostKey: created.value.hostKey,
			})
		},
	} satisfies BuildAction<
		typeof routes.scheduleApiCreate.method,
		typeof routes.scheduleApiCreate.pattern
	>
}

