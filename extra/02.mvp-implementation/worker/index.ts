import { createSchedulingMcpHandler } from '#mcp/index.ts'
import { handleRequest } from '#server/handler.ts'

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url)
		if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
			return createSchedulingMcpHandler(env)(request, env, ctx)
		}

		if (env.ASSETS && (request.method === 'GET' || request.method === 'HEAD')) {
			const response = await env.ASSETS.fetch(request)
			if (response.status !== 404) {
				return response
			}
		}

		return handleRequest(request, env)
	},
} satisfies ExportedHandler<Env>
