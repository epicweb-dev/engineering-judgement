import { MCP } from '#mcp/index.ts'
import { handleRequest } from '#server/handler.ts'
import { withCors } from './utils.ts'

export { MCP }
export { ScheduleRoom } from './schedule-room.ts'

const mcpResourcePath = '/mcp'
const scheduleSocketPathPrefix = '/ws/'
const mcpWriteToolNames = new Set([
	'create_schedule',
	'submit_schedule_availability',
	'update_schedule_host_settings',
])
const openAiSandboxOriginSuffix = '.web-sandbox.oaiusercontent.com'

type McpRpcSummarySource =
	| 'none'
	| 'header'
	| 'header-decode-error'
	| 'header-parse-error'
	| 'body'
	| 'body-read-error'
	| 'body-parse-error'

type McpRpcSummary = {
	source: McpRpcSummarySource
	rpcMethod: string | null
	rpcToolName: string | null
	rpcArgumentKeys: Array<string>
	isWriteToolCall: boolean
}

function emptyMcpRpcSummary(source: McpRpcSummarySource): McpRpcSummary {
	return {
		source,
		rpcMethod: null,
		rpcToolName: null,
		rpcArgumentKeys: [],
		isWriteToolCall: false,
	}
}

function toRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null
	return value as Record<string, unknown>
}

function decodeBase64Utf8(value: string) {
	try {
		const binary = atob(value)
		const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
		return new TextDecoder().decode(bytes)
	} catch {
		return null
	}
}

function resolveCanonicalBaseUrl(request: Request, env: Env) {
	const configuredBaseUrl = env.APP_BASE_URL?.trim()
	if (configuredBaseUrl) {
		try {
			return new URL('/', configuredBaseUrl).toString()
		} catch {
			// Fall back to request origin if the configured URL is malformed.
		}
	}
	return new URL('/', request.url).toString()
}

function isAllowedCrossOriginRequest(origin: string, request: Request) {
	if (origin === 'null') return true

	const url = new URL(request.url)
	if (!url.pathname.startsWith('/api/')) return false

	try {
		const parsedOrigin = new URL(origin)
		return (
			parsedOrigin.protocol === 'https:' &&
			parsedOrigin.hostname.endsWith(openAiSandboxOriginSuffix)
		)
	} catch {
		return false
	}
}

function summarizeJsonRpcPayload(
	payload: unknown,
): Omit<McpRpcSummary, 'source'> {
	const message =
		Array.isArray(payload) && payload.length > 0 ? payload[0] : payload
	const messageRecord = toRecord(message)
	if (!messageRecord) {
		return {
			rpcMethod: null,
			rpcToolName: null,
			rpcArgumentKeys: [],
			isWriteToolCall: false,
		}
	}

	const rpcMethod =
		typeof messageRecord.method === 'string' ? messageRecord.method : null
	const paramsRecord = toRecord(messageRecord.params)
	const rpcToolName =
		rpcMethod === 'tools/call' && typeof paramsRecord?.name === 'string'
			? paramsRecord.name
			: null
	const argumentsRecord = toRecord(paramsRecord?.arguments)
	const rpcArgumentKeys = argumentsRecord ? Object.keys(argumentsRecord) : []
	const isWriteToolCall =
		rpcMethod === 'tools/call' &&
		rpcToolName !== null &&
		mcpWriteToolNames.has(rpcToolName)

	return {
		rpcMethod,
		rpcToolName,
		rpcArgumentKeys,
		isWriteToolCall,
	}
}

async function summarizeMcpRpcRequest(
	request: Request,
): Promise<McpRpcSummary> {
	const encodedRpcMessage = request.headers.get('cf-mcp-message')
	if (encodedRpcMessage) {
		const decodedRpcMessage = decodeBase64Utf8(encodedRpcMessage)
		if (!decodedRpcMessage) {
			return emptyMcpRpcSummary('header-decode-error')
		}
		try {
			const parsed = JSON.parse(decodedRpcMessage)
			return {
				source: 'header',
				...summarizeJsonRpcPayload(parsed),
			}
		} catch {
			return emptyMcpRpcSummary('header-parse-error')
		}
	}

	if (request.method !== 'POST') return emptyMcpRpcSummary('none')
	const contentType = request.headers.get('content-type') ?? ''
	if (!contentType.toLowerCase().includes('application/json')) {
		return emptyMcpRpcSummary('none')
	}

	let requestBody = ''
	try {
		requestBody = await request.clone().text()
	} catch {
		return emptyMcpRpcSummary('body-read-error')
	}
	if (!requestBody.trim()) return emptyMcpRpcSummary('none')

	try {
		const parsed = JSON.parse(requestBody)
		return {
			source: 'body',
			...summarizeJsonRpcPayload(parsed),
		}
	} catch {
		return emptyMcpRpcSummary('body-parse-error')
	}
}

