import { getBrowserTimeZone } from '#client/browser-time-zone.ts'
import { getScheduleCellBackgroundColor } from '#client/schedule-grid-colors.ts'
import { buildScheduleGridTableModel } from '#client/schedule-grid-model.ts'
import { getSelectionDiff } from '#client/schedule-selection-utils.ts'
import {
	createSlotAvailability,
	getMaxAvailabilityCount,
} from '#client/schedule-snapshot-utils.ts'
import {
	findSelectionForAttendee,
	formatSlotLabel,
	formatSlotForAttendeeTimeZone,
} from '#client/schedule-utils.ts'
import { type ScheduleSnapshot } from '#shared/schedule-store.ts'
import { extractScheduleToolInput } from './schedule-widget-tool-input.js'
import {
	createFullscreenManager,
	getWidgetElement as getFormElement,
	isRecord,
	readNonEmptyString,
	readTheme,
} from './schedule-widget-shared.js'
import { createWidgetHostBridge } from './widget-host-bridge.js'

function getApiBaseUrl(rootElement: HTMLElement) {
	const configuredBaseUrl = readNonEmptyString(rootElement.dataset.apiBaseUrl)
	if (configuredBaseUrl) return new URL('/', configuredBaseUrl)
	return new URL('/', window.location.href)
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}

