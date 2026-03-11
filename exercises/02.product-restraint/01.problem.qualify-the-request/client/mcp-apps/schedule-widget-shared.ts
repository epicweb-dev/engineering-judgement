export type WidgetDisplayMode = 'inline' | 'fullscreen' | 'pip'

export type WidgetHostBridge = {
	getHostContext(): Record<string, unknown> | undefined
	requestDisplayMode(mode: WidgetDisplayMode): Promise<WidgetDisplayMode | null>
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

export function readTheme(source: Record<string, unknown> | undefined) {
	const value = source?.theme
	return value === 'dark' || value === 'light' ? value : undefined
}

export function isDisplayMode(value: unknown): value is WidgetDisplayMode {
	return value === 'inline' || value === 'fullscreen' || value === 'pip'
}

export function readDisplayMode(source: Record<string, unknown> | undefined) {
	const value = source?.displayMode
	return isDisplayMode(value) ? value : null
}

export function readAvailableDisplayModes(
	source: Record<string, unknown> | undefined,
) {
	if (!Array.isArray(source?.availableDisplayModes)) {
		return [] as Array<WidgetDisplayMode>
	}
	return source.availableDisplayModes.filter((mode) => isDisplayMode(mode))
}

export function readNonEmptyString(value: unknown) {
	if (typeof value !== 'string') return null
	const normalized = value.trim()
	return normalized.length > 0 ? normalized : null
}

export function getWidgetElement<T extends HTMLElement>(
	root: ParentNode,
	selector: string,
	label = 'widget',
): T {
	const element = root.querySelector<T>(selector)
	if (!element) {
		throw new Error(`Missing ${label} element: ${selector}`)
	}
	return element
}

export function createFullscreenManager({
	hostBridge,
	fullscreenToggleButton,
	autoFullscreenErrorLabel,
}: {
	hostBridge: WidgetHostBridge
	fullscreenToggleButton: HTMLButtonElement | null
	autoFullscreenErrorLabel?: string
}) {
	let hasRequestedAutoFullscreen = false

	function updateFullscreenButton() {
		if (!fullscreenToggleButton) return
		const hostContext = hostBridge.getHostContext()
		const availableModes = readAvailableDisplayModes(hostContext)
		const supportsFullscreen =
			availableModes.length === 0 || availableModes.includes('fullscreen')
		if (!supportsFullscreen) {
			fullscreenToggleButton.hidden = true
			return
		}
		const displayMode = readDisplayMode(hostContext)
		const inFullscreen = displayMode === 'fullscreen'
		const canExitFullscreen =
			availableModes.length === 0 || availableModes.includes('inline')
		if (inFullscreen && !canExitFullscreen) {
			fullscreenToggleButton.hidden = true
			return
		}
		fullscreenToggleButton.hidden = false
		fullscreenToggleButton.textContent = inFullscreen
			? 'Exit fullscreen'
			: 'Fullscreen'
		fullscreenToggleButton.setAttribute(
			'aria-label',
			inFullscreen ? 'Exit fullscreen mode' : 'Request fullscreen mode',
		)
	}

	async function maybeAutoRequestFullscreen() {
		if (hasRequestedAutoFullscreen) return
		hasRequestedAutoFullscreen = true
		const hostContext = hostBridge.getHostContext()
		const availableModes = readAvailableDisplayModes(hostContext)
		const supportsFullscreen =
			availableModes.length === 0 || availableModes.includes('fullscreen')
		const displayMode = readDisplayMode(hostContext)
		if (!supportsFullscreen || displayMode === 'fullscreen') return
		try {
			const grantedMode = await hostBridge.requestDisplayMode('fullscreen')
			if (grantedMode === 'fullscreen') {
				updateFullscreenButton()
			}
		} catch (error) {
			hasRequestedAutoFullscreen = false
			if (autoFullscreenErrorLabel) {
				console.warn(
					`${autoFullscreenErrorLabel} auto-fullscreen request failed`,
					{
						errorName: error instanceof Error ? error.name : 'UnknownError',
					},
				)
			}
		}
	}

	async function toggleFullscreenMode() {
		const hostContext = hostBridge.getHostContext()
		const availableModes = readAvailableDisplayModes(hostContext)
		const displayMode = readDisplayMode(hostContext)
		const inFullscreen = displayMode === 'fullscreen'
		const requestedMode = inFullscreen ? 'inline' : 'fullscreen'
		if (availableModes.length > 0 && !availableModes.includes(requestedMode)) {
			throw new Error(
				`Host does not advertise ${requestedMode} mode support. Available modes: ${availableModes.join(', ')}`,
			)
		}
		const grantedMode = await hostBridge.requestDisplayMode(requestedMode)
		if (!grantedMode) {
			throw new Error(`Host did not grant ${requestedMode} mode request.`)
		}
		updateFullscreenButton()
		return {
			ok: true,
			requestedMode,
			grantedMode,
		}
	}

	return {
		updateFullscreenButton,
		maybeAutoRequestFullscreen,
		toggleFullscreenMode,
	}
}
