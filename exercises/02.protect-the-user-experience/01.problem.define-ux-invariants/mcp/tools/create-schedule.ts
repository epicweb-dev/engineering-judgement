import { type ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import {
	buildSlots,
	createSchedule,
	normalizeTimeZone,
} from '#shared/schedule-store.ts'
import { type MCP } from '#mcp/index.ts'
import { summarizeShareToken } from './summarize-share-token.ts'

const createScheduleTool = {
	name: 'create_schedule',
	title: 'Create Schedule',
	description:
		'Create a new link-based schedule with interval, date range, host name, and initial availability. Returns a generated host access token for host dashboard access.',
	annotations: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
	} satisfies ToolAnnotations,
} as const

const intervalSchema = z.union([z.literal(15), z.literal(30), z.literal(60)])
const disabledDaySchema = z.union([z.string(), z.number().int()])

const weekdayAliases: Record<string, number> = {
	sunday: 0,
	sun: 0,
	monday: 1,
	mon: 1,
	tuesday: 2,
	tue: 2,
	tues: 2,
	wednesday: 3,
	wed: 3,
	thursday: 4,
	thu: 4,
	thurs: 4,
	friday: 5,
	fri: 5,
	saturday: 6,
	sat: 6,
}

const weekdayShortToIndex: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
}

const safeCreateScheduleValidationMessages = new Set([
	'Host name is required.',
	'Interval must be one of 15, 30, or 60 minutes.',
	'rangeEndUtc must be later than rangeStartUtc.',
	'Requested range is too large.',
	'Invalid rangeStartUtc. Expected an ISO date string.',
	'Invalid rangeEndUtc. Expected an ISO date string.',
	'Invalid selectedSlots item. Expected an ISO date string.',
	'Invalid hostTimeZone.',
	'Invalid disabledDays item. Expected weekday names (Sunday-Saturday) or indexes 0-6.',
])

function normalizeDisabledDays(days: Array<string | number>) {
	const normalized = new Set<number>()
	for (const day of days) {
		if (typeof day === 'number') {
			if (Number.isInteger(day) && day >= 0 && day <= 6) {
				normalized.add(day)
				continue
			}
			throw new Error(
				'Invalid disabledDays item. Expected weekday names (Sunday-Saturday) or indexes 0-6.',
			)
		}

		const normalizedDay = day.trim().toLowerCase()
		if (!normalizedDay) {
			throw new Error(
				'Invalid disabledDays item. Expected weekday names (Sunday-Saturday) or indexes 0-6.',
			)
		}
		if (/^\d+$/.test(normalizedDay)) {
			const parsed = Number.parseInt(normalizedDay, 10)
			if (parsed >= 0 && parsed <= 6) {
				normalized.add(parsed)
				continue
			}
		}

		const weekdayIndex = weekdayAliases[normalizedDay]
		if (weekdayIndex !== undefined) {
			normalized.add(weekdayIndex)
			continue
		}
		throw new Error(
			'Invalid disabledDays item. Expected weekday names (Sunday-Saturday) or indexes 0-6.',
		)
	}
	return normalized
}

function toWeekdayIndex(params: {
	slot: string
	hostTimeZone: string | null
	weekdayFormatter: Intl.DateTimeFormat | null
}) {
	if (!params.hostTimeZone) {
		return new Date(params.slot).getUTCDay()
	}
	if (!params.weekdayFormatter) return new Date(params.slot).getUTCDay()
	const shortWeekday = params.weekdayFormatter.format(new Date(params.slot))
	const weekdayIndex = weekdayShortToIndex[shortWeekday]
	if (weekdayIndex === undefined) {
		throw new Error('Unable to create schedule.')
	}
	return weekdayIndex
}

function buildBlockedSlotsFromDisabledDays(params: {
	intervalMinutes: 15 | 30 | 60
	rangeStartUtc: string
	rangeEndUtc: string
	hostTimeZone?: string
	disabledDays: ReadonlySet<number>
}) {
	if (params.disabledDays.size === 0) return []
	const normalizedHostTimeZone = normalizeTimeZone(
		params.hostTimeZone,
		'hostTimeZone',
	)
	const slots = buildSlots({
		rangeStartUtc: params.rangeStartUtc,
		rangeEndUtc: params.rangeEndUtc,
		intervalMinutes: params.intervalMinutes,
	})
	const weekdayFormatter = normalizedHostTimeZone
		? new Intl.DateTimeFormat('en-US', {
				timeZone: normalizedHostTimeZone,
				weekday: 'short',
			})
		: null
	return slots.filter((slot) =>
		params.disabledDays.has(
			toWeekdayIndex({
				slot,
				hostTimeZone: normalizedHostTimeZone,
				weekdayFormatter,
			}),
		),
	)
}

