import { handleRequest } from '#server/handler.ts'
import { withCors } from './utils.ts'

const appHandler = withCors({
	getCorsHeaders(request) {
		const origin = request.headers.get('Origin')
		if (!origin) return null
		const requestOrigin = new URL(request.url).origin
		if (origin !== requestOrigin) return null
		return {
			'Access-Control-Allow-Origin': origin,
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'content-type, authorization',
			Vary: 'Origin',
		}
	},
	async handler(request, env, _ctx) {
		const url = new URL(request.url)

		if (url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
			return new Response(null, { status: 204 })
		}

		// Try to serve static assets for safe methods only
		if (env.ASSETS && (request.method === 'GET' || request.method === 'HEAD')) {
			const response = await env.ASSETS.fetch(request)
			if (response.ok) {
				return response
			}
		}

		return handleRequest(request, env)
	},
})

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return appHandler(request, env, ctx)
	},
} satisfies ExportedHandler<Env>