function setupScheduleWidget() {
	const rootElement = document.querySelector('[data-schedule-widget]')
	if (!(rootElement instanceof HTMLElement)) return

	const appRoot = document.documentElement
	const scheduleTitleElement = getFormElement<HTMLElement>(
		rootElement,
		'[data-schedule-title]',
	)
	const shareTokenElement = getFormElement<HTMLElement>(
		rootElement,
		'[data-share-token]',
	)
	const statusElement = getFormElement<HTMLElement>(
		rootElement,
		'[data-status]',
	)
	const gridHostElement = getFormElement<HTMLElement>(
		rootElement,
		'[data-grid-host]',
	)
	const slotDetailsElement = getFormElement<HTMLElement>(
		rootElement,
		'[data-slot-details]',
	)
	const selectedCountElement = getFormElement<HTMLElement>(
		rootElement,
		'[data-selected-count]',
	)
	const pendingCountElement = getFormElement<HTMLElement>(
		rootElement,
		'[data-pending-count]',
	)
	const browserTimeZoneElement = getFormElement<HTMLElement>(
		rootElement,
		'[data-browser-timezone]',
	)
	const attendeeNameInput = getFormElement<HTMLInputElement>(
		rootElement,
		'input[name="attendeeName"]',
	)
	const fullscreenToggleButton = rootElement.querySelector<HTMLButtonElement>(
		'[data-action="request-fullscreen"]',
	)
	if (fullscreenToggleButton) {
		fullscreenToggleButton.hidden = true
	}

	browserTimeZoneElement.textContent = getBrowserTimeZone()

	let currentShareToken: string | null = null
	let snapshot: ScheduleSnapshot | null = null
	let selectedSlots = new Set<string>()
	let persistedSelectedSlots = new Set<string>()
	let activeSlot: string | null = null
	let fullscreenManager: ReturnType<typeof createFullscreenManager> | null =
		null
	const fetchSnapshotTimeoutMs = 10_000
	const apiBaseUrl = getApiBaseUrl(rootElement)

	function setStatus(message: string, error = false) {
		statusElement.textContent = message
		statusElement.setAttribute('data-status-tone', error ? 'error' : 'normal')
	}

	function getPersistedSelectionForName(name: string) {
		if (!snapshot) return new Set<string>()
		return new Set(
			findSelectionForAttendee({
				attendeeName: name,
				attendees: snapshot.attendees,
				availabilityByAttendee: snapshot.availabilityByAttendee,
			}),
		)
	}

	function updateSelectionSummary() {
		const selectionDiff = getSelectionDiff({
			currentSelection: selectedSlots,
			persistedSelection: persistedSelectedSlots,
		})
		const pendingCount =
			selectionDiff.pendingAdded.size + selectionDiff.pendingRemoved.size
		selectedCountElement.textContent = String(selectedSlots.size)
		pendingCountElement.textContent = String(pendingCount)
	}

	function updateActiveSlotStyles() {
		for (const element of gridHostElement.querySelectorAll<HTMLButtonElement>(
			'button[data-slot]',
		)) {
			const slot = element.dataset.slot
			element.classList.toggle('is-active', slot === activeSlot)
		}
	}

	function renderSlotDetails() {
		if (!snapshot || !activeSlot) {
			slotDetailsElement.hidden = true
			slotDetailsElement.replaceChildren()
			return
		}

		const activeSlotValue = activeSlot
		const availableNames = snapshot.availableNamesBySlot[activeSlotValue] ?? []
		const availableNameSet = new Set(availableNames)
		const availableAttendees = snapshot.attendees.filter((entry) =>
			availableNameSet.has(entry.name),
		)
		const unavailableAttendees = snapshot.attendees.filter(
			(entry) => !availableNameSet.has(entry.name),
		)
		const selectionDiff = getSelectionDiff({
			currentSelection: selectedSlots,
			persistedSelection: persistedSelectedSlots,
		})
		const pendingStatus = selectionDiff.pendingAdded.has(activeSlotValue)
			? 'Pending add to your availability.'
			: selectionDiff.pendingRemoved.has(activeSlotValue)
				? 'Pending removal from your availability.'
				: ''

		const availableList =
			availableAttendees.length > 0
				? `<ul>${availableAttendees
						.map((entry) => {
							const slotTime = formatSlotForAttendeeTimeZone(
								activeSlotValue,
								entry.timeZone,
							)
							return `<li><strong>${escapeHtml(entry.name)}</strong> - ${escapeHtml(
								slotTime.localTime,
							)} (${escapeHtml(slotTime.timeZoneLabel)})</li>`
						})
						.join('')}</ul>`
				: '<p class="scheduler-muted">None</p>'
		const unavailableList =
			unavailableAttendees.length > 0
				? `<ul>${unavailableAttendees
						.map((entry) => {
							const slotTime = formatSlotForAttendeeTimeZone(
								activeSlotValue,
								entry.timeZone,
							)
							return `<li><strong>${escapeHtml(entry.name)}</strong> - ${escapeHtml(
								slotTime.localTime,
							)} (${escapeHtml(slotTime.timeZoneLabel)})</li>`
						})
						.join('')}</ul>`
				: '<p class="scheduler-muted">None</p>'
		const formattedSlot = formatSlotLabel(activeSlotValue, 'long')

		slotDetailsElement.hidden = false
		slotDetailsElement.innerHTML = `
			<h2>Slot details</h2>
			<p class="scheduler-muted">${escapeHtml(formattedSlot)}</p>
			<div class="scheduler-row">
				<p><strong>Available (${availableAttendees.length})</strong></p>
				${availableList}
			</div>
			<div class="scheduler-row">
				<p><strong>Unavailable (${unavailableAttendees.length})</strong></p>
				${unavailableList}
			</div>
			${pendingStatus ? `<p class="scheduler-muted">${escapeHtml(pendingStatus)}</p>` : ''}
		`
	}

	function renderGrid() {
		if (!snapshot) {
			gridHostElement.innerHTML = `
				<p class="scheduler-muted" style="padding: var(--spacing-md)">
					No schedule loaded yet.
				</p>
			`
			updateSelectionSummary()
			return
		}

		const selectionDiff = getSelectionDiff({
			currentSelection: selectedSlots,
			persistedSelection: persistedSelectedSlots,
		})
		const slotAvailability = createSlotAvailability(snapshot)
		const maxAvailabilityCount = getMaxAvailabilityCount(slotAvailability)
		const grid = buildScheduleGridTableModel({ slots: snapshot.slots })
		const { dayKeys, dayLabels, timeKeys, timeLabels, cellByDayAndTime } = grid
		if (dayKeys.length === 0 || timeKeys.length === 0) {
			gridHostElement.innerHTML = `
				<p class="scheduler-muted" style="padding: var(--spacing-md)">
					No time slots available for this schedule.
				</p>
			`
			updateSelectionSummary()
			return
		}

		const dayHeaders = dayKeys
			.map(
				(dayKey) =>
					`<th scope="col">${escapeHtml(dayLabels[dayKey] ?? dayKey)}</th>`,
			)
			.join('')

		const bodyRows = timeKeys
			.map((timeKey) => {
				const timeLabel = escapeHtml(timeLabels[timeKey] ?? timeKey)
				const cells = dayKeys
					.map((dayKey) => {
						const slot = cellByDayAndTime[dayKey]?.[timeKey] ?? null
						if (!slot) {
							return `<td class="scheduler-grid-empty"></td>`
						}

						const availability = slotAvailability[slot] ?? {
							count: 0,
							availableNames: [],
						}
						const isSelected = selectedSlots.has(slot)
						const isPendingAdd = selectionDiff.pendingAdded.has(slot)
						const isPendingRemove = selectionDiff.pendingRemoved.has(slot)
						const pendingLabel = isPendingAdd
							? 'pending add'
							: isPendingRemove
								? 'pending removal'
								: ''
						const background = getScheduleCellBackgroundColor({
							count: availability.count,
							maxCount: maxAvailabilityCount,
							isSelected,
						})
						const slotLabel = formatSlotLabel(slot, 'long')
						const attendeeLabel =
							availability.count > 0
								? `${availability.count} attendee${availability.count === 1 ? '' : 's'} available`
								: 'no attendees available'
						const selectionLabel = isSelected
							? 'selected for your availability'
							: 'not selected for your availability'
						const ariaLabel = `${slotLabel}, ${selectionLabel}, ${attendeeLabel}${pendingLabel ? `, ${pendingLabel}` : ''}`
						const title = `${slotLabel}\n${attendeeLabel}${pendingLabel ? `\n${pendingLabel}` : ''}`
						const classNames = [
							'scheduler-slot',
							isSelected ? 'is-selected' : '',
							activeSlot === slot ? 'is-active' : '',
							isPendingAdd ? 'is-pending-add' : '',
							isPendingRemove ? 'is-pending-remove' : '',
						]
							.filter((value) => value.length > 0)
							.join(' ')
						return `
							<td>
								<button
									type="button"
									class="${classNames}"
									style="background: ${background}"
									data-slot="${escapeHtml(slot)}"
									aria-label="${escapeHtml(ariaLabel)}"
									aria-pressed="${isSelected ? 'true' : 'false'}"
									title="${escapeHtml(title)}"
								>${availability.count > 0 ? String(availability.count) : ''}</button>
							</td>
						`
					})
					.join('')
				return `<tr><th scope="row">${timeLabel}</th>${cells}</tr>`
			})
			.join('')

		gridHostElement.innerHTML = `
			<table>
				<thead>
					<tr>
						<th scope="col">Time</th>
						${dayHeaders}
					</tr>
				</thead>
				<tbody>${bodyRows}</tbody>
			</table>
		`
		updateSelectionSummary()
	}

	function resetSelectionForAttendee(preserveDirtySelection = false) {
		const selectionDiff = preserveDirtySelection
			? getSelectionDiff({
					currentSelection: selectedSlots,
					persistedSelection: persistedSelectedSlots,
				})
			: null
		const hasDirtyChanges =
			selectionDiff &&
			(selectionDiff.pendingAdded.size > 0 ||
				selectionDiff.pendingRemoved.size > 0)
		persistedSelectedSlots = getPersistedSelectionForName(
			attendeeNameInput.value,
		)
		if (!hasDirtyChanges) {
			selectedSlots = new Set(persistedSelectedSlots)
		}
		if (activeSlot && snapshot?.slots.includes(activeSlot)) {
			return
		}
		activeSlot = snapshot?.slots[0] ?? null
	}

	function applyShareToken(token: string) {
		const normalizedShareToken = token.trim()
		if (!normalizedShareToken) return false
		if (normalizedShareToken === currentShareToken) return false

		currentShareToken = normalizedShareToken
		shareTokenElement.textContent = normalizedShareToken
		snapshot = null
		selectedSlots = new Set<string>()
		persistedSelectedSlots = new Set<string>()
		activeSlot = null
		renderGrid()
		renderSlotDetails()
		updateSelectionSummary()
		return true
	}

	function setSnapshot(nextSnapshot: ScheduleSnapshot) {
		snapshot = nextSnapshot
		currentShareToken = nextSnapshot.schedule.shareToken
		scheduleTitleElement.textContent = 'Your availability'
		shareTokenElement.textContent = nextSnapshot.schedule.shareToken
		if (!attendeeNameInput.value.trim()) {
			attendeeNameInput.value = nextSnapshot.attendees[0]?.name ?? ''
		}
		resetSelectionForAttendee()
		setStatus('Select slots, then save availability.')
		renderGrid()
		renderSlotDetails()
	}

	const hostBridge = createWidgetHostBridge({
		appInfo: {
			name: 'schedule-widget',
			version: '3.0.0',
		},
		onRenderData: (renderData) => {
			const theme = readTheme(renderData)
			if (theme) {
				appRoot.setAttribute('data-theme', theme)
			} else {
				appRoot.removeAttribute('data-theme')
			}
			maybeApplyToolInput(extractScheduleToolInput(renderData))
			fullscreenManager?.updateFullscreenButton()
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
		autoFullscreenErrorLabel: 'schedule widget',
	})

	async function toggleFullscreenMode() {
		if (!fullscreenManager) {
			throw new Error('Fullscreen controls are unavailable.')
		}
		return fullscreenManager.toggleFullscreenMode()
	}

	async function fetchSnapshot() {
		const requestShareToken = currentShareToken?.trim() ?? ''
		if (!requestShareToken) {
			throw new Error(
				'Share token was not provided. Re-open with open_schedule_ui and pass shareToken.',
			)
		}
		const controller = new AbortController()
		const timeoutId = window.setTimeout(() => {
			controller.abort()
		}, fetchSnapshotTimeoutMs)
		let response: Response
		try {
			response = await fetch(
				new URL(`/api/schedules/${requestShareToken}`, apiBaseUrl),
				{
					signal: controller.signal,
				},
			)
		} catch (error) {
			if (requestShareToken !== (currentShareToken?.trim() ?? '')) {
				return null
			}
			if (error instanceof DOMException && error.name === 'AbortError') {
				throw new Error('Loading schedule timed out. Please try again.')
			}
			throw error
		} finally {
			window.clearTimeout(timeoutId)
		}
		const payload = (await response.json().catch(() => null)) as {
			ok?: boolean
			snapshot?: ScheduleSnapshot
			error?: string
		} | null
		if (requestShareToken !== (currentShareToken?.trim() ?? '')) {
			return payload
		}
		if (!response.ok || !payload?.ok || !payload.snapshot) {
			throw new Error(
				typeof payload?.error === 'string'
					? payload.error
					: `Request failed (${response.status})`,
			)
		}
		setSnapshot(payload.snapshot)
		return payload
	}

	async function submitAvailability() {
		const token = currentShareToken?.trim() ?? ''
		if (!token) {
			throw new Error(
				'Share token was not provided. Re-open with open_schedule_ui and pass shareToken.',
			)
		}
		const attendeeName = attendeeNameInput.value.trim()
		if (!attendeeName) {
			throw new Error('Attendee name is required.')
		}

		const response = await fetch(
			new URL(`/api/schedules/${token}/availability`, apiBaseUrl),
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: attendeeName,
					attendeeTimeZone: getBrowserTimeZone(),
					selectedSlots: Array.from(selectedSlots).sort((left, right) =>
						left.localeCompare(right),
					),
				}),
			},
		)
		const payload = (await response.json().catch(() => null)) as {
			ok?: boolean
			snapshot?: ScheduleSnapshot
			error?: string
		} | null
		if (!response.ok || !payload?.ok) {
			throw new Error(
				typeof payload?.error === 'string'
					? payload.error
					: `Request failed (${response.status})`,
			)
		}
		if (payload.snapshot) {
			setSnapshot(payload.snapshot)
		} else {
			await fetchSnapshot()
		}
		return payload
	}

	async function withOutput(
		label: string,
		fn: () => Promise<unknown>,
		options: { hostMessage?: string; successMessage?: string } = {},
	) {
		setStatus(`${label}...`)
		try {
			const result = await fn()
			setStatus(options.successMessage ?? `${label} complete.`)
			if (options.hostMessage) {
				void hostBridge.sendUserMessageWithFallback(options.hostMessage)
			}
			return result
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unexpected widget failure.'
			setStatus(message, true)
			return null
		}
	}

	function maybeApplyToolInput(params: {
		shareToken: string | null
		attendeeName: string | null
	}) {
		if (params.attendeeName && !attendeeNameInput.value.trim()) {
			attendeeNameInput.value = params.attendeeName
		}
		if (!params.shareToken) return

		const changedShareToken = applyShareToken(params.shareToken)
		if (changedShareToken || !snapshot) {
			void withOutput('Loading schedule', fetchSnapshot, {
				successMessage: 'Schedule loaded.',
			})
		}
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

	attendeeNameInput.addEventListener('input', () => {
		if (!snapshot) return
		resetSelectionForAttendee(true)
		renderGrid()
		renderSlotDetails()
		setStatus('Loaded saved availability for this attendee.')
	})

	gridHostElement.addEventListener('click', (event) => {
		const target = event.target
		if (!(target instanceof Element)) return
		const slotButton = target.closest<HTMLButtonElement>('button[data-slot]')
		if (!slotButton || !snapshot) return

		const slot = slotButton.dataset.slot
		if (!slot) return
		activeSlot = slot
		if (!attendeeNameInput.value.trim()) {
			setStatus('Enter your name before editing availability.', true)
			updateActiveSlotStyles()
			renderSlotDetails()
			return
		}

		if (selectedSlots.has(slot)) {
			selectedSlots.delete(slot)
		} else {
			selectedSlots.add(slot)
		}
		setStatus('Local changes pending. Save availability to sync.')
		renderGrid()
		renderSlotDetails()
	})

	gridHostElement.addEventListener('focusin', (event) => {
		const target = event.target
		if (!(target instanceof Element)) return
		const slotButton = target.closest<HTMLButtonElement>('button[data-slot]')
		if (!slotButton) return
		const slot = slotButton.dataset.slot
		if (!slot) return
		activeSlot = slot
		updateActiveSlotStyles()
		renderSlotDetails()
	})

	fullscreenToggleButton?.addEventListener('click', () => {
		void withOutput('Updating display mode', toggleFullscreenMode)
	})

	rootElement
		.querySelector('[data-action="submit"]')
		?.addEventListener('click', () => {
			void withOutput('Saving availability', submitAvailability, {
				successMessage: 'Availability saved.',
				hostMessage: 'Saved attendee availability from MCP app schedule grid.',
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
	updateSelectionSummary()
	setStatus('Waiting for share token input.')
	const openAiBridge = (
		window as Window & {
			openai?: unknown
		}
	).openai
	maybeApplyToolInput(extractScheduleToolInput(openAiBridge))
	const widgetUrl = new URL(window.location.href)
	maybeApplyToolInput({
		shareToken: readNonEmptyString(widgetUrl.searchParams.get('shareToken')),
		attendeeName: readNonEmptyString(
			widgetUrl.searchParams.get('attendeeName') ??
				widgetUrl.searchParams.get('name'),
		),
	})
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupScheduleWidget, {
		once: true,
	})
} else {
	setupScheduleWidget()
}
