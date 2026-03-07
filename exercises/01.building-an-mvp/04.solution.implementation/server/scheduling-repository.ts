import {
	slotIncrementOptions,
	type SlotIncrement,
} from '#shared/scheduling-time.ts'

type ScheduleRecord = {
	id: number
	schedule_key: string
	host_key: string
	title: string
	start_date: string
	end_date: string
	slot_minutes: number
	timezone: string
	created_at: number
}

type CreateScheduleInput = {
	title: string
	startDate: string
	endDate: string
	slotMinutes: SlotIncrement
	timezone: string
	selectedSlotUtc: ReadonlyArray<string>
}

type UpdateScheduleInput = {
	title: string
	startDate: string
	endDate: string
	slotMinutes: SlotIncrement
	timezone: string
	selectedSlotUtc: ReadonlyArray<string>
}

type AttendeeAvailabilityInput = {
	attendeeName: string
	selectedSlotUtc: ReadonlyArray<string>
}

const isoUtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/

function uniqueSortedUtcSlots(slots: ReadonlyArray<string>) {
	const filtered = slots
		.map((slot) => slot.trim())
		.filter((slot) => isoUtcPattern.test(slot))
	return [...new Set(filtered)].sort((a, b) => a.localeCompare(b))
}

function randomKey(length: number) {
	const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
	const bytes = crypto.getRandomValues(new Uint8Array(length))
	let key = ''
	for (const byte of bytes) {
		key += alphabet[byte % alphabet.length]
	}
	return key
}

function toSchedule(record: ScheduleRecord) {
	return {
		id: record.id,
		scheduleKey: record.schedule_key,
		hostKey: record.host_key,
		title: record.title,
		startDate: record.start_date,
		endDate: record.end_date,
		slotMinutes: Number(record.slot_minutes) as SlotIncrement,
		timezone: record.timezone,
		createdAt: Number(record.created_at),
	}
}

async function getScheduleRecordByScheduleKey(db: D1Database, scheduleKey: string) {
	const record = await db
		.prepare('select * from schedules where schedule_key = ? limit 1')
		.bind(scheduleKey)
		.first<ScheduleRecord>()
	return record ?? null
}

async function getScheduleRecordByHostAccess(
	db: D1Database,
	scheduleKey: string,
	hostKey: string,
) {
	const record = await db
		.prepare(
			'select * from schedules where schedule_key = ? and host_key = ? limit 1',
		)
		.bind(scheduleKey, hostKey)
		.first<ScheduleRecord>()
	return record ?? null
}

async function deleteInvalidAttendeeSlots(
	db: D1Database,
	scheduleId: number,
	allowedSlots: ReadonlyArray<string>,
) {
	if (allowedSlots.length === 0) {
		await db
			.prepare('delete from attendee_availability where schedule_id = ?')
			.bind(scheduleId)
			.run()
		return
	}

	const existingRows = await db
		.prepare(
			'select distinct slot_utc from attendee_availability where schedule_id = ?',
		)
		.bind(scheduleId)
		.all<{ slot_utc: string }>()
	const existingSlots = (existingRows.results ?? []).map((row) => row.slot_utc)
	const allowed = new Set(allowedSlots)
	const invalidSlots = existingSlots.filter((slot) => !allowed.has(slot))

	for (let start = 0; start < invalidSlots.length; start += 200) {
		const chunk = invalidSlots.slice(start, start + 200)
		if (chunk.length === 0) continue
		const placeholders = chunk.map(() => '?').join(', ')
		await db
			.prepare(
				`delete from attendee_availability where schedule_id = ? and slot_utc in (${placeholders})`,
			)
			.bind(scheduleId, ...chunk)
			.run()
	}
}