function toSafeCreateScheduleError(error: unknown) {
	const message = error instanceof Error ? error.message : ''
	if (safeCreateScheduleValidationMessages.has(message)) {
		return message
	}

	console.error('create_schedule tool failed:', error)
	return 'Unable to create schedule.'
}

export async function registerCreateScheduleTool(agent: MCP) {
	agent.server.registerTool(
		createScheduleTool.name,
		{
			title: createScheduleTool.title,
			description: createScheduleTool.description,
			inputSchema: {
				title: z.string().default('Scheduling poll'),
				hostName: z.string(),
				hostTimeZone: z
					.string()
					.optional()
					.describe(
						'Optional IANA time zone for the host (for example "America/Los_Angeles").',
					),
				intervalMinutes: intervalSchema.default(30),
				rangeStartUtc: z.string().describe('ISO datetime in UTC.'),
				rangeEndUtc: z.string().describe('ISO datetime in UTC.'),
				selectedSlots: z
					.array(z.string())
					.default([])
					.describe(
						'Optional host-selected availability slots in UTC ISO timestamp format (examples: "2026-03-02T14:00:00.000Z", "2026-03-02T14:30:00.000Z"). Each value should align to the selected interval and fall within the [rangeStartUtc, rangeEndUtc) window.',
					),
				disabledDays: z
					.array(disabledDaySchema)
					.default([])
					.describe(
						'Optional weekdays to block on creation. Accepts weekday names (for example "saturday", "sun", "Monday") or indexes 0-6 where 0=Sunday.',
					),
			},
			outputSchema: {
				shareToken: z.string(),
				hostAccessToken: z.string(),
				schedulePath: z.string(),
				scheduleUrl: z.string(),
				hostPath: z.string(),
				hostUrl: z.string(),
			},
			annotations: createScheduleTool.annotations,
		},
		async ({
			title,
			hostName,
			hostTimeZone,
			intervalMinutes,
			rangeStartUtc,
			rangeEndUtc,
			selectedSlots,
			disabledDays,
		}: {
			title: string
			hostName: string
			hostTimeZone?: string
			intervalMinutes: 15 | 30 | 60
			rangeStartUtc: string
			rangeEndUtc: string
			selectedSlots: Array<string>
			disabledDays: Array<string | number>
		}) => {
			const requestSummary = {
				titleLength: title.trim().length,
				hostNameLength: hostName.trim().length,
				disabledDaysCount: disabledDays.length,
				hasHostTimeZone: Boolean(hostTimeZone),
				intervalMinutes,
				rangeStartUtc,
				rangeEndUtc,
				selectedSlotsCount: selectedSlots.length,
			}
			console.info('create_schedule tool invoked', requestSummary)

			try {
				const normalizedDisabledDays = normalizeDisabledDays(disabledDays)
				const blockedSlots = buildBlockedSlotsFromDisabledDays({
					intervalMinutes,
					rangeStartUtc,
					rangeEndUtc,
					hostTimeZone,
					disabledDays: normalizedDisabledDays,
				})
				const created = await createSchedule(agent.getAppDb(), {
					title,
					hostName,
					hostTimeZone,
					intervalMinutes,
					rangeStartUtc,
					rangeEndUtc,
					selectedSlots,
					blockedSlots,
				})
				const schedulePath = `/s/${created.shareToken}`
				const hostPath = `/s/${created.shareToken}/${created.hostAccessToken}`
				const scheduleUrl = new URL(
					schedulePath,
					agent.requireDomain(),
				).toString()
				const hostUrl = new URL(hostPath, agent.requireDomain()).toString()
				console.info('create_schedule tool succeeded', {
					...requestSummary,
					disabledDaysCount: normalizedDisabledDays.size,
					blockedSlotsCount: blockedSlots.length,
					shareToken: summarizeShareToken(created.shareToken),
				})

				return {
					content: [
						{
							type: 'text',
							text: `Created schedule: ${scheduleUrl}. Host access token: ${created.hostAccessToken}. Host dashboard: ${hostUrl}`,
						},
					],
					structuredContent: {
						shareToken: created.shareToken,
						hostAccessToken: created.hostAccessToken,
						schedulePath,
						scheduleUrl,
						hostPath,
						hostUrl,
					},
				}
			} catch (error) {
				const message = toSafeCreateScheduleError(error)
				console.warn('create_schedule tool returned error', {
					...requestSummary,
					returnedMessage: message,
					isValidationMessage:
						safeCreateScheduleValidationMessages.has(message),
				})
				return {
					content: [{ type: 'text', text: message }],
					isError: true,
				}
			}
		},
	)
}
