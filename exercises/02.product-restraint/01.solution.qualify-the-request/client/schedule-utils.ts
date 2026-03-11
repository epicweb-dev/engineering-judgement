import { normalizeName } from '#shared/schedule-store.ts'

export type GridModel = {
	dayKeys: Array<string>
	dayLabels: Record<string, string>
	timeKeys: Array<string>
	timeLabels: Record<string, string>
	cellByDayAndTime: Record<string, Record<string, string>>
}

type SlotLabelStyle = 'long' | 'short'

function pad(value: number) {
	return String(value).padStart(2, '0')
}

function formatDayKey(date: Date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatTimeKey(date: Date) {
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatTimeRowKey(wallTimeKey: string, occurrence: number) {
	if (occurrence <= 1) return wallTimeKey
	return `${wallTimeKey}#${occurrence}`
}

function parseTimeRowKey(timeRowKey: string) {
	const [wallTimeKey = timeRowKey, rawOccurrence] = timeRowKey.split('#')
	const [rawHour, rawMinute] = wallTimeKey.split(':')
	const hour = Number.parseInt(rawHour ?? '', 10)
	const minute = Number.parseInt(rawMinute ?? '', 10)
	const minutesFromMidnight =
		Number.isInteger(hour) &&
		Number.isInteger(minute) &&
		hour >= 0 &&
		hour <= 23 &&
		minute >= 0 &&
		minute <= 59
			? hour * 60 + minute
			: Number.POSITIVE_INFINITY
	const occurrence = Number.parseInt(rawOccurrence ?? '1', 10)
	return {
		wallTimeKey,
		minutesFromMidnight,
		occurrence: Number.isInteger(occurrence) && occurrence > 0 ? occurrence : 1,
	}
}

export function parseDateInputToLocalDate(dateInput: string) {
	const [rawYear, rawMonth, rawDay] = dateInput.split('-')
	if (!rawYear || !rawMonth || !rawDay) return null
	const year = Number.parseInt(rawYear, 10)
	const month = Number.parseInt(rawMonth, 10)
	const day = Number.parseInt(rawDay, 10)
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	)
		return null
	if (month < 1 || month > 12 || day < 1 || day > 31) return null
	const date = new Date(year, month - 1, day, 0, 0, 0, 0)
	if (Number.isNaN(date.getTime())) return null
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null
	}
	return date
}

export function formatDateInputValue(date: Date) {
	return formatDayKey(date)
}

export function addDays(date: Date, days: number) {
	const next = new Date(date.getTime())
	next.setDate(next.getDate() + days)
	return next
}

export function toDayKey(slot: string | null) {
	if (!slot) return null
	const date = new Date(slot)
	if (Number.isNaN(date.getTime())) return null
	return formatDayKey(date)
}

export function createSlotRangeFromDateInputs(params: {
	startDateInput: string
	endDateInput: string
	intervalMinutes: number
}) {
	const startDate = parseDateInputToLocalDate(params.startDateInput)
	const endDate = parseDateInputToLocalDate(params.endDateInput)
	if (!startDate || !endDate) {
		throw new Error('Invalid date range.')
	}

	const interval = params.intervalMinutes
	if (interval !== 15 && interval !== 30 && interval !== 60) {
		throw new Error('Interval must be 15, 30, or 60.')
	}

	const startMs = startDate.getTime()
	const endExclusive = addDays(endDate, 1)
	const endMs = endExclusive.getTime()
	if (endMs <= startMs) {
		throw new Error('End date must be after start date.')
	}

	const intervalMs = interval * 60_000
	const maxSlots = 24 * 31 * 4
	const estimatedSlots = Math.ceil((endMs - startMs) / intervalMs)
	if (estimatedSlots > maxSlots) {
		throw new Error('Requested range is too large.')
	}

	const slots: Array<string> = []
	for (let value = startMs; value < endMs; value += intervalMs) {
		slots.push(new Date(value).toISOString())
	}

	return {
		rangeStartUtc: new Date(startMs).toISOString(),
		rangeEndUtc: new Date(endMs).toISOString(),
		slots,
	}
}

