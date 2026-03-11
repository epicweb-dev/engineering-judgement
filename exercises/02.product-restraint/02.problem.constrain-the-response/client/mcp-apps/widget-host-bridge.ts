type WidgetHostBridgeOptions = {
	protocolVersion?: string
	requestTimeoutMs?: number
	availableDisplayModes?: Array<WidgetDisplayMode>
	appInfo?: {
		name: string
		version: string
	}
	onRenderData?: (renderData: Record<string, unknown> | undefined) => void
	onHostContextChanged?: (
		hostContext: Record<string, unknown> | undefined,
	) => void
}

type WidgetDisplayMode = 'inline' | 'fullscreen' | 'pip'

type WidgetHostBridge = {
	handleHostMessage(message: unknown): void
	initialize(): Promise<boolean>
	sendUserMessage(text: string): Promise<boolean>
	sendUserMessageWithFallback(text: string): Promise<boolean>
	requestDisplayMode(mode: WidgetDisplayMode): Promise<WidgetDisplayMode | null>
	getHostContext(): Record<string, unknown> | undefined
	requestRenderData(): boolean
}

type BridgeResponseMessage = {
	jsonrpc: '2.0'
	id?: string | number | null
	result?: Record<string, unknown>
	error?: Record<string, unknown>
}

type PendingBridgeRequest = {
	resolve: (value: BridgeResponseMessage) => void
	reject: (reason?: unknown) => void
	timeoutId: ReturnType<typeof setTimeout>
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function toRequestId(value: string | number) {
	return String(value)
}

function getBridgeErrorMessage(error: unknown) {
	if (isRecord(error) && typeof error.message === 'string') {
		return error.message
	}
	return 'Bridge request failed'
}

function isWidgetDisplayMode(value: unknown): value is WidgetDisplayMode {
	return value === 'inline' || value === 'fullscreen' || value === 'pip'
}

function normalizeDisplayModes(input: Array<WidgetDisplayMode> | undefined) {
	const defaults: Array<WidgetDisplayMode> = ['inline', 'fullscreen']
	if (!input || input.length === 0) return defaults
	const uniqueModes = input.filter(
		(mode, index) => input.indexOf(mode) === index,
	)
	return uniqueModes.length > 0 ? uniqueModes : defaults
}

export function createWidgetHostBridge(
	options: WidgetHostBridgeOptions = {},
): WidgetHostBridge {
	const protocolVersion = options.protocolVersion ?? '2026-01-26'
	const requestTimeoutMs = options.requestTimeoutMs ?? 1500
	const availableDisplayModes = normalizeDisplayModes(
		options.availableDisplayModes,
	)
	const appInfo = options.appInfo ?? {
		name: 'mcp-widget',
		version: '1.0.0',
	}
	const renderDataMessageType = 'ui-lifecycle-iframe-render-data'
	const hostContextChangedMethod = 'ui/notifications/host-context-changed'

	let requestCounter = 0
	let initialized = false
	let hostContext: Record<string, unknown> | undefined = undefined
	let initializationPromise: Promise<boolean> | null = null
	const pendingRequests = new Map<string, PendingBridgeRequest>()

	function postMessageToHost(message: Record<string, unknown>) {
		const hostWindow = globalThis.window?.parent
		if (!hostWindow) {
			throw new Error('Host window is unavailable')
		}
		hostWindow.postMessage(message, '*')
	}

	function dispatchRenderData(renderData: unknown) {
		if (!options.onRenderData) return
		options.onRenderData(isRecord(renderData) ? renderData : undefined)
	}

	function dispatchHostContext(nextHostContext: unknown) {
		hostContext = isRecord(nextHostContext) ? nextHostContext : undefined
		if (!options.onHostContextChanged) return
		options.onHostContextChanged(hostContext)
	}

	function handleBridgeResponseMessage(message: unknown) {
		if (!isRecord(message)) return
		if (message.jsonrpc !== '2.0') return
		if (typeof message.id !== 'string' && typeof message.id !== 'number') return

		const requestId = toRequestId(message.id)
		const pendingRequest = pendingRequests.get(requestId)
		if (!pendingRequest) return

		globalThis.clearTimeout(pendingRequest.timeoutId)
		pendingRequests.delete(requestId)

		const response: BridgeResponseMessage = {
			jsonrpc: '2.0',
			id: message.id,
			result: isRecord(message.result) ? message.result : undefined,
			error: isRecord(message.error) ? message.error : undefined,
		}

		if (response.error) {
			pendingRequest.reject(new Error(getBridgeErrorMessage(response.error)))
			return
		}

		pendingRequest.resolve(response)
	}

	function handleLifecycleMessage(message: unknown) {
		if (!isRecord(message)) return

		if (message.type === renderDataMessageType) {
			const payload = isRecord(message.payload) ? message.payload : undefined
			dispatchRenderData(payload?.renderData)
			return
		}

		if (message.method === hostContextChangedMethod) {
			dispatchHostContext(message.params)
		}
	}

	function handleHostMessage(message: unknown) {
		handleBridgeResponseMessage(message)
		handleLifecycleMessage(message)
	}

	function sendBridgeRequest(
		method: string,
		params: Record<string, unknown>,
	): Promise<BridgeResponseMessage> {
		return new Promise<BridgeResponseMessage>((resolve, reject) => {
			requestCounter += 1
			const requestId = toRequestId(`${appInfo.name}-bridge-${requestCounter}`)
			const timeoutId = globalThis.setTimeout(() => {
				pendingRequests.delete(requestId)
				reject(new Error('Bridge request timed out'))
			}, requestTimeoutMs)

			pendingRequests.set(requestId, {
				resolve,
				reject,
				timeoutId,
			})

			try {
				postMessageToHost({
					jsonrpc: '2.0',
					id: requestId,
					method,
					params,
				})
			} catch (error) {
				pendingRequests.delete(requestId)
				globalThis.clearTimeout(timeoutId)
				reject(error)
			}
		})
	}

	async function initialize() {
		if (initialized) return true
		if (initializationPromise) return initializationPromise

		initializationPromise = sendBridgeRequest('ui/initialize', {
			appInfo,
			appCapabilities: {
				availableDisplayModes,
			},
			protocolVersion,
		})
			.then((response) => {
				dispatchHostContext(response.result?.hostContext)
				initialized = true
				try {
					postMessageToHost({
						jsonrpc: '2.0',
						method: 'ui/notifications/initialized',
						params: {},
					})
				} catch {
					// Ignore initialized notification failures and continue.
				}
				return true
			})
			.catch(() => {
				return false
			})
			.finally(() => {
				initializationPromise = null
			})

		return initializationPromise
	}

	async function sendUserMessage(text: string) {
		const bridgeReady = await initialize()
		if (!bridgeReady) return false

		try {
			const response = await sendBridgeRequest('ui/message', {
				role: 'user',
				content: [{ type: 'text', text }],
			})
			return response.result?.isError !== true
		} catch {
			return false
		}
	}

	async function sendUserMessageWithFallback(text: string) {
		const bridgeSent = await sendUserMessage(text)
		if (bridgeSent) return true

		try {
			postMessageToHost({
				type: 'prompt',
				payload: { prompt: text },
			})
			return true
		} catch {
			return false
		}
	}

	async function requestDisplayMode(mode: WidgetDisplayMode) {
		const bridgeReady = await initialize()
		if (!bridgeReady) return null

		const hostDisplayModes = Array.isArray(hostContext?.availableDisplayModes)
			? hostContext.availableDisplayModes.filter((value) =>
					isWidgetDisplayMode(value),
				)
			: []
		if (hostDisplayModes.length > 0 && !hostDisplayModes.includes(mode)) {
			return null
		}

		try {
			const response = await sendBridgeRequest('ui/request-display-mode', {
				mode,
			})
			const resolvedMode = response.result?.mode
			if (!isWidgetDisplayMode(resolvedMode)) {
				return null
			}
			dispatchHostContext({
				...(hostContext ?? {}),
				displayMode: resolvedMode,
			})
			return resolvedMode
		} catch {
			return null
		}
	}

	function requestRenderData() {
		try {
			postMessageToHost({
				type: 'ui-request-render-data',
				payload: {},
			})
			return true
		} catch {
			return false
		}
	}

	return {
		handleHostMessage,
		initialize,
		sendUserMessage,
		sendUserMessageWithFallback,
		requestDisplayMode,
		getHostContext: () => hostContext,
		requestRenderData,
	}
}
