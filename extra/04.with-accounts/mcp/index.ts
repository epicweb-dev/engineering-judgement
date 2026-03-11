import { invariant } from '@epic-web/invariant'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { registerResources } from './register-resources.ts'
import { registerTools } from './register-tools.ts'

export type State = {}
export type Props = {
	baseUrl: string
}

const serverMetadata = {
	implementation: {
		name: 'epic-scheduler-mcp',
		version: '1.0.0',
	},
	instructions: `
Quick start
- Use 'create_schedule' to create a new scheduling link, return a generated host access token, and optionally disable weekdays on creation.
- Use 'submit_schedule_availability' to save attendee selections (attendee-side only).
- Use 'update_schedule_host_settings' to edit host-managed schedule configuration (title and blocked slots) with the host access token.
- Use 'get_schedule_snapshot' to inspect overlap and attendee participation.
- Use 'open_schedule_ui' (optionally with shareToken/attendeeName) to open the attendee MCP app widget for selecting availability and viewing overlap.
- Use 'open_schedule_host_ui' (optionally with shareToken/hostAccessToken) to open the host MCP app widget for managing schedule settings and blocked slots.

How to chain tools safely
- Attendee workflow: create_schedule -> submit_schedule_availability -> get_schedule_snapshot (or open_schedule_ui).
- Host workflow: create_schedule (read hostAccessToken) -> update_schedule_host_settings (shareToken + hostAccessToken) -> get_schedule_snapshot (or open_schedule_host_ui with shareToken + hostAccessToken).
	`.trim(),
} as const

export class MCP extends McpAgent<Env, State, Props> {
	server = new McpServer(serverMetadata.implementation, {
		instructions: serverMetadata.instructions,
	})
	async init() {
		await registerResources(this)
		await registerTools(this)
	}
	requireDomain() {
		const baseUrl = this.props?.baseUrl
		invariant(
			baseUrl,
			'This should never happen, but somehow we did not get the baseUrl from the request handler',
		)
		return baseUrl
	}

	getAppDb() {
		return this.env.APP_DB
	}

	getScheduleRoomNamespace() {
		return this.env.SCHEDULE_ROOM
	}
}
