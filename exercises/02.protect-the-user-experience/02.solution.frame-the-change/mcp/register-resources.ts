import { type MCP } from './index.ts'
import { registerScheduleHostAppResource } from './resources/schedule-host-app-resource.ts'
import { registerScheduleAppResource } from './resources/schedule-app-resource.ts'

export async function registerResources(agent: MCP) {
	await registerScheduleAppResource(agent)
	await registerScheduleHostAppResource(agent)
}
