import { type MCP } from './index.ts'
import { registerCreateScheduleTool } from './tools/create-schedule.ts'
import { registerGetScheduleSnapshotTool } from './tools/get-schedule-snapshot.ts'
import { registerOpenScheduleHostUiTool } from './tools/open-schedule-host-ui.ts'
import { registerOpenScheduleUiTool } from './tools/open-schedule-ui.ts'
import { registerSubmitScheduleAvailabilityTool } from './tools/submit-schedule-availability.ts'
import { registerUpdateScheduleHostSettingsTool } from './tools/update-schedule-host-settings.ts'

export async function registerTools(agent: MCP) {
	await registerCreateScheduleTool(agent)
	await registerSubmitScheduleAvailabilityTool(agent)
	await registerUpdateScheduleHostSettingsTool(agent)
	await registerGetScheduleSnapshotTool(agent)
	await registerOpenScheduleUiTool(agent)
	await registerOpenScheduleHostUiTool(agent)
}