export function buildGridModel(slots: Array<string>): GridModel {
	const dayKeys: Array<string> = []
	const dayLabels: Record<string, string> = {}
	const timeKeys: Array<string> = []
	const timeLabels: Record<string, string> = {}
	const cellByDayAndTime: Record<string, Record<string, string>> = {}
	const timeSeen = new Set<string>()
	const dayWallTimeCounts: Record<string, Record<string, number>> = {}
	const duplicatedWallTimeKeys = new Set<string>()
	const wallTimeOffsetOccurrences = new Map<string, Map<number, number>>()
	const slotEntries: Array<{
		slot: string
		date: Date
		dayKey: string
		wallTimeKey: string
		offsetMinutes: number
	}> = []
	const rowMetadataByTimeKey: Record<
		string,
		{ wallTimeKey: string; sampleDate: Date }
	> = {}
	const dayFormatter = new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	})
	const timeFormatter = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit',
	})
	const duplicatedTimeFormatter = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short',
	})

	for (const slot of slots) {
		const date = new Date(slot)
		if (Number.isNaN(date.getTime())) continue

		const dayKey = formatDayKey(date)
		const wallTimeKey = formatTimeKey(date)
		const dayCounts = (dayWallTimeCounts[dayKey] ??= {})
		const nextOccurrence = (dayCounts[wallTimeKey] ?? 0) + 1
		dayCounts[wallTimeKey] = nextOccurrence
		if (nextOccurrence > 1) {
			duplicatedWallTimeKeys.add(wallTimeKey)
		}
		slotEntries.push({
			slot,
			date,
			dayKey,
			wallTimeKey,
			offsetMinutes: date.getTimezoneOffset(),
		})
	}

	for (const entry of slotEntries) {
		const { slot, date, dayKey, wallTimeKey, offsetMinutes } = entry
		let occurrence = 1
		if (duplicatedWallTimeKeys.has(wallTimeKey)) {
			let offsetOccurrences = wallTimeOffsetOccurrences.get(wallTimeKey)
			if (!offsetOccurrences) {
				offsetOccurrences = new Map()
				wallTimeOffsetOccurrences.set(wallTimeKey, offsetOccurrences)
			}
			const existingOccurrence = offsetOccurrences.get(offsetMinutes)
			if (existingOccurrence === undefined) {
				occurrence = offsetOccurrences.size + 1
				offsetOccurrences.set(offsetMinutes, occurrence)
			} else {
				occurrence = existingOccurrence
			}
		}
		const timeKey = formatTimeRowKey(wallTimeKey, occurrence)
		if (!cellByDayAndTime[dayKey]) {
			cellByDayAndTime[dayKey] = {}
			dayKeys.push(dayKey)
			dayLabels[dayKey] = dayFormatter.format(date)
		}

		if (!timeSeen.has(timeKey)) {
			timeSeen.add(timeKey)
			timeKeys.push(timeKey)
			rowMetadataByTimeKey[timeKey] = { wallTimeKey, sampleDate: date }
		}

		cellByDayAndTime[dayKey]![timeKey] = slot
	}

	for (const timeKey of timeKeys) {
		const metadata = rowMetadataByTimeKey[timeKey]
		if (!metadata) continue
		timeLabels[timeKey] = duplicatedWallTimeKeys.has(metadata.wallTimeKey)
			? duplicatedTimeFormatter.format(metadata.sampleDate)
			: timeFormatter.format(metadata.sampleDate)
	}
	timeKeys.sort((left, right) => {
		const leftParts = parseTimeRowKey(left)
		const rightParts = parseTimeRowKey(right)
		if (leftParts.minutesFromMidnight !== rightParts.minutesFromMidnight) {
			return leftParts.minutesFromMidnight - rightParts.minutesFromMidnight
		}
		return leftParts.occurrence - rightParts.occurrence
	})
	dayKeys.sort((left, right) => left.localeCompare(right))

	return {
		dayKeys,
		dayLabels,
		timeKeys,
		timeLabels,
		cellByDayAndTime,
	}
}

export function getRectangularSlotSelection(params: {
	slots: Array<string>
	startSlot: string
	endSlot: string
}) {
	const grid = buildGridModel(params.slots)
	const slotCoordinates = new Map<
		string,
		{ dayIndex: number; timeIndex: number }
	>()

	for (const [dayIndex, dayKey] of grid.dayKeys.entries()) {
		const dayCells = grid.cellByDayAndTime[dayKey]
		if (!dayCells) continue
		for (const [timeIndex, timeKey] of grid.timeKeys.entries()) {
			const slot = dayCells[timeKey]
			if (!slot) continue
			slotCoordinates.set(slot, { dayIndex, timeIndex })
		}
	}

	const startCoordinate = slotCoordinates.get(params.startSlot)
	const endCoordinate = slotCoordinates.get(params.endSlot)
	if (!startCoordinate || !endCoordinate) return []

	const minDay = Math.min(startCoordinate.dayIndex, endCoordinate.dayIndex)
	const maxDay = Math.max(startCoordinate.dayIndex, endCoordinate.dayIndex)
	const minTime = Math.min(startCoordinate.timeIndex, endCoordinate.timeIndex)
	const maxTime = Math.max(startCoordinate.timeIndex, endCoordinate.timeIndex)
	const selection: Array<string> = []

	for (let dayIndex = minDay; dayIndex <= maxDay; dayIndex += 1) {
		const dayKey = grid.dayKeys[dayIndex]
		if (!dayKey) continue
		const dayCells = grid.cellByDayAndTime[dayKey]
		if (!dayCells) continue
		for (let timeIndex = minTime; timeIndex <= maxTime; timeIndex += 1) {
			const timeKey = grid.timeKeys[timeIndex]
			if (!timeKey) continue
			const slot = dayCells[timeKey]
			if (!slot) continue
			selection.push(slot)
		}
	}

	return selection
}

