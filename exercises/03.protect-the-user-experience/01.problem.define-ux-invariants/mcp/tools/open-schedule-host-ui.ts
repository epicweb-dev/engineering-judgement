import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import { type ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { scheduleHostUiResourceUri } from '#mcp/apps/schedule-host-ui-entry-point.ts'
import { type MCP } from '#mcp/index.ts'

const openScheduleHostUiTool = {
	name: 'open_schedule_host_ui',
	title: 'Open Schedule Host UI',
	description:
		'Open the Epic Scheduler host dashboard MCP app for managing link settings, blocking unavailable slots, and reviewing overlap. This host UI is distinct from attendee availability submission.',
	annotations: {
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	} satisfies ToolAnnotations,
} as const

export async function registerOpenScheduleHostUiTool(agent: MCP) {
	registerAppTool(
		agent.server,
		openScheduleHostUiTool.name,
		{
			title: openScheduleHostUiTool.title,
			description: openScheduleHostUiTool.description,
			inputSchema: {
				shareToken: z
					.string()
					.optional()
					.describe(
						'Optional existing share token to load into the host dashboard widget.',
					),
				hostAccessToken: z
					.string()
					.optional()
					.describe(
						'Optional host access token paired with shareToken for opening the host dashboard route.',
					),
			},
			outputSchema: {
				widget: z.literal('schedule_host'),
				resourceUri: z.literal(scheduleHostUiResourceUri),
				shareToken: z.string().optional(),
				hostAccessToken: z.string().optional(),
			},
			annotations: openScheduleHostUiTool.annotations,
			_meta: {
				ui: {
					resourceUri: scheduleHostUiResourceUri,
				},
			},
		},
		async ({
			shareToken,
			hostAccessToken,
		}: {
			shareToken?: string
			hostAccessToken?: string
		}) => {
			const normalizedShareToken = shareToken?.trim() || undefined
			const normalizedHostAccessToken = hostAccessToken?.trim() || undefined
			return {
				content: [
					{
						type: 'text',
						text: normalizedShareToken
							? normalizedHostAccessToken
								? `Epic Scheduler host dashboard UI is attached for share token ${normalizedShareToken} with host access token preloaded. Use this for schedule configuration, not attendee availability submission.`
								: `Epic Scheduler host dashboard UI is attached for share token ${normalizedShareToken}. Provide a host access token to load the host dashboard route.`
							: 'Epic Scheduler host dashboard UI is attached. Use this for link management and availability limits, not attendee submission.',
					},
				],
				structuredContent: {
					widget: 'schedule_host',
					resourceUri: scheduleHostUiResourceUri,
					shareToken: normalizedShareToken,
					hostAccessToken: normalizedHostAccessToken,
				},
			}
		},
	)
}