const appHandler = withCors({
	getCorsHeaders(request) {
		const origin = request.headers.get('Origin')
		if (!origin) return null
		const requestOrigin = new URL(request.url).origin
		if (
			origin !== requestOrigin &&
			!isAllowedCrossOriginRequest(origin, request)
		) {
			return null
		}
		return {
			'Access-Control-Allow-Origin': origin,
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'content-type, authorization',
			Vary: 'Origin',
		}
	},
	async handler(request, env, ctx) {
		const url = new URL(request.url)

		if (url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
			return new Response(null, { status: 204 })
		}

		if (url.pathname === mcpResourcePath) {
			const startedAt = Date.now()
			const rpcSummary = await summarizeMcpRpcRequest(request)
			const requestId = request.headers.get('cf-ray')
			const sessionId = request.headers.get('mcp-session-id')
			console.info('mcp request received', {
				requestId,
				requestMethod: request.method,
				requestPath: url.pathname,
				sessionId,
				userAgent: request.headers.get('user-agent'),
				mcpProtocolVersion: request.headers.get('mcp-protocol-version'),
				cfMcpMethod: request.headers.get('cf-mcp-method'),
				contentLength: request.headers.get('content-length'),
				rpcSource: rpcSummary.source,
				rpcMethod: rpcSummary.rpcMethod,
				rpcToolName: rpcSummary.rpcToolName,
				rpcArgumentKeys: rpcSummary.rpcArgumentKeys,
				isWriteToolCall: rpcSummary.isWriteToolCall,
			})

			const mcpContext = ctx as ExecutionContext<{ baseUrl: string }>
			;(
				mcpContext as ExecutionContext<{ baseUrl: string }> & {
					props?: { baseUrl: string }
				}
			).props = {
				baseUrl: resolveCanonicalBaseUrl(request, env),
			}
			try {
				const response = await MCP.serve(mcpResourcePath, {
					binding: 'MCP_OBJECT',
				}).fetch(request, env, mcpContext)
				console.info('mcp request handled', {
					requestId,
					requestMethod: request.method,
					requestPath: url.pathname,
					sessionId,
					responseStatus: response.status,
					durationMs: Date.now() - startedAt,
					rpcMethod: rpcSummary.rpcMethod,
					rpcToolName: rpcSummary.rpcToolName,
					isWriteToolCall: rpcSummary.isWriteToolCall,
				})
				return response
			} catch (error) {
				console.error('mcp request failed', {
					requestId,
					requestMethod: request.method,
					requestPath: url.pathname,
					sessionId,
					durationMs: Date.now() - startedAt,
					rpcMethod: rpcSummary.rpcMethod,
					rpcToolName: rpcSummary.rpcToolName,
					isWriteToolCall: rpcSummary.isWriteToolCall,
					errorName: error instanceof Error ? error.name : 'UnknownError',
					errorMessage: error instanceof Error ? error.message : String(error),
				})
				throw error
			}
		}

		if (url.pathname.startsWith(scheduleSocketPathPrefix)) {
			const upgrade = request.headers.get('Upgrade')?.toLowerCase()
			if (request.method !== 'GET' || upgrade !== 'websocket') {
				return Response.json(
					{
						ok: false,
						error: 'Realtime endpoint requires a websocket upgrade request.',
					},
					{ status: 426 },
				)
			}

			const shareToken = url.pathname.slice(scheduleSocketPathPrefix.length)
			if (!shareToken || shareToken.includes('/')) {
				return Response.json(
					{ ok: false, error: 'Invalid schedule token for realtime socket.' },
					{ status: 400 },
				)
			}
			const roomId = env.SCHEDULE_ROOM.idFromName(shareToken)
			const room = env.SCHEDULE_ROOM.get(roomId)
			return room.fetch(request)
		}

		// Sandboxed widget iframes have an opaque origin, so JS/CSS loads become CORS fetches.
		// ChatGPT/MCP Jam can render with sandbox="allow-scripts", which requires these headers.
		if (
			env.ASSETS &&
			(request.method === 'GET' || request.method === 'HEAD') &&
			(url.pathname.startsWith('/mcp-apps/') || url.pathname === '/styles.css')
		) {
			const assetResponse = await env.ASSETS.fetch(request)
			if (assetResponse.status !== 404) {
				const headers = new Headers(assetResponse.headers)
				headers.set('Access-Control-Allow-Origin', '*')
				return new Response(assetResponse.body, {
					status: assetResponse.status,
					statusText: assetResponse.statusText,
					headers,
				})
			}
		}

		// Dev route: serve schedule UI for iframe testing (simulates ChatGPT/MCP Jam)
		if (
			url.pathname === '/dev/schedule-ui' &&
			(request.method === 'GET' || request.method === 'HEAD')
		) {
			const { renderScheduleUiEntryPoint } =
				await import('#mcp/apps/schedule-ui-entry-point.ts')
			const baseUrl = new URL('/', url.origin)
			const html = renderScheduleUiEntryPoint(baseUrl)
			return new Response(html, {
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
				},
			})
		}

		// Dev route: serve schedule host UI for iframe testing (simulates ChatGPT/MCP Jam)
		if (
			url.pathname === '/dev/schedule-host-ui' &&
			(request.method === 'GET' || request.method === 'HEAD')
		) {
			const { renderScheduleHostUiEntryPoint } =
				await import('#mcp/apps/schedule-host-ui-entry-point.ts')
			const baseUrl = new URL('/', url.origin)
			const html = renderScheduleHostUiEntryPoint(baseUrl)
			return new Response(html, {
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
				},
			})
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
