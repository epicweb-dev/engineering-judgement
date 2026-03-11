import { type ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { type MCP } from '#mcp/index.ts'
import { summarizeShareToken } from './summarize-share-token.ts'

const submitAvailabilityTool = {
	name: 'submit_schedule_availability',
	title: 'Submit Schedule Availability',
	description:
		'Attendee-side action: create or update one attendee availability selection for an existing schedule. Does not edit schedule title or blocked slots.',
	annotations: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
	} satisfies ToolAnnotations,
} as const

export async function registerSubmitScheduleAvailabilityTool(agent: MCP) {
	agent.server.registerTool(
		submitAvailabilityTool.name,
		{
			title: submitAvailabilityTool.title,
			description: submitAvailabilityTool.description,
			inputSchema: {
				shareToken: z.string(),
				attendeeName: z.string(),
				attendeeTimeZone: z
					.string()
					.optional()
					.describe(
						'Optional IANA time zone for this attendee (for example "America/New_York").',
					),
				selectedSlots: z.array(z.string()).default([]),
			},
			outputSchema: {
				ok: z.literal(true),
				shareToken: z.string(),
				attendeeName: z.string(),
				selectedCount: z.number(),
			},
			annotations: submitAvailabilityTool.annotations,
		},
		async ({
			shareToken,
			attendeeName,
			attendeeTimeZone,
			selectedSlots,
		}: {
			shareToken: string
			attendeeName: string
			attendeeTimeZone?: string
			selectedSlots: Array<string>
		}) => {
			const requestSummary = {
				shareToken: summarizeShareToken(shareToken),
				attendeeNameLength: attendeeName.trim().length,
				hasAttendeeTimeZone: Boolean(attendeeTimeZone),
				selectedSlotsCount: selectedSlots.length,
			}
			console.info('submit_schedule_availability tool invoked', requestSummary)

			try {
				const scheduleRoom = agent.getScheduleRoomNamespace()
				const roomId = scheduleRoom.idFromName(shareToken)
				const room = scheduleRoom.get(roomId)
				const response = await room.fetch(
					'https://schedule-room/availability',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							shareToken,
							name: attendeeName,
							attendeeTimeZone: attendeeTimeZone ?? '',
							selectedSlots,
						}),
					},
				)
				if (!response.ok) {
					const payload = (await response.json().catch(() => null)) as {
						error?: string
					} | null
					const errorMessage =
						typeof payload?.error === 'string'
							? payload.error
							: 'Unable to update availability.'
					console.warn(
						'submit_schedule_availability tool returned error response',
						{
							...requestSummary,
							upstreamStatus: response.status,
							returnedMessage: errorMessage,
						},
					)
					return {
						content: [{ type: 'text', text: errorMessage }],
						isError: true,
					}
				}
				console.info('submit_schedule_availability tool succeeded', {
					...requestSummary,
				})

				return {
					content: [
						{
							type: 'text',
							text: `Updated attendee availability for ${attendeeName}. This does not change host schedule settings.`,
						},
					],
					structuredContent: {
						ok: true,
						shareToken,
						attendeeName,
						selectedCount: selectedSlots.length,
					},
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Unable to update availability.'
				console.error('submit_schedule_availability tool threw', {
					...requestSummary,
					returnedMessage: message,
					errorName: error instanceof Error ? error.name : 'UnknownError',
				})
				return {
					content: [{ type: 'text', text: message }],
					isError: true,
				}
			}
		},
	)
}
