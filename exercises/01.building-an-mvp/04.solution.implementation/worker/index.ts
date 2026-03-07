import { MCP } from '#mcp/index.ts'
import { handleRequest } from '#server/handler.ts'

export { MCP }

export default {
	async fetch(request: Request, env: Env) {
		if (env.ASSETS && (request.method === 'GET' || request.method === 'HEAD')) {
			const response = await env.ASSETS.fetch(request)
			if (response.status !== 404) {
				return response
			}
		}

		return handleRequest(request, env)
	},
} satisfies ExportedHandler<Env>
