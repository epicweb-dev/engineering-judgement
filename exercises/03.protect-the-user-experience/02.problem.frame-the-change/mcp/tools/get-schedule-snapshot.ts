import { type ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { getScheduleSnapshot } from '#shared/schedule-store.ts'
import { type MCP } from '#mcp/index.ts'

const getScheduleSnapshotTool = {
	name: 'get_schedule_snapshot',
	title: 'Get Schedule Snapshot',
	description:
		'Load the current schedule snapshot including attendees, slot counts, and names by slot.',
	annotations: {
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	} satisfies ToolAnnotations,
} as const

export async function registerGetScheduleSnapshotTool(agent: MCP) {
	agent.server.registerTool(
		getScheduleSnapshotTool.name,
		{
			title: getScheduleSnapshotTool.title,
			description: getScheduleSnapshotTool.description,
			inputSchema: {
				shareToken: z.string(),
			},
			outputSchema: {
				ok: z.literal(true),
				snapshot: z.record(z.string(), z.unknown()),
			},
			annotations: getScheduleSnapshotTool.annotations,
		},
		async ({ shareToken }: { shareToken: string }) => {
			try {
				const snapshot = await getScheduleSnapshot(agent.getAppDb(), shareToken)
				if (!snapshot) {
					return {
						content: [{ type: 'text', text: 'Schedule not found.' }],
						isError: true,
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: `Loaded snapshot with ${snapshot.attendees.length} attendee(s).`,
						},
					],
					structuredContent: {
						ok: true,
						snapshot: snapshot as unknown as Record<string, unknown>,
					},
				}
			} catch (error) {
				console.error('get_schedule_snapshot tool failed:', error)
				return {
					content: [
						{ type: 'text', text: 'Unable to load schedule snapshot.' },
					],
					isError: true,
				}
			}
		},
	)
}