const attendeeLocalTimeFormatters = new Map<string, Intl.DateTimeFormat>()
const slotLabelFormatters: Record<SlotLabelStyle, Intl.DateTimeFormat> = {
	short: new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}),
	long: new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}),
}

export function formatSlotLabel(slot: string, style: SlotLabelStyle = 'short') {
	const slotDate = new Date(slot)
	if (Number.isNaN(slotDate.getTime())) return slot
	return slotLabelFormatters[style].format(slotDate)
}
const attendeeRangeTimeFormatters = new Map<
	string,
	{
		dayKeyFormatter: Intl.DateTimeFormat
		timeFormatter: Intl.DateTimeFormat
		dayTimeFormatter: Intl.DateTimeFormat
		zoneFormatter: Intl.DateTimeFormat
	}
>()

export function formatSlotForAttendeeTimeZone(
	slot: string,
	timeZone: string | null,
) {
	if (!timeZone) {
		return {
			localTime: 'Local time unknown',
			timeZoneLabel: 'timezone unknown',
		}
	}
	const slotDate = new Date(slot)
	if (Number.isNaN(slotDate.getTime())) {
		return { localTime: 'Local time unknown', timeZoneLabel: timeZone }
	}
	try {
		let formatter = attendeeLocalTimeFormatters.get(timeZone)
		if (!formatter) {
			formatter = new Intl.DateTimeFormat(undefined, {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				timeZone,
			})
			attendeeLocalTimeFormatters.set(timeZone, formatter)
		}
		return {
			localTime: formatter.format(slotDate),
			timeZoneLabel: timeZone,
		}
	} catch {
		return { localTime: 'Local time unknown', timeZoneLabel: timeZone }
	}
}

function getAttendeeRangeTimeFormatters(timeZone: string) {
	let formatters = attendeeRangeTimeFormatters.get(timeZone)
	if (formatters) return formatters
	formatters = {
		dayKeyFormatter: new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}),
		timeFormatter: new Intl.DateTimeFormat(undefined, {
			timeZone,
			hour: 'numeric',
			minute: '2-digit',
		}),
		dayTimeFormatter: new Intl.DateTimeFormat(undefined, {
			timeZone,
			weekday: 'short',
			hour: 'numeric',
			minute: '2-digit',
		}),
		zoneFormatter: new Intl.DateTimeFormat(undefined, {
			timeZone,
			timeZoneName: 'short',
			hour: 'numeric',
			minute: '2-digit',
		}),
	}
	attendeeRangeTimeFormatters.set(timeZone, formatters)
	return formatters
}

export function formatSlotRangeForAttendeeTimeZone(params: {
	rangeStartSlot: string
	rangeEndSlotExclusive: string
	timeZone: string | null
}) {
	if (!params.timeZone) {
		return {
			localRange: 'Local time unknown',
			timeZoneLabel: 'timezone unknown',
		}
	}
	const rangeStartDate = new Date(params.rangeStartSlot)
	const rangeEndDate = new Date(params.rangeEndSlotExclusive)
	if (
		Number.isNaN(rangeStartDate.getTime()) ||
		Number.isNaN(rangeEndDate.getTime())
	) {
		return {
			localRange: 'Local time unknown',
			timeZoneLabel: params.timeZone,
		}
	}
	try {
		const formatters = getAttendeeRangeTimeFormatters(params.timeZone)
		const startTime = formatters.timeFormatter.format(rangeStartDate)
		const endTime = formatters.timeFormatter.format(rangeEndDate)
		const sameDay =
			formatters.dayKeyFormatter.format(rangeStartDate) ===
			formatters.dayKeyFormatter.format(rangeEndDate)
		const startZonePart = formatters.zoneFormatter
			.formatToParts(rangeStartDate)
			.find((part) => part.type === 'timeZoneName')
		const timeZoneLabel = startZonePart?.value ?? params.timeZone
		return {
			localRange: sameDay
				? `${startTime}-${endTime}`
				: `${formatters.dayTimeFormatter.format(rangeStartDate)}-${formatters.dayTimeFormatter.format(rangeEndDate)}`,
			timeZoneLabel,
		}
	} catch {
		return {
			localRange: 'Local time unknown',
			timeZoneLabel: params.timeZone,
		}
	}
}

export function findSelectionForAttendee(params: {
	attendeeName: string
	attendees: Array<{ id: string; name: string }>
	availabilityByAttendee: Record<string, Array<string>>
}) {
	const target = normalizeName(params.attendeeName).toLowerCase()
	if (!target) return []
	const match = params.attendees.find(
		(attendee) => normalizeName(attendee.name).toLowerCase() === target,
	)
	if (!match) return []
	return params.availabilityByAttendee[match.id] ?? []
}
