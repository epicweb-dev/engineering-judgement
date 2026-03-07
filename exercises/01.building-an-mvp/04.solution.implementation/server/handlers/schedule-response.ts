import { type BuildAction } from 'remix/fetch-router'
import { type ScheduleResponseInput } from '#shared/schedule-model.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type routes } from '#server/routes.ts'
import { createScheduleStore } from '#server/schedule-store.ts'

function parseResponseInput(value: unknown): ScheduleResponseInput | null {
	if (!value || typeof value !== 'object') return null
	const candidate = value as {
		attendeeName?: unknown
		slots?: unknown
	}
	if (
		typeof candidate.attendeeName !== 'string' ||
		!Array.isArray(candidate.slots) ||
		!candidate.slots.every((entry) => typeof entry === 'string')
	) {
		return null
	}
	return {
		attendeeName: candidate.attendeeName,
		slots: candidate.slots,
	}
}

export function createScheduleResponseHandler(appEnv: AppEnv) {
	const store = createScheduleStore(appEnv.APP_DB)
	return {
		middleware: [],
		async action({ params, request }) {
			const payload = await request.json().catch(() => null)
			const input = parseResponseInput(payload)
			if (!input) {
				return Response.json({ error: 'Invalid request body.' }, { status: 400 })
			}

			const result = await store.upsertResponse(params.scheduleKey, input)
			if (!result.ok) {
				return Response.json({ error: result.error }, { status: 400 })
			}

			return Response.json({ ok: true, scheduleKey: result.value.scheduleKey })
		},
	} satisfies BuildAction<
		typeof routes.scheduleApiResponse.method,
		typeof routes.scheduleApiResponse.pattern
	>
}

