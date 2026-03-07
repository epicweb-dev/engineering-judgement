import {
	type ScheduleRecord,
	type SlotId,
} from '#shared/schedule-model.ts'

type ScheduleSummary = Pick<
	ScheduleRecord,
	| 'scheduleKey'
	| 'title'
	| 'startDate'
	| 'endDate'
	| 'hostSlots'
	| 'responses'
	| 'updatedAt'
>

type ScheduleReadPayload = {
	ok: true
	schedule: ScheduleSummary
}

type CreateScheduleInput = {
	title: string
	startDate: string
	endDate: string
	hostSlots: Array<SlotId>
}

type CreateSchedulePayload = {
	ok: true
	scheduleKey: string
	hostKey: string
}

type UpdateScheduleInput = CreateScheduleInput
type UpdateSchedulePayload = {
	ok: true
	scheduleKey: string
	hostKey: string
}

type SubmitResponseInput = {
	attendeeName: string
	slots: Array<SlotId>
}

function getErrorMessage(payload: unknown, fallback: string) {
	if (payload && typeof payload === 'object' && 'error' in payload) {
		const value = (payload as { error?: unknown }).error
		if (typeof value === 'string' && value.length > 0) return value
	}
	return fallback
}

async function parseJson(response: Response) {
	return response.json().catch(() => null)
}

export async function fetchSchedule(scheduleKey: string, signal?: AbortSignal) {
	const response = await fetch(`/api/schedules/${encodeURIComponent(scheduleKey)}`, {
		signal,
	})
	const payload = (await parseJson(response)) as ScheduleReadPayload | unknown
	if (!response.ok) {
		throw new Error(getErrorMessage(payload, 'Unable to load schedule.'))
	}
	return (payload as ScheduleReadPayload).schedule
}

export async function createSchedule(input: CreateScheduleInput) {
	const response = await fetch('/api/schedules', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	const payload = (await parseJson(response)) as CreateSchedulePayload | unknown
	if (!response.ok) {
		throw new Error(getErrorMessage(payload, 'Unable to create schedule.'))
	}
	return payload as CreateSchedulePayload
}

export async function updateSchedule(
	scheduleKey: string,
	hostKey: string,
	input: UpdateScheduleInput,
) {
	const response = await fetch(
		`/api/schedules/${encodeURIComponent(scheduleKey)}/${encodeURIComponent(hostKey)}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input),
		},
	)
	const payload = (await parseJson(response)) as UpdateSchedulePayload | unknown
	if (!response.ok) {
		throw new Error(getErrorMessage(payload, 'Unable to update schedule.'))
	}
	return payload as UpdateSchedulePayload
}

export async function submitScheduleResponse(
	scheduleKey: string,
	input: SubmitResponseInput,
) {
	const response = await fetch(
		`/api/schedules/${encodeURIComponent(scheduleKey)}/responses`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input),
		},
	)
	const payload = await parseJson(response)
	if (!response.ok) {
		throw new Error(getErrorMessage(payload, 'Unable to submit availability.'))
	}
}

