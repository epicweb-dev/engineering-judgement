import {
	RESOURCE_MIME_TYPE,
	registerAppResource,
} from '@modelcontextprotocol/ext-apps/server'
import { createUIResource } from '@mcp-ui/server'
import {
	renderScheduleHostUiEntryPoint,
	scheduleHostUiResourceUri,
} from '#mcp/apps/schedule-host-ui-entry-point.ts'
import { type MCP } from '#mcp/index.ts'

const scheduleHostAppResource = {
	name: 'schedule_host_app_resource',
	title: 'Schedule Host App Resource',
	description:
		'Interactive host dashboard MCP app for managing share links, blocking unavailable slots, and reviewing best overlap windows.',
} as const

export async function registerScheduleHostAppResource(agent: MCP) {
	const baseUrl = agent.requireDomain()
	const resourceDomain = new URL('/styles.css', baseUrl).origin

	registerAppResource(
		agent.server,
		scheduleHostAppResource.name,
		scheduleHostUiResourceUri,
		{
			title: scheduleHostAppResource.title,
			description: scheduleHostAppResource.description,
		},
		async () => {
			const resource = createUIResource({
				uri: scheduleHostUiResourceUri,
				content: {
					type: 'rawHtml',
					htmlString: renderScheduleHostUiEntryPoint(baseUrl),
				},
				encoding: 'text',
				adapters: {
					mcpApps: {
						enabled: true,
					},
				},
			})

			return {
				contents: [
					{
						...resource.resource,
						mimeType: RESOURCE_MIME_TYPE,
						_meta: {
							ui: {
								prefersBorder: false,
								domain: resourceDomain,
								csp: {
									resourceDomains: [resourceDomain],
								},
							},
							'openai/widgetDomain': resourceDomain,
						},
					},
				],
			}
		},
	)
}
