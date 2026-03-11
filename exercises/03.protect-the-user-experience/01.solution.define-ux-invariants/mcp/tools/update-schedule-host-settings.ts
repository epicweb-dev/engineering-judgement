import { type ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import {
	getScheduleSnapshot,
	updateScheduleHostSettings,
	verifyScheduleHostAccessToken,
} from '#shared/schedule-store.ts'
import { type MCP } from '#mcp/index.ts'
import { summarizeShareToken } from './summarize-share-token.ts'

const updateScheduleHostSettingsTool = {
	name: 'update_schedule_host_settings',
	title: 'Update Schedule Host Settings',
	description:
		'Host-only schedule management: update schedule title and blocked slots. This edits schedule configuration, not attendee availability selections.',
	annotations: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false,
		openWorldHint: false,
	} satisfies ToolAnnotations,
} as const

function isHostSettingsValidationError(message: string) {
	return /(not found|required|invalid|must|range|interval|too large)/i.test(
		message,
	)
}

export async function registerUpdateScheduleHostSettingsTool(agent: MCP) {
	agent.server.registerTool(
		updateScheduleHostSettingsTool.name,
		{
			title: updateScheduleHostSettingsTool.title,
			description: updateScheduleHostSettingsTool.description,
			inputSchema: {
				shareToken: z.string(),
				hostAccessToken: z
					.string()
					.describe('Host access token required for host settings updates.'),
				title: z
					.string()
					.optional()
					.describe(
						'Optional host-managed schedule title. Leave undefined to keep the existing title.',
					),
				blockedSlots: z
					.array(z.string())
					.optional()
					.describe(
						'Optional full replacement list of host-blocked slot UTC timestamps. Pass [] to clear all blocked slots.',
					),
			},
			outputSchema: {
				ok: z.literal(true),
				shareToken: z.string(),
				title: z.string(),
				blockedSlots: z.array(z.string()),
				blockedCount: z.number(),
			},
			annotations: updateScheduleHostSettingsTool.annotations,
		},
		async ({
			shareToken,
			hostAccessToken,
			title,
			blockedSlots,
		}: {
			shareToken: string
			hostAccessToken: string
			title?: string
			blockedSlots?: Array<string>
		}) => {
			const requestSummary = {
				shareToken: summarizeShareToken(shareToken),
				hasHostAccessToken: hostAccessToken.trim().length > 0,
				hasTitleUpdate: typeof title === 'string',
				hasBlockedSlotsUpdate: Array.isArray(blockedSlots),
				blockedSlotsCount: blockedSlots?.length ?? 0,
			}
			console.info('update_schedule_host_settings tool invoked', requestSummary)
			const appDb = agent.getAppDb()
			const normalizedHostAccessToken = hostAccessToken.trim()

			if (!normalizedHostAccessToken) {
				return {
					content: [{ type: 'text', text: 'Host access token is required.' }],
					isError: true,
				}
			}

			const hostAccessVerification = await verifyScheduleHostAccessToken(
				appDb,
				shareToken,
				normalizedHostAccessToken,
			)
			if (hostAccessVerification === 'not-found') {
				return {
					content: [{ type: 'text', text: 'Schedule not found.' }],
					isError: true,
				}
			}
			if (hostAccessVerification !== 'valid') {
				return {
					content: [{ type: 'text', text: 'Invalid host access token.' }],
					isError: true,
				}
			}

			if (title === undefined && blockedSlots === undefined) {
				const message =
					'Provide at least one host setting to update: title or blockedSlots.'
				return {
					content: [{ type: 'text', text: message }],
					isError: true,
				}
			}

			try {
				await updateScheduleHostSettings(appDb, {
					shareToken,
					title,
					blockedSlots,
				})

				const snapshot = await getScheduleSnapshot(appDb, shareToken)
				if (!snapshot) {
					return {
						content: [{ type: 'text', text: 'Schedule not found.' }],
						isError: true,
					}
				}

				try {
					const scheduleRoom = agent.getScheduleRoomNamespace()
					const roomId = scheduleRoom.idFromName(shareToken)
					const room = scheduleRoom.get(roomId)
					await room.fetch('https://schedule-room/broadcast', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							type: 'schedule-updated',
							shareToken,
							updatedAt: new Date().toISOString(),
						}),
					})
				} catch (error) {
					console.warn('update_schedule_host_settings broadcast failed', {
						...requestSummary,
						errorName: error instanceof Error ? error.name : 'UnknownError',
					})
				}

				console.info('update_schedule_host_settings tool succeeded', {
					...requestSummary,
					blockedCount: snapshot.blockedSlots.length,
				})
				return {
					content: [
						{
							type: 'text',
							text: `Updated host schedule settings for ${shareToken}. This changed schedule configuration (title/blocked slots), not attendee responses.`,
						},
					],
					structuredContent: {
						ok: true,
						shareToken,
						title: snapshot.schedule.title,
						blockedSlots: snapshot.blockedSlots,
						blockedCount: snapshot.blockedSlots.length,
					},
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Unable to update host schedule settings.'
				const safeMessage = isHostSettingsValidationError(message)
					? message
					: 'Unable to update host schedule settings.'
				console.warn('update_schedule_host_settings tool returned error', {
					...requestSummary,
					returnedMessage: safeMessage,
					errorName: error instanceof Error ? error.name : 'UnknownError',
				})
				return {
					content: [{ type: 'text', text: safeMessage }],
					isError: true,
				}
			}
		},
	)
}
