import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
	createScheduleWithUrls,
	readScheduleForAttendee,
	readScheduleForHost,
	saveAttendeeAvailability,
	updateScheduleForHost,
} from '#server/schedule-service.ts'
import {
	generateLocalSlotKeys,
	localSlotKeyToLabel,
	localSlotKeyToUtcIso,
	normalizeIanaTimeZone,
	slotIncrementOptions,
} from '#shared/scheduling-time.ts'

type ToolResult = {
	content: Array<{ type: 'text'; text: string }>
	isError?: boolean
}

function formatJsonResult(value: unknown): ToolResult {
	return {
		content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
	}
}

function formatError(message: string): ToolResult {
	return {
		isError: true,
		content: [{ type: 'text', text: message }],
	}
}

function ensureSlotIncrement(value: number) {
	if (
		!slotIncrementOptions.includes(value as (typeof slotIncrementOptions)[number])
	) {
		throw new Error(
			`slotMinutes must be one of ${slotIncrementOptions.join(', ')}.`,
		)
	}
	return value as (typeof slotIncrementOptions)[number]
}

function registerTools(server: McpServer, env: Env) {
	server.tool(
		'generate_schedule_slots',
		'Generate valid local and UTC slot options for a date range, timezone, and slot increment. Use this before creating or updating a schedule so you can pass valid selectedSlotsUtc values.',
		{
			startDate: z.string().describe('ISO date in YYYY-MM-DD format.'),
			endDate: z.string().describe('ISO date in YYYY-MM-DD format.'),
			slotMinutes: z
				.number()
				.describe('Slot size in minutes. Must be 15, 30, or 60.'),
			timezone: z.string().describe('IANA timezone such as America/Denver.'),
		},
		async ({ startDate, endDate, slotMinutes, timezone }) => {
			try {
				const normalizedTimeZone = normalizeIanaTimeZone(timezone)
				const safeSlotMinutes = ensureSlotIncrement(slotMinutes)
				const localSlots = generateLocalSlotKeys(
					startDate,
					endDate,
					safeSlotMinutes,
				).map((localSlotKey) => ({
					localSlotKey,
					label: localSlotKeyToLabel(localSlotKey),
					utcIso: localSlotKeyToUtcIso(localSlotKey, normalizedTimeZone),
				}))

				return formatJsonResult({
					startDate,
					endDate,
					slotMinutes: safeSlotMinutes,
					timezone: normalizedTimeZone,
					slotCount: localSlots.length,
					slots: localSlots,
				})
			} catch (error) {
				return formatError(
					error instanceof Error
						? error.message
						: 'Unable to generate schedule slots.',
				)
			}
		},
	)

	server.tool(
		'create_schedule',
		'Create a new schedule and return both the attendee URL and the private host URL. selectedSlotsUtc must be canonical UTC ISO timestamps.',
		{
			title: z.string().describe('Human-friendly schedule title.'),
			startDate: z.string().describe('ISO date in YYYY-MM-DD format.'),
			endDate: z.string().describe('ISO date in YYYY-MM-DD format.'),
			slotMinutes: z
				.number()
				.describe('Slot size in minutes. Must be 15, 30, or 60.'),
			timezone: z.string().describe('IANA timezone such as America/Denver.'),
			selectedSlotsUtc: z
				.array(z.string())
				.describe('UTC ISO timestamps selected by the host.'),
		},
		async ({
			title,
			startDate,
			endDate,
			slotMinutes,
			timezone,
			selectedSlotsUtc,
		}) => {
			try {
				const created = await createScheduleWithUrls(env, {
					title,
					startDate,
					endDate,
					slotMinutes: ensureSlotIncrement(slotMinutes),
					timezone: normalizeIanaTimeZone(timezone),
					selectedSlotUtc: selectedSlotsUtc,
				})
				return formatJsonResult(created)
			} catch (error) {
				return formatError(
					error instanceof Error ? error.message : 'Unable to create schedule.',
				)
			}
		},
	)

	server.tool(
		'get_schedule',
		'Read the attendee-facing schedule details and current response counts. Optionally include attendeeName to fetch that attendee’s current saved selection.',
		{
			scheduleKey: z.string().describe('Public schedule key from /s/{scheduleKey}.'),
			attendeeName: z
				.string()
				.optional()
				.describe('Optional attendee name to load their saved selection.'),
		},
		async ({ scheduleKey, attendeeName }) => {
			const result = await readScheduleForAttendee(
				env,
				scheduleKey,
				attendeeName ?? '',
			)
			if (!result) {
				return formatError(`Schedule ${scheduleKey} was not found.`)
			}
			return formatJsonResult(result)
		},
	)

	server.tool(
		'get_host_schedule',
		'Read the private host view, including attendee summary and response counts. Requires both the public schedule key and the private host key.',
		{
			scheduleKey: z.string().describe('Public schedule key.'),
			hostKey: z.string().describe('Private host key.'),
		},
		async ({ scheduleKey, hostKey }) => {
			const result = await readScheduleForHost(env, scheduleKey, hostKey)
			if (!result) {
				return formatError(
					`Host schedule ${scheduleKey} was not found for the provided host key.`,
				)
			}
			return formatJsonResult(result)
		},
	)

	server.tool(
		'update_host_schedule',
		'Update the host-managed schedule details and availability grid. Use generate_schedule_slots first so selectedSlotsUtc values match the configured range and timezone.',
		{
			scheduleKey: z.string().describe('Public schedule key.'),
			hostKey: z.string().describe('Private host key.'),
			title: z.string().describe('Updated schedule title.'),
			startDate: z.string().describe('ISO date in YYYY-MM-DD format.'),
			endDate: z.string().describe('ISO date in YYYY-MM-DD format.'),
			slotMinutes: z
				.number()
				.describe('Slot size in minutes. Must be 15, 30, or 60.'),
			timezone: z.string().describe('IANA timezone such as America/Denver.'),
			selectedSlotsUtc: z
				.array(z.string())
				.describe('Updated host-selected UTC ISO timestamps.'),
		},
		async ({
			scheduleKey,
			hostKey,
			title,
			startDate,
			endDate,
			slotMinutes,
			timezone,
			selectedSlotsUtc,
		}) => {
			try {
				const result = await updateScheduleForHost(env, scheduleKey, hostKey, {
					title,
					startDate,
					endDate,
					slotMinutes: ensureSlotIncrement(slotMinutes),
					timezone: normalizeIanaTimeZone(timezone),
					selectedSlotUtc: selectedSlotsUtc,
				})
				if (!result) {
					return formatError(
						`Host schedule ${scheduleKey} was not found for the provided host key.`,
					)
				}
				return formatJsonResult(result)
			} catch (error) {
				return formatError(
					error instanceof Error
						? error.message
						: 'Unable to update the host schedule.',
				)
			}
		},
	)

	server.tool(
		'save_attendee_availability',
		'Save or replace one attendee’s availability for a public schedule.',
		{
			scheduleKey: z.string().describe('Public schedule key.'),
			attendeeName: z.string().describe('Attendee display name.'),
			selectedSlotsUtc: z
				.array(z.string())
				.describe('UTC ISO timestamps selected by the attendee.'),
		},
		async ({ scheduleKey, attendeeName, selectedSlotsUtc }) => {
			try {
				const result = await saveAttendeeAvailability(
					env,
					scheduleKey,
					attendeeName,
					selectedSlotsUtc,
				)
				if (!result) {
					return formatError(`Schedule ${scheduleKey} was not found.`)
				}
				return formatJsonResult(result)
			} catch (error) {
				return formatError(
					error instanceof Error
						? error.message
						: 'Unable to save attendee availability.',
				)
			}
		},
	)
}

export function createSchedulingMcpServer(env: Env) {
	const server = new McpServer(
		{
			name: 'epic-scheduler-mcp',
			version: '1.0.0',
		},
		{
			instructions: [
				'Use these tools to create, inspect, and update schedules in epic-scheduler.',
				'For create/update flows, generate candidate slots first so you can choose valid UTC slot IDs.',
				'Host operations require the hostKey. Attendee operations only require the public scheduleKey.',
			].join(' '),
		},
	)
	registerTools(server, env)
	return server
}
