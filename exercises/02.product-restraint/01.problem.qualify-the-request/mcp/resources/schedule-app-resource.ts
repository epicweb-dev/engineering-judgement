import {
	RESOURCE_MIME_TYPE,
	registerAppResource,
} from '@modelcontextprotocol/ext-apps/server'
import { createUIResource } from '@mcp-ui/server'
import {
	renderScheduleUiEntryPoint,
	scheduleUiResourceUri,
} from '#mcp/apps/schedule-ui-entry-point.ts'
import { type MCP } from '#mcp/index.ts'

const scheduleAppResource = {
	name: 'schedule_app_resource',
	title: 'Schedule App Resource',
	description:
		'Interactive attendee MCP app for selecting availability and viewing overlap on existing links.',
} as const

export async function registerScheduleAppResource(agent: MCP) {
	const baseUrl = agent.requireDomain()
	const resourceDomain = new URL('/styles.css', baseUrl).origin

	registerAppResource(
		agent.server,
		scheduleAppResource.name,
		scheduleUiResourceUri,
		{
			title: scheduleAppResource.title,
			description: scheduleAppResource.description,
		},
		async () => {
			const resource = createUIResource({
				uri: scheduleUiResourceUri,
				content: {
					type: 'rawHtml',
					htmlString: renderScheduleUiEntryPoint(baseUrl),
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
