import { extractScheduleToolInput } from './schedule-widget-tool-input.js'
import {
	createFullscreenManager,
	getWidgetElement,
	isRecord,
	readNonEmptyString,
	readTheme,
} from './schedule-widget-shared.js'
import { createWidgetHostBridge } from './widget-host-bridge.js'

const getElement = <T extends HTMLElement>(
	root: ParentNode,
	selector: string,
): T => getWidgetElement<T>(root, selector, 'host widget')

function getApiBaseUrl(rootElement: HTMLElement) {
	const configuredBaseUrl = readNonEmptyString(rootElement.dataset.apiBaseUrl)
	if (configuredBaseUrl) return new URL('/', configuredBaseUrl)
	return new URL('/', window.location.href)
}

function setupScheduleHostWidget() {
	const rootElement = document.querySelector('[data-schedule-host-widget]')
	if (!(rootElement instanceof HTMLElement)) return

	const appRoot = document.documentElement
	const shareTokenElement = getElement<HTMLElement>(
		rootElement,
		'[data-share-token]',
	)
	const shareTokenInput = getElement<HTMLInputElement>(
		rootElement,
		'input[name="shareToken"]',
	)
	const hostAccessTokenElement = getElement<HTMLElement>(
		rootElement,
		'[data-host-access-token]',
	)
	const hostAccessTokenInput = getElement<HTMLInputElement>(
		rootElement,
		'input[name="hostAccessToken"]',
	)
	const statusElement = getElement<HTMLElement>(rootElement, '[data-status]')
	const hostIframe = getElement<HTMLIFrameElement>(
		rootElement,
		'[data-host-iframe]',
	)
	const attendeeLink = getElement<HTMLAnchorElement>(
		rootElement,
		'[data-attendee-link]',
	)
	const fullscreenToggleButton = rootElement.querySelector<HTMLButtonElement>(
		'[data-action="request-fullscreen"]',
	)
	const loadHostButton = getElement<HTMLButtonElement>(
		rootElement,
		'[data-action="load-host"]',
	)

	if (fullscreenToggleButton) {
		fullscreenToggleButton.hidden = true
	}

	let fullscreenManager: ReturnType<typeof createFullscreenManager> | null =
		null
	const apiBaseUrl = getApiBaseUrl(rootElement)

	function setStatus(message: string, error = false) {
		statusElement.textContent = message
		statusElement.setAttribute('data-status-tone', error ? 'error' : 'normal')
	}

	function setHostDashboardTarget(params: {
		shareToken: string
		hostAccessToken?: string | null
	}) {
		const normalizedShareToken = params.shareToken.trim()
		if (!normalizedShareToken) {
			setStatus('Share token is required.', true)
			return false
		}
		const normalizedHostAccessToken =
			params.hostAccessToken?.trim() ?? hostAccessTokenInput.value.trim()
		shareTokenInput.value = normalizedShareToken
		shareTokenElement.textContent = normalizedShareToken
		attendeeLink.href = new URL(
			`/s/${encodeURIComponent(normalizedShareToken)}`,
			apiBaseUrl,
		).toString()
		if (!normalizedHostAccessToken) {
			hostAccessTokenElement.textContent = 'Not provided'
			hostIframe.removeAttribute('src')
			setStatus(
				'Host access token is required to load the host dashboard.',
				true,
			)
			return false
		}
		hostAccessTokenInput.value = normalizedHostAccessToken
		hostAccessTokenElement.textContent = normalizedHostAccessToken
		hostIframe.src = new URL(
			`/s/${encodeURIComponent(normalizedShareToken)}/${encodeURIComponent(normalizedHostAccessToken)}`,
			apiBaseUrl,
		).toString()
		setStatus('Host dashboard loaded.')
		return true
	}

	const hostBridge = createWidgetHostBridge({
		appInfo: {
			name: 'schedule-host-widget',
			version: '1.0.0',
		},
		onRenderData: (renderData) => {
			const theme = readTheme(renderData)
			if (theme) {
				appRoot.setAttribute('data-theme', theme)
			} else {
				appRoot.removeAttribute('data-theme')
			}
			fullscreenManager?.updateFullscreenButton()
			const params = extractScheduleToolInput(renderData)
			maybeApplyToolInput(params)
		},
		onHostContextChanged: (hostContext) => {
			const theme = readTheme(hostContext)
			if (theme) {
				appRoot.setAttribute('data-theme', theme)
			} else {
				appRoot.removeAttribute('data-theme')
			}
			fullscreenManager?.updateFullscreenButton()
			void fullscreenManager?.maybeAutoRequestFullscreen()
		},
	})

	fullscreenManager = createFullscreenManager({
		hostBridge,
		fullscreenToggleButton,
		autoFullscreenErrorLabel: 'schedule host widget',
	})

	async function toggleFullscreenMode() {
		if (!fullscreenManager) {
			throw new Error('Fullscreen controls are unavailable.')
		}
		return fullscreenManager.toggleFullscreenMode()
	}

	function maybeApplyToolInput(params: {
		shareToken: string | null
		hostAccessToken?: string | null
	}) {
		if (!params.shareToken) return
		void setHostDashboardTarget({
			shareToken: params.shareToken,
			hostAccessToken: params.hostAccessToken ?? hostAccessTokenInput.value,
		})
	}

	function handleToolInputMessage(message: unknown) {
		if (!isRecord(message)) return
		if (
			message.method !== 'ui/notifications/tool-input' &&
			message.method !== 'ui/notifications/tool-input-partial' &&
			message.method !== 'ui/notifications/tool-result'
		) {
			return
		}
		maybeApplyToolInput(extractScheduleToolInput(message))
	}

	loadHostButton.addEventListener('click', () => {
		const token = shareTokenInput.value.trim()
		const hostAccessToken = hostAccessTokenInput.value.trim()
		if (
			!setHostDashboardTarget({
				shareToken: token,
				hostAccessToken,
			})
		) {
			return
		}
		void hostBridge.sendUserMessageWithFallback(
			`Loaded Epic Scheduler host dashboard for share token ${token}.`,
		)
	})

	shareTokenInput.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter') return
		event.preventDefault()
		loadHostButton.click()
	})
	hostAccessTokenInput.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter') return
		event.preventDefault()
		loadHostButton.click()
	})

	fullscreenToggleButton?.addEventListener('click', () => {
		setStatus('Updating display mode...')
		void toggleFullscreenMode()
			.then(() => setStatus('Display mode updated.'))
			.catch((error: unknown) => {
				const message =
					error instanceof Error
						? error.message
						: 'Unable to update display mode.'
				setStatus(message, true)
			})
	})

	const trustedHostOrigin = (() => {
		if (!document.referrer) return null
		try {
			return new URL(document.referrer).origin
		} catch {
			return null
		}
	})()

	window.addEventListener('message', (event) => {
		if (event.source !== window.parent) return
		if (trustedHostOrigin && event.origin !== trustedHostOrigin) return
		handleToolInputMessage(event.data)
		hostBridge.handleHostMessage(event.data)
	})

	void hostBridge.initialize().then((ready) => {
		fullscreenManager?.updateFullscreenButton()
		if (!ready) return
		void fullscreenManager?.maybeAutoRequestFullscreen()
	})
	hostBridge.requestRenderData()
	fullscreenManager?.updateFullscreenButton()
	setStatus('Waiting for share token and host access token input.')
	const openAiBridge = (
		window as Window & {
			openai?: unknown
		}
	).openai
	maybeApplyToolInput(extractScheduleToolInput(openAiBridge))
	const widgetUrl = new URL(window.location.href)
	maybeApplyToolInput({
		shareToken: readNonEmptyString(widgetUrl.searchParams.get('shareToken')),
		hostAccessToken: readNonEmptyString(
			widgetUrl.searchParams.get('hostAccessToken'),
		),
	})
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupScheduleHostWidget, {
		once: true,
	})
} else {
	setupScheduleHostWidget()
}
