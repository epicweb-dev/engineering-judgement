export const timeSlotOptions = [
	'08:00',
	'09:00',
	'10:00',
	'11:00',
	'12:00',
	'13:00',
	'14:00',
	'15:00',
	'16:00',
	'17:00',
	'18:00',
] as const

export type TimeSlotValue = (typeof timeSlotOptions)[number]

export type SlotId = `${string}|${string}`

export type ScheduleResponse = {
	attendeeName: string
	slots: Array<SlotId>
	updatedAt: string
}

export type ScheduleRecord = {
	scheduleKey: string
	hostKey: string
	title: string
	startDate: string
	endDate: string
	hostSlots: Array<SlotId>
	responses: Array<ScheduleResponse>
	createdAt: string
	updatedAt: string
}

export type ScheduleInput = {
	title: string
	startDate: string
	endDate: string
	hostSlots: Array<string>
}

export type ScheduleResponseInput = {
	attendeeName: string
	slots: Array<string>
}

export function createRandomKey(prefix: string) {
	return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 14)}`
}

export function normalizeTitle(rawTitle: string) {
	return rawTitle.trim().slice(0, 120)
}

export function normalizeName(rawName: string) {
	return rawName.trim().slice(0, 80)
}

export function isIsoDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function compareIsoDates(a: string, b: string) {
	return a.localeCompare(b)
}

export function createDateRange(startDate: string, endDate: string) {
	if (!isIsoDate(startDate) || !isIsoDate(endDate)) return [] as Array<string>
	if (compareIsoDates(startDate, endDate) > 0) return [] as Array<string>

	const dates: Array<string> = []
	const cursor = new Date(`${startDate}T00:00:00.000Z`)
	const end = new Date(`${endDate}T00:00:00.000Z`)

	while (cursor.getTime() <= end.getTime()) {
		dates.push(cursor.toISOString().slice(0, 10))
		cursor.setUTCDate(cursor.getUTCDate() + 1)
	}

	return dates
}

export function createSlotId(date: string, time: string): SlotId {
	return `${date}|${time}`
}

export function getAllowedSlotIds(startDate: string, endDate: string) {
	const allowed = new Set<SlotId>()
	for (const date of createDateRange(startDate, endDate)) {
		for (const time of timeSlotOptions) {
			allowed.add(createSlotId(date, time))
		}
	}
	return allowed
}

export function normalizeSlotIds(
	rawSlotIds: Array<string>,
	startDate: string,
	endDate: string,
) {
	const allowed = getAllowedSlotIds(startDate, endDate)
	const normalized = new Set<SlotId>()

	for (const value of rawSlotIds) {
		if (typeof value !== 'string') continue
		const trimmed = value.trim()
		if (!trimmed.includes('|')) continue
		if (allowed.has(trimmed as SlotId)) {
			normalized.add(trimmed as SlotId)
		}
	}

	return Array.from(normalized).sort()
}

export function formatDisplayDate(isoDate: string) {
	const date = new Date(`${isoDate}T00:00:00.000Z`)
	return new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
	}).format(date)
}

