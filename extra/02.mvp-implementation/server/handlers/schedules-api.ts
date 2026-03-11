import { type BuildAction } from 'remix/fetch-router'
import {
	createScheduleWithUrls,
	parseSlotList,
	readScheduleForAttendee,
	readScheduleForHost,
	updateScheduleForHost,
	validateSchedulePayload,
	saveAttendeeAvailability,
} from '#server/schedule-service.ts'
import { type routes } from '#server/routes.ts'
import { type AppEnv } from '#types/env-schema.ts'

export function createCreateScheduleHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request, url }) {
			let body: unknown
			try {
				body = await request.json()
			} catch {
				return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
			}

			const payload = validateSchedulePayload(body)
			if (!payload) {
				return Response.json({ error: 'Invalid schedule payload.' }, { status: 400 })
			}

			try {
				const created = await createScheduleWithUrls(appEnv, payload)
				return Response.json(
					created,
					{
						status: 201,
						headers: {
							Location: new URL(created.hostUrl, url.origin).toString(),
						},
					},
				)
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to create schedule.'
				return Response.json({ error: message }, { status: 400 })
			}
		},
	} satisfies BuildAction<
		typeof routes.apiCreateSchedule.method,
		typeof routes.apiCreateSchedule.pattern
	>
}

export function createReadScheduleHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ params, url }) {
			const result = await readScheduleForAttendee(
				appEnv,
				params.scheduleKey,
				url.searchParams.get('attendeeName')?.trim() ?? '',
			)
			if (!result) {
				return Response.json({ error: 'Schedule not found.' }, { status: 404 })
			}
			return Response.json(result)
		},
	} satisfies BuildAction<
		typeof routes.apiSchedule.method,
		typeof routes.apiSchedule.pattern
	>
}

export function createSubmitResponseHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request, params }) {
			const schedule = await readScheduleForAttendee(appEnv, params.scheduleKey)
			if (!schedule) {
				return Response.json({ error: 'Schedule not found.' }, { status: 404 })
			}

			let body: unknown
			try {
				body = await request.json()
			} catch {
				return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
			}

			if (!body || typeof body !== 'object') {
				return Response.json({ error: 'Invalid payload.' }, { status: 400 })
			}

			const raw = body as Record<string, unknown>
			const attendeeName =
				typeof raw.attendeeName === 'string' ? raw.attendeeName : ''
			const selectedSlotUtc = parseSlotList(raw.selectedSlotsUtc)

			try {
				const result = await saveAttendeeAvailability(
					appEnv,
					params.scheduleKey,
					attendeeName,
					selectedSlotUtc,
				)
				if (!result) {
					return Response.json({ error: 'Schedule not found.' }, { status: 404 })
				}
				return Response.json({ ok: true, attendeeName: result.attendeeName })
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to save response.'
				return Response.json({ error: message }, { status: 400 })
			}
		},
	} satisfies BuildAction<
		typeof routes.apiScheduleResponses.method,
		typeof routes.apiScheduleResponses.pattern
	>
}

export function createReadHostScheduleHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ params }) {
			const result = await readScheduleForHost(
				appEnv,
				params.scheduleKey,
				params.hostKey,
			)
			if (!result) {
				return Response.json({ error: 'Host schedule not found.' }, { status: 404 })
			}
			return Response.json(result)
		},
	} satisfies BuildAction<
		typeof routes.apiHostSchedule.method,
		typeof routes.apiHostSchedule.pattern
	>
}

export function createUpdateHostScheduleHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request, params }) {
			let body: unknown
			try {
				body = await request.json()
			} catch {
				return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
			}

			const payload = validateSchedulePayload(body)
			if (!payload) {
				return Response.json({ error: 'Invalid schedule payload.' }, { status: 400 })
			}

			try {
				const result = await updateScheduleForHost(
					appEnv,
					params.scheduleKey,
					params.hostKey,
					payload,
				)
				if (!result) {
					return Response.json({ error: 'Host schedule not found.' }, { status: 404 })
				}
				return Response.json(result)
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unable to update schedule.'
				return Response.json({ error: message }, { status: 400 })
			}
		},
	} satisfies BuildAction<
		typeof routes.apiHostScheduleUpdate.method,
		typeof routes.apiHostScheduleUpdate.pattern
	>
}