export async function createSchedule(db: D1Database, input: CreateScheduleInput) {
	const slotMinutes = Number(input.slotMinutes) as SlotIncrement
	if (!slotIncrementOptions.includes(slotMinutes)) {
		throw new Error('Unsupported slot increment.')
	}

	const selectedSlotUtc = uniqueSortedUtcSlots(input.selectedSlotUtc)
	if (selectedSlotUtc.length === 0) {
		throw new Error('Host availability must include at least one time slot.')
	}

	const trimmedTitle = input.title.trim().slice(0, 120)
	const title = trimmedTitle || 'New plan'
	const timezone = input.timezone.trim()
	if (!timezone) {
		throw new Error('Timezone is required.')
	}

	const createdAt = Date.now()
	let scheduleRecord: ScheduleRecord | null = null
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const scheduleKey = randomKey(8)
		const hostKey = randomKey(24)
		try {
			await db
				.prepare(
					`insert into schedules
						(schedule_key, host_key, title, start_date, end_date, slot_minutes, timezone, created_at)
						values (?, ?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					scheduleKey,
					hostKey,
					title,
					input.startDate,
					input.endDate,
					slotMinutes,
					timezone,
					createdAt,
				)
				.run()
		} catch (error) {
			if (
				error instanceof Error &&
				/unique constraint failed: schedules\.(schedule_key|host_key)/i.test(
					error.message,
				)
			) {
				continue
			}
			throw error
		}

		scheduleRecord = await getScheduleRecordByScheduleKey(db, scheduleKey)
		if (scheduleRecord) {
			break
		}
	}

	if (!scheduleRecord) {
		throw new Error('Unable to create schedule keys.')
	}

	await replaceHostAvailability(db, scheduleRecord.id, selectedSlotUtc)
	return toSchedule(scheduleRecord)
}

export async function readScheduleByKey(db: D1Database, scheduleKey: string) {
	const record = await getScheduleRecordByScheduleKey(db, scheduleKey)
	return record ? toSchedule(record) : null
}

export async function readScheduleByHostAccess(
	db: D1Database,
	scheduleKey: string,
	hostKey: string,
) {
	const record = await getScheduleRecordByHostAccess(db, scheduleKey, hostKey)
	return record ? toSchedule(record) : null
}

export async function replaceHostAvailability(
	db: D1Database,
	scheduleId: number,
	nextSlotUtc: ReadonlyArray<string>,
) {
	const selectedSlotUtc = uniqueSortedUtcSlots(nextSlotUtc)
	if (selectedSlotUtc.length === 0) {
		throw new Error('Host availability must include at least one time slot.')
	}

	await db
		.prepare('delete from schedule_slots where schedule_id = ?')
		.bind(scheduleId)
		.run()

	const inserts = selectedSlotUtc.map((slot) =>
		db
			.prepare(
				'insert into schedule_slots (schedule_id, starts_at_utc) values (?, ?)',
			)
			.bind(scheduleId, slot),
	)
	if (inserts.length > 0) {
		await db.batch(inserts)
	}

	await deleteInvalidAttendeeSlots(db, scheduleId, selectedSlotUtc)
}

export async function updateScheduleByHostAccess(
	db: D1Database,
	scheduleKey: string,
	hostKey: string,
	input: UpdateScheduleInput,
) {
	const record = await getScheduleRecordByHostAccess(db, scheduleKey, hostKey)
	if (!record) return null

	const slotMinutes = Number(input.slotMinutes) as SlotIncrement
	if (!slotIncrementOptions.includes(slotMinutes)) {
		throw new Error('Unsupported slot increment.')
	}

	const title = input.title.trim().slice(0, 120) || 'New plan'
	const timezone = input.timezone.trim()
	if (!timezone) {
		throw new Error('Timezone is required.')
	}

	await db
		.prepare(
			`update schedules
				set title = ?, start_date = ?, end_date = ?, slot_minutes = ?, timezone = ?
				where id = ?`,
		)
		.bind(
			title,
			input.startDate,
			input.endDate,
			slotMinutes,
			timezone,
			record.id,
		)
		.run()

	await replaceHostAvailability(db, record.id, input.selectedSlotUtc)
	return readScheduleByHostAccess(db, scheduleKey, hostKey)
}

export async function listScheduleSlotsUtc(db: D1Database, scheduleId: number) {
	const rows = await db
		.prepare(
			'select starts_at_utc from schedule_slots where schedule_id = ? order by starts_at_utc asc',
		)
		.bind(scheduleId)
		.all<{ starts_at_utc: string }>()
	return (rows.results ?? []).map((row) => row.starts_at_utc)
}

export async function listResponseCountsBySlot(db: D1Database, scheduleId: number) {
	const rows = await db
		.prepare(
			`select slot_utc, count(*) as response_count
				from attendee_availability
				where schedule_id = ?
				group by slot_utc`,
		)
		.bind(scheduleId)
		.all<{ slot_utc: string; response_count: number }>()

	const counts = new Map<string, number>()
	for (const row of rows.results ?? []) {
		counts.set(row.slot_utc, Number(row.response_count))
	}
	return counts
}

export async function listAttendeeAvailability(
	db: D1Database,
	scheduleId: number,
	attendeeName: string,
) {
	const attendeeNameKey = attendeeName.trim().toLowerCase()
	if (!attendeeNameKey) return []
	const rows = await db
		.prepare(
			`select slot_utc from attendee_availability
				where schedule_id = ? and attendee_name_key = ?
				order by slot_utc asc`,
		)
		.bind(scheduleId, attendeeNameKey)
		.all<{ slot_utc: string }>()
	return (rows.results ?? []).map((row) => row.slot_utc)
}

export async function upsertAttendeeAvailability(
	db: D1Database,
	scheduleId: number,
	input: AttendeeAvailabilityInput,
) {
	const attendeeName = input.attendeeName.trim().slice(0, 80)
	if (!attendeeName) {
		throw new Error('Attendee name is required.')
	}

	const selectedSlotUtc = uniqueSortedUtcSlots(input.selectedSlotUtc)
	const allowedSlots = new Set(await listScheduleSlotsUtc(db, scheduleId))
	for (const slot of selectedSlotUtc) {
		if (!allowedSlots.has(slot)) {
			throw new Error('One or more selected slots are no longer available.')
		}
	}

	const attendeeNameKey = attendeeName.toLowerCase()
	await db
		.prepare(
			'delete from attendee_availability where schedule_id = ? and attendee_name_key = ?',
		)
		.bind(scheduleId, attendeeNameKey)
		.run()

	if (selectedSlotUtc.length === 0) {
		return { attendeeName, selectedSlotUtc }
	}

	const inserts = selectedSlotUtc.map((slot) =>
		db
			.prepare(
				`insert into attendee_availability
					(schedule_id, attendee_name, attendee_name_key, slot_utc, created_at)
					values (?, ?, ?, ?, ?)`,
			)
			.bind(scheduleId, attendeeName, attendeeNameKey, slot, Date.now()),
	)
	await db.batch(inserts)
	return { attendeeName, selectedSlotUtc }
}

export async function listAttendeeSummary(db: D1Database, scheduleId: number) {
	const rows = await db
		.prepare(
			`select attendee_name, slot_utc
				from attendee_availability
				where schedule_id = ?
				order by attendee_name_key asc, slot_utc asc`,
		)
		.bind(scheduleId)
		.all<{ attendee_name: string; slot_utc: string }>()

	const availabilityByAttendee = new Map<string, Array<string>>()
	for (const row of rows.results ?? []) {
		const slots = availabilityByAttendee.get(row.attendee_name) ?? []
		slots.push(row.slot_utc)
		availabilityByAttendee.set(row.attendee_name, slots)
	}

	return [...availabilityByAttendee.entries()].map(([attendeeName, slots]) => ({
		attendeeName,
		slots,
	}))
}

