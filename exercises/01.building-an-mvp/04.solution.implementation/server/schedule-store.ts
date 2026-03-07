import {
	type ScheduleInput,
	type ScheduleRecord,
	type ScheduleResponseInput,
	type SlotId,
	createRandomKey,
	normalizeName,
	normalizeSlotIds,
	normalizeTitle,
} from '#shared/schedule-model.ts'

type ScheduleRow = {
	schedule_key: string
	host_key: string
	title: string
	start_date: string
	end_date: string
	host_slots_json: string
	responses_json: string
	created_at: string
	updated_at: string
}

type StoredResponse = {
	attendeeName: string
	slots: Array<SlotId>
	updatedAt: string
}

type NormalizedScheduleInput = {
	title: string
	startDate: string
	endDate: string
	hostSlots: Array<SlotId>
}

type NormalizedScheduleResponseInput = {
	attendeeName: string
	slots: Array<SlotId>
}

function parseJsonArray<T>(raw: string, fallback: Array<T>) {
	try {
		const value = JSON.parse(raw)
		return Array.isArray(value) ? (value as Array<T>) : fallback
	} catch {
		return fallback
	}
}

function mapRowToRecord(row: ScheduleRow): ScheduleRecord {
	const hostSlots = parseJsonArray<SlotId>(row.host_slots_json, [])
	const responses = parseJsonArray<StoredResponse>(row.responses_json, [])
	return {
		scheduleKey: row.schedule_key,
		hostKey: row.host_key,
		title: row.title,
		startDate: row.start_date,
		endDate: row.end_date,
		hostSlots,
		responses,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function validateScheduleInput(
	input: ScheduleInput,
): { ok: true; value: NormalizedScheduleInput } | { ok: false; error: string } {
	const title = normalizeTitle(input.title)
	if (!title) return { ok: false, error: 'Title is required.' }

	if (!input.startDate || !input.endDate) {
		return { ok: false, error: 'Start and end dates are required.' }
	}
	if (input.startDate > input.endDate) {
		return { ok: false, error: 'Start date must be on or before end date.' }
	}

	const hostSlots = normalizeSlotIds(input.hostSlots, input.startDate, input.endDate)
	if (hostSlots.length === 0) {
		return {
			ok: false,
			error: 'Select at least one availability slot.',
		}
	}

	return {
		ok: true,
		value: {
			title,
			startDate: input.startDate,
			endDate: input.endDate,
			hostSlots,
		},
	}
}

function validateScheduleResponseInput(
	input: ScheduleResponseInput,
	startDate: string,
	endDate: string,
): { ok: true; value: NormalizedScheduleResponseInput } | { ok: false; error: string } {
	const attendeeName = normalizeName(input.attendeeName)
	if (!attendeeName) {
		return { ok: false, error: 'Attendee name is required.' }
	}
	const slots = normalizeSlotIds(input.slots, startDate, endDate)
	if (slots.length === 0) {
		return { ok: false, error: 'Select at least one available time.' }
	}
	return {
		ok: true,
		value: {
			attendeeName,
			slots,
		},
	}
}

export function createScheduleStore(db: D1Database) {
	return {
		async createSchedule(input: ScheduleInput) {
			const parsed = validateScheduleInput(input)
			if (!parsed.ok) {
				return parsed
			}

			const scheduleKey = createRandomKey('sch')
			const hostKey = createRandomKey('host')
			const nowIso = new Date().toISOString()
			await db
				.prepare(
					`
					INSERT INTO schedules (
						schedule_key,
						host_key,
						title,
						start_date,
						end_date,
						host_slots_json,
						responses_json,
						created_at,
						updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
				)
				.bind(
					scheduleKey,
					hostKey,
					parsed.value.title,
					parsed.value.startDate,
					parsed.value.endDate,
					JSON.stringify(parsed.value.hostSlots),
					JSON.stringify([]),
					nowIso,
					nowIso,
				)
				.run()

			return {
				ok: true as const,
				value: {
					scheduleKey,
					hostKey,
				},
			}
		},

		async getSchedule(scheduleKey: string) {
			const row = await db
				.prepare(
					`
					SELECT
						schedule_key,
						host_key,
						title,
						start_date,
						end_date,
						host_slots_json,
						responses_json,
						created_at,
						updated_at
					FROM schedules
					WHERE schedule_key = ?
					`,
				)
				.bind(scheduleKey)
				.first<ScheduleRow>()

			if (!row) return null
			return mapRowToRecord(row)
		},

		async updateSchedule(
			scheduleKey: string,
			hostKey: string,
			input: ScheduleInput,
		) {
			const parsed = validateScheduleInput(input)
			if (!parsed.ok) return parsed

			const existing = await this.getSchedule(scheduleKey)
			if (!existing || existing.hostKey !== hostKey) {
				return { ok: false as const, error: 'Schedule not found.' }
			}

			const nowIso = new Date().toISOString()
			const nextResponses = existing.responses.map((response) => ({
				...response,
				slots: normalizeSlotIds(
					response.slots,
					parsed.value.startDate,
					parsed.value.endDate,
				),
			}))

			await db
				.prepare(
					`
					UPDATE schedules
					SET
						title = ?,
						start_date = ?,
						end_date = ?,
						host_slots_json = ?,
						responses_json = ?,
						updated_at = ?
					WHERE schedule_key = ? AND host_key = ?
					`,
				)
				.bind(
					parsed.value.title,
					parsed.value.startDate,
					parsed.value.endDate,
					JSON.stringify(parsed.value.hostSlots),
					JSON.stringify(nextResponses),
					nowIso,
					scheduleKey,
					hostKey,
				)
				.run()

			return {
				ok: true as const,
				value: {
					scheduleKey,
					hostKey,
				},
			}
		},

		async upsertResponse(scheduleKey: string, input: ScheduleResponseInput) {
			const existing = await this.getSchedule(scheduleKey)
			if (!existing) {
				return { ok: false as const, error: 'Schedule not found.' }
			}

			const parsed = validateScheduleResponseInput(
				input,
				existing.startDate,
				existing.endDate,
			)
			if (!parsed.ok) return parsed

			const nowIso = new Date().toISOString()
			const nextResponses = existing.responses.filter(
				(response) =>
					response.attendeeName.toLowerCase() !==
					parsed.value.attendeeName.toLowerCase(),
			)
			nextResponses.push({
				attendeeName: parsed.value.attendeeName,
				slots: parsed.value.slots,
				updatedAt: nowIso,
			})

			await db
				.prepare(
					`
					UPDATE schedules
					SET
						responses_json = ?,
						updated_at = ?
					WHERE schedule_key = ?
					`,
				)
				.bind(JSON.stringify(nextResponses), nowIso, scheduleKey)
				.run()

			return {
				ok: true as const,
				value: {
					scheduleKey,
				},
			}
		},
	}
}

