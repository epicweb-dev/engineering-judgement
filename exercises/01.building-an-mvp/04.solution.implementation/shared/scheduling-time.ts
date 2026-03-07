export const slotIncrementOptions = [15, 30, 60] as const

export type SlotIncrement = (typeof slotIncrementOptions)[number]

type DateParts = {
	year: number
	month: number
	day: number
	hour: number
	minute: number
	second: number
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(
	timeZone: string,
	options: Intl.DateTimeFormatOptions,
	locale = 'en-US',
) {
	const cacheKey = JSON.stringify([locale, timeZone, options])
	const existing = dateFormatterCache.get(cacheKey)
	if (existing) return existing
	const formatter = new Intl.DateTimeFormat(locale, {
		...options,
		timeZone,
	})
	dateFormatterCache.set(cacheKey, formatter)
	return formatter
}

function parseIsoDate(date: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
	if (!match) return null
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		return null
	}
	if (month < 1 || month > 12 || day < 1 || day > 31) return null
	return { year, month, day }
}

function parseLocalSlotKey(localSlotKey: string) {
	const match =
		/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localSlotKey.trim())
	if (!match) return null
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	const hour = Number(match[4])
	const minute = Number(match[5])
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day) ||
		!Number.isInteger(hour) ||
		!Number.isInteger(minute)
	) {
		return null
	}
	if (month < 1 || month > 12 || day < 1 || day > 31) return null
	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
	return { year, month, day, hour, minute }
}

function pad(numberValue: number) {
	return String(numberValue).padStart(2, '0')
}

function extractDateParts(date: Date, timeZone: string): DateParts {
	const formatter = getFormatter(
		timeZone,
		{
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		},
		'en-CA',
	)

	const parts = formatter.formatToParts(date)
	const lookup = new Map(parts.map((part) => [part.type, part.value]))
	const year = Number(lookup.get('year'))
	const month = Number(lookup.get('month'))
	const day = Number(lookup.get('day'))
	const hour = Number(lookup.get('hour'))
	const minute = Number(lookup.get('minute'))
	const second = Number(lookup.get('second'))

	return { year, month, day, hour, minute, second }
}

export function formatUtcInTimeZone(
	utcIso: string,
	timeZone: string,
	options: Intl.DateTimeFormatOptions,
	locale = 'en-US',
) {
	const formatter = getFormatter(timeZone, options, locale)
	return formatter.format(new Date(utcIso))
}

export function generateLocalSlotKeys(
	startDate: string,
	endDate: string,
	slotMinutes: SlotIncrement,
) {
	const start = parseIsoDate(startDate)
	const end = parseIsoDate(endDate)
	if (!start || !end) return []
	if (!slotIncrementOptions.includes(slotMinutes)) return []

	const startMs = Date.UTC(start.year, start.month - 1, start.day)
	const endMs = Date.UTC(end.year, end.month - 1, end.day)
	if (endMs < startMs) return []

	const slots: Array<string> = []
	for (let dayMs = startMs; dayMs <= endMs; dayMs += 24 * 60 * 60 * 1000) {
		const current = new Date(dayMs)
		const yyyy = current.getUTCFullYear()
		const mm = pad(current.getUTCMonth() + 1)
		const dd = pad(current.getUTCDate())
		for (let minuteOfDay = 0; minuteOfDay < 24 * 60; minuteOfDay += slotMinutes) {
			const hour = Math.floor(minuteOfDay / 60)
			const minute = minuteOfDay % 60
			slots.push(`${yyyy}-${mm}-${dd}T${pad(hour)}:${pad(minute)}`)
		}
	}

	return slots
}

/**
 * Converts a local wall-clock slot key (`YYYY-MM-DDTHH:mm`) in a given IANA
 * timezone into a canonical UTC ISO string.
 */
export function localSlotKeyToUtcIso(localSlotKey: string, timeZone: string) {
	const parsed = parseLocalSlotKey(localSlotKey)
	if (!parsed) {
		throw new Error('Invalid local slot key.')
	}

	let utcMs = Date.UTC(
		parsed.year,
		parsed.month - 1,
		parsed.day,
		parsed.hour,
		parsed.minute,
		0,
	)
	const desiredMs = utcMs

	// Iteratively align the guessed instant to the desired local wall-clock time.
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const zoned = extractDateParts(new Date(utcMs), timeZone)
		const zonedAsUtcMs = Date.UTC(
			zoned.year,
			zoned.month - 1,
			zoned.day,
			zoned.hour,
			zoned.minute,
			0,
		)
		const offsetMs = desiredMs - zonedAsUtcMs
		if (offsetMs === 0) {
			return new Date(utcMs).toISOString()
		}
		utcMs += offsetMs
	}

	return new Date(utcMs).toISOString()
}

export function utcIsoToLocalSlotKey(utcIso: string, timeZone: string) {
	const parts = extractDateParts(new Date(utcIso), timeZone)
	return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

export function localSlotKeyToLabel(localSlotKey: string) {
	const parsed = parseLocalSlotKey(localSlotKey)
	if (!parsed) return localSlotKey
	const pseudoUtc = new Date(
		Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute),
	)
	return new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hourCycle: 'h23',
		timeZone: 'UTC',
	}).format(pseudoUtc)
}

export function normalizeIanaTimeZone(timeZone: string) {
	const trimmed = timeZone.trim()
	if (!trimmed) return 'UTC'
	try {
		return Intl.DateTimeFormat('en-US', { timeZone: trimmed }).resolvedOptions()
			.timeZone
	} catch {
		return 'UTC'
	}
}

