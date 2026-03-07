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

export function createScheduleUpdateHandler(appEnv: AppEnv) {
	const store = createScheduleStore(appEnv.APP_DB)
	return {
		middleware: [],
		async action({ params, request }) {
			const payload = await request.json().catch(() => null)
			const input = parseScheduleInput(payload)
			if (!input) {
				return Response.json({ error: 'Invalid request body.' }, { status: 400 })
			}

			const updated = await store.updateSchedule(
				params.scheduleKey,
				params.hostKey,
				input,
			)
			if (!updated.ok) {
				return Response.json({ error: updated.error }, { status: 400 })
			}

			return Response.json({
				ok: true,
				scheduleKey: updated.value.scheduleKey,
				hostKey: updated.value.hostKey,
			})
		},
	} satisfies BuildAction<
		typeof routes.scheduleApiUpdate.method,
		typeof routes.scheduleApiUpdate.pattern
	>
}

