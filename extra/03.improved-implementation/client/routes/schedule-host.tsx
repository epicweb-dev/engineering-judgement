import { type Handle } from 'remix/component'
import { getBrowserTimeZone } from '#client/browser-time-zone.ts'
import { setDocumentTitle, toAppTitle } from '#client/document-title.ts'
import { renderScheduleGrid } from '#client/components/schedule-grid.tsx'
import { createPointerDragSelectionController } from '#client/pointer-drag-selection.ts'
import {
	createSlotRangeFromDateInputs,
	formatDateInputValue,
	formatSlotLabel,
	formatSlotForAttendeeTimeZone,
	formatSlotRangeForAttendeeTimeZone,
	getRectangularSlotSelection,
	toDayKey,
} from '#client/schedule-utils.ts'
import {
	detectTapRangeMode,
	getTapRangeStartMessage,
	isTapRangeStartMessage,
	resolveTapRangeModeFromPointer,
} from '#client/tap-range-mode.ts'
import { visuallyHiddenCss } from '#client/styles/visually-hidden.ts'
import { normalizeName, type ScheduleSnapshot } from '#shared/schedule-store.ts'
import {
	breakpoints,
	colors,
	mq,
	radius,
	shadows,
	spacing,
	typography,
} from '#client/styles/tokens.ts'

type ConnectionState = 'connecting' | 'live' | 'offline'
const previewHoverTooltipPointerXVar = '--preview-hover-tooltip-pointer-x'
const previewHoverTooltipPointerYVar = '--preview-hover-tooltip-pointer-y'
const namePillMinHeight = '2.125rem'
const namePillPaddingInline = `calc(${spacing.sm} + 4px)`
let namePillMeasureElement: HTMLSpanElement | null = null

function getNamePillBaseStyles(params: {
	isIncluded: boolean
	widthPx: number
}) {
	return {
		width: `${params.widthPx}px`,
		maxWidth: '100%',
		minHeight: namePillMinHeight,
		padding: `${spacing.xs} ${namePillPaddingInline}`,
		borderRadius: radius.full,
		border: `1px solid ${colors.border}`,
		backgroundColor: params.isIncluded ? colors.surface : colors.background,
		color: colors.text,
		fontFamily: typography.fontFamily,
		fontSize: typography.fontSize.base,
		fontWeight: typography.fontWeight.normal,
		lineHeight: 1.5,
		whiteSpace: 'nowrap',
		textDecoration: params.isIncluded ? 'none' : 'line-through',
		boxSizing: 'border-box',
	}
}

function getNamePillMeasureElement() {
	if (typeof document === 'undefined') return null
	if (
		namePillMeasureElement &&
		document.body.contains(namePillMeasureElement)
	) {
		return namePillMeasureElement
	}
	const element = document.createElement('span')
	element.setAttribute('aria-hidden', 'true')
	element.style.position = 'absolute'
	element.style.left = '-9999px'
	element.style.top = '-9999px'
	element.style.visibility = 'hidden'
	element.style.pointerEvents = 'none'
	element.style.display = 'inline-flex'
	element.style.alignItems = 'center'
	element.style.minHeight = namePillMinHeight
	element.style.padding = `${spacing.xs} ${namePillPaddingInline}`
	element.style.border = `1px solid transparent`
	element.style.borderRadius = radius.full
	element.style.fontFamily = typography.fontFamily
	element.style.fontSize = typography.fontSize.base
	element.style.fontWeight = typography.fontWeight.normal
	element.style.lineHeight = '1.5'
	element.style.whiteSpace = 'nowrap'
	element.style.boxSizing = 'border-box'
	document.body.appendChild(element)
	namePillMeasureElement = element
	return namePillMeasureElement
}

function measureNamePillWidthPx(text: string) {
	const fallback = Math.ceil(Math.max(1, text.length) * 9.2)
	const element = getNamePillMeasureElement()
	if (!element) return fallback
	// Preserve typed spaces (including trailing spaces) when measuring width.
	element.textContent = (text || ' ').replaceAll(' ', '\u00A0')
	return Math.ceil(element.getBoundingClientRect().width)
}

function parseHostRouteParams(pathname: string) {
	const segments = pathname.split('/').filter(Boolean)
	if (segments.length !== 3) return null
	if (segments[0] !== 's') return null
	let shareToken = ''
	let hostAccessToken = ''
	try {
		shareToken = decodeURIComponent(segments[1] ?? '').trim()
		hostAccessToken = decodeURIComponent(segments[2] ?? '').trim()
	} catch {
		return null
	}
	if (!shareToken || !hostAccessToken) return null
	return { shareToken, hostAccessToken }
}

function getPathname() {
	if (typeof window === 'undefined') return '/'
	return window.location.pathname
}

function isMobileViewport() {
	if (typeof window === 'undefined') return false
	if (typeof window.matchMedia !== 'function') return false
	return window.matchMedia(`(max-width: ${breakpoints.mobile})`).matches
}

function toWebSocketUrl(path: string) {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
	return `${protocol}//${window.location.host}${path}`
}

function toSet(values: Array<string>) {
	return new Set(values)
}

function areSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>) {
	if (left.size !== right.size) return false
	for (const value of left) {
		if (!right.has(value)) return false
	}
	return true
}

function getSnapshotDateRangeInputs(snapshot: ScheduleSnapshot) {
	const startSlot = snapshot.slots[0] ?? null
	const endSlot = snapshot.slots.at(-1) ?? null
	const startDateInput = toDayKey(startSlot)
	const endDateInput = toDayKey(endSlot)
	if (startDateInput && endDateInput) {
		return { startDateInput, endDateInput }
	}
	const rangeStartDate = new Date(snapshot.schedule.rangeStartUtc)
	const rangeEndDate = new Date(snapshot.schedule.rangeEndUtc)
	const inclusiveRangeEndDate = new Date(rangeEndDate.getTime() - 60_000)
	return {
		startDateInput: Number.isNaN(rangeStartDate.getTime())
			? ''
			: formatDateInputValue(rangeStartDate),
		endDateInput: Number.isNaN(rangeEndDate.getTime())
			? ''
			: formatDateInputValue(inclusiveRangeEndDate),
	}
}

const previewTapRangeStartMessage =
	'Range start selected. Tap another slot to choose range.'

function isPreviewTapRangeStartMessage(message: string | null) {
	return message === previewTapRangeStartMessage
}

function toRangeEndSlotExclusive(slot: string, intervalMinutes: number) {
	const slotMs = Date.parse(slot)
	if (Number.isNaN(slotMs)) return null
	return new Date(slotMs + intervalMinutes * 60_000).toISOString()
}

function buildAvailabilityRangeSummary(params: {
	selectionSlotsSorted: Array<string>
	intervalMinutes: number
	availableSlots: ReadonlySet<string>
	timeZone: string | null
}) {
	type Segment = {
		startSlot: string
		endSlot: string
		startMs: number
		endMs: number
		isAvailable: boolean
	}
	const segments: Array<Segment> = []
	const intervalMs = params.intervalMinutes * 60_000
	let activeSegment: Segment | null = null
	for (const slot of params.selectionSlotsSorted) {
		const slotMs = Date.parse(slot)
		if (Number.isNaN(slotMs)) continue
		const isAvailable = params.availableSlots.has(slot)
		if (!activeSegment) {
			activeSegment = {
				startSlot: slot,
				endSlot: slot,
				startMs: slotMs,
				endMs: slotMs,
				isAvailable,
			}
			continue
		}
		const isConsecutive = slotMs - activeSegment.endMs === intervalMs
		if (activeSegment.isAvailable === isAvailable && isConsecutive) {
			activeSegment.endSlot = slot
			activeSegment.endMs = slotMs
			continue
		}
		segments.push(activeSegment)
		activeSegment = {
			startSlot: slot,
			endSlot: slot,
			startMs: slotMs,
			endMs: slotMs,
			isAvailable,
		}
	}
	if (activeSegment) segments.push(activeSegment)
	return segments.map((segment) => {
		const rangeEndSlotExclusive = toRangeEndSlotExclusive(
			segment.endSlot,
			params.intervalMinutes,
		)
		const localRange = rangeEndSlotExclusive
			? formatSlotRangeForAttendeeTimeZone({
					rangeStartSlot: segment.startSlot,
					rangeEndSlotExclusive,
					timeZone: params.timeZone,
				})
			: {
					localRange: 'Local time unknown',
					timeZoneLabel: params.timeZone ?? 'timezone unknown',
				}
		return {
			startSlot: segment.startSlot,
			isAvailable: segment.isAvailable,
			localRangeText: localRange.localRange,
			timeZoneLabel: localRange.timeZoneLabel,
		}
	})
}
function buildEmptyAvailability(slots: Array<string>) {
	return Object.fromEntries(
		slots.map((slot) => [
			slot,
			{ count: 0, availableNames: [] as Array<string> },
		]),
	)
}

function getHostAttendeeName(snapshot: ScheduleSnapshot | null) {
	if (!snapshot) return ''
	const hostAttendee = snapshot.attendees.find((attendee) => attendee.isHost)
	return hostAttendee?.name ?? ''
}

function renderCopyIcon() {
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			width="14"
			height="14"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	)
}

function renderHighlightIcon() {
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			width="14"
			height="14"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 3 14.6 9l6.4.5-4.9 4.1 1.5 6.2-5.6-3.3-5.6 3.3 1.5-6.2L3 9.5 9.4 9z" />
		</svg>
	)
}

function renderVisibleIcon() {
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			width="14"
			height="14"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	)
}

function renderHiddenIcon() {
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			width="14"
			height="14"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M3 3 21 21" />
			<path d="M10.6 10.7a3 3 0 0 0 4.2 4.2" />
			<path d="M9.9 4.2A11.6 11.6 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-4.2 5.1" />
			<path d="M6.6 6.7A21.7 21.7 0 0 0 1 12s4 8 11 8a10.9 10.9 0 0 0 5.1-1.2" />
		</svg>
	)
}

function renderTrashIcon() {
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			width="14"
			height="14"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M3 6h18" />
			<path d="M8 6V4h8v2" />
			<path d="M19 6l-1 14H6L5 6" />
			<path d="M10 11v6" />
			<path d="M14 11v6" />
		</svg>
	)
}

function renderHostIcon() {
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			width="14"
			height="14"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M4 7.5 8 12l4-5 4 5 4-4.5V19H4z" />
			<path d="M8 16h8" />
		</svg>
	)
}

function copyTextWithFallback(text: string) {
	if (typeof document === 'undefined') return false
	const textarea = document.createElement('textarea')
	textarea.value = text
	textarea.setAttribute('readonly', 'true')
	textarea.style.position = 'absolute'
	textarea.style.left = '-9999px'
	document.body.appendChild(textarea)
	textarea.select()
	let copied = false
	try {
		copied = document.execCommand('copy')
	} catch {
		copied = false
	}
	document.body.removeChild(textarea)
	return copied
}

function focusSubmissionEditInput(
	attendeeId: string,
	options?: { selectAll?: boolean },
) {
	if (typeof document === 'undefined') return
	setTimeout(() => {
		const input = document.querySelector(
			`input[data-submission-edit-input="${attendeeId}"]`,
		)
		if (!(input instanceof HTMLInputElement)) return
		input.focus()
		if (options?.selectAll) {
			input.select()
		}
	}, 0)
}

function focusSubmissionEditButton(attendeeId: string) {
	if (typeof document === 'undefined') return
	setTimeout(() => {
		const button = document.querySelector(
			`button[data-submission-name-button="${attendeeId}"]`,
		)
		if (!(button instanceof HTMLButtonElement)) return
		button.focus()
	}, 0)
}

export function ScheduleHostRoute(handle: Handle) {
	const browserTimeZone = getBrowserTimeZone()
	let shareToken = ''
	let hostAccessToken = ''
	let snapshot: ScheduleSnapshot | null = null
	let hostNameDraft = ''
	let titleDraft = ''
	let rangeStartDateInput = ''
	let rangeEndDateInput = ''
	let blockedSlots = new Set<string>()
	let persistedBlockedSlots = new Set<string>()
	let excludedAttendeeIds = new Set<string>()
	let submissionNameDraftById = new Map<string, string>()
	let submissionActionById = new Map<string, 'rename' | 'delete'>()
	let submissionErrorById = new Map<string, string>()
	let editingSubmissionId: string | null = null
	let focusedPreviewAttendeeId: string | null = null
	let deleteConfirmationAttendeeId: string | null = null
	let activePreviewSlot: string | null = null
	let previewHoverTooltipSlot: string | null = null
	let previewHoverTooltipPointerX: number | null = null
	let previewHoverTooltipPointerY: number | null = null
	let previewSelectedSlots = new Set<string>()
	let previewRangeAnchor: string | null = null
	let usePreviewTapRangeMode = detectTapRangeMode()
	let previewSelectionStatus: string | null = null
	let hostTapRangeAnchor: string | null = null
	let hostTapRangeAction: 'add' | 'remove' | null = null
	let useHostTapRangeMode = detectTapRangeMode()
	let hostTapRangeSelectionStatus: string | null = null
	let onMobileViewport = isMobileViewport()
	let mobileDayKey: string | null = null
	let keyboardRangeAnchor: string | null = null
	let keyboardRangeAction: 'add' | 'remove' | null = null
	let keyboardRangeSlots = new Set<string>()
	let isLoading = true
	let isSaving = false
	let pendingSave = false
	let connectionState: ConnectionState = 'connecting'
	let socket: WebSocket | null = null
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null
	let changeVersion = 0
	let statusMessage: string | null = null
	let statusError = false
	let clipboardMessage: string | null = null
	let clipboardError = false
	let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
	let clipboardMessageTimer: ReturnType<typeof setTimeout> | null = null
	let refreshTimer: ReturnType<typeof setInterval> | null = null
	let cleanupMobileViewportListener: (() => void) | null = null
	let lastPathname = ''
	let snapshotRequestId = 0
	const saveDebounceMs = 600
	const refreshIntervalMs = 5000
	const reconnectDelayMs = 1800

	function hasLocalRangeChanges(currentSnapshot: ScheduleSnapshot) {
		const snapshotDateRange = getSnapshotDateRangeInputs(currentSnapshot)
		return (
			rangeStartDateInput !== snapshotDateRange.startDateInput ||
			rangeEndDateInput !== snapshotDateRange.endDateInput
		)
	}

	function getDraftRangeFromDateInputs(currentSnapshot: ScheduleSnapshot) {
		return createSlotRangeFromDateInputs({
			startDateInput: rangeStartDateInput,
			endDateInput: rangeEndDateInput,
			intervalMinutes: currentSnapshot.schedule.intervalMinutes,
		})
	}

	function getRangeValidationError(currentSnapshot: ScheduleSnapshot) {
		try {
			getDraftRangeFromDateInputs(currentSnapshot)
			return null
		} catch (error) {
			return error instanceof Error ? error.message : 'Invalid date range.'
		}
	}

	function setStatus(message: string | null, error = false) {
		statusMessage = message
		statusError = error
		handle.update()
	}

	function clearSaveDebounceTimer() {
		if (!saveDebounceTimer) return
		clearTimeout(saveDebounceTimer)
		saveDebounceTimer = null
	}

	function clearClipboardMessageTimer() {
		if (!clipboardMessageTimer) return
		clearTimeout(clipboardMessageTimer)
		clipboardMessageTimer = null
	}

	function clearRefreshTimer() {
		if (!refreshTimer) return
		clearInterval(refreshTimer)
		refreshTimer = null
	}

	function clearMobileViewportListener() {
		if (!cleanupMobileViewportListener) return
		cleanupMobileViewportListener()
		cleanupMobileViewportListener = null
	}

	function setupMobileViewportListener() {
		clearMobileViewportListener()
		if (typeof window === 'undefined') return
		if (typeof window.matchMedia !== 'function') return
		const mediaQuery = window.matchMedia(`(max-width: ${breakpoints.mobile})`)
		onMobileViewport = mediaQuery.matches
		const handleChange = () => {
			const nextIsMobile = mediaQuery.matches
			if (onMobileViewport === nextIsMobile) return
			onMobileViewport = nextIsMobile
			handle.update()
		}
		if (typeof mediaQuery.addEventListener === 'function') {
			mediaQuery.addEventListener('change', handleChange)
			cleanupMobileViewportListener = () => {
				mediaQuery.removeEventListener('change', handleChange)
			}
			return
		}
		mediaQuery.addListener(handleChange)
		cleanupMobileViewportListener = () => {
			mediaQuery.removeListener(handleChange)
		}
	}

	function clearReconnectTimer() {
		if (!reconnectTimer) return
		clearTimeout(reconnectTimer)
		reconnectTimer = null
	}

	function clearKeyboardRangeSelection() {
		keyboardRangeAnchor = null
		keyboardRangeAction = null
		keyboardRangeSlots = new Set<string>()
	}

	function clearHostTapRangeSelection() {
		hostTapRangeAnchor = null
		hostTapRangeAction = null
		hostTapRangeSelectionStatus = null
	}

	function setDeleteConfirmationAttendee(nextAttendeeId: string | null) {
		if (deleteConfirmationAttendeeId === nextAttendeeId) return
		deleteConfirmationAttendeeId = nextAttendeeId
		handle.update()
	}

	function setPreviewHoverTooltipPointerPosition(
		clientX: number,
		clientY: number,
	) {
		if (typeof document === 'undefined') return
		if (
			previewHoverTooltipPointerX === clientX &&
			previewHoverTooltipPointerY === clientY
		) {
			return
		}
		previewHoverTooltipPointerX = clientX
		previewHoverTooltipPointerY = clientY
		const rootStyle = document.documentElement.style
		rootStyle.setProperty(previewHoverTooltipPointerXVar, `${clientX}px`)
		rootStyle.setProperty(previewHoverTooltipPointerYVar, `${clientY}px`)
	}

	function clearPreviewHoverTooltipPointerPosition() {
		previewHoverTooltipPointerX = null
		previewHoverTooltipPointerY = null
		if (typeof document === 'undefined') return
		const rootStyle = document.documentElement.style
		rootStyle.removeProperty(previewHoverTooltipPointerXVar)
		rootStyle.removeProperty(previewHoverTooltipPointerYVar)
	}

	function clearPreviewHoverTooltip() {
		const didChange =
			previewHoverTooltipSlot !== null ||
			previewHoverTooltipPointerX !== null ||
			previewHoverTooltipPointerY !== null
		previewHoverTooltipSlot = null
		clearPreviewHoverTooltipPointerPosition()
		return didChange
	}
	const hostSelection = createPointerDragSelectionController({
		requestRender: () => {
			handle.update()
		},
		getSelectionSlots: (startSlot, endSlot) => {
			if (!snapshot) return new Set<string>()
			return new Set(
				getRectangularSlotSelection({
					slots: snapshot.slots,
					startSlot,
					endSlot,
				}),
			)
		},
		applySelection: ({ mode, slots }) => {
			const shouldBeBlocked = mode === 'add'
			let changed = false
			for (const slot of slots) {
				const didChange = setBlockedSlotState(slot, shouldBeBlocked)
				changed = changed || didChange
			}
			return changed
		},
	})

	const previewSelection = createPointerDragSelectionController({
		requestRender: () => {
			handle.update()
		},
		canUpdateSelection: () => !usePreviewTapRangeMode,
		getSelectionSlots: (startSlot, endSlot) =>
			getPreviewSelectionSlots(startSlot, endSlot),
		applySelection: ({ slots }) => {
			const nextSelection = new Set(slots)
			if (areSetsEqual(previewSelectedSlots, nextSelection)) return false
			previewSelectedSlots = nextSelection
			previewRangeAnchor = null
			previewSelectionStatus = null
			return true
		},
		onSelectionPreviewSlot: (slot) => {
			activePreviewSlot = slot
		},
	})

	function clearSocketResources() {
		clearReconnectTimer()
		const currentSocket = socket
		socket = null
		if (
			currentSocket &&
			(currentSocket.readyState === WebSocket.CONNECTING ||
				currentSocket.readyState === WebSocket.OPEN)
		) {
			currentSocket.close()
		}
	}

	function cleanupResources() {
		clearSaveDebounceTimer()
		clearClipboardMessageTimer()
		clearMobileViewportListener()
		clearKeyboardRangeSelection()
		clearHostTapRangeSelection()
		clearPreviewHoverTooltip()
		hostSelection.cleanup()
		previewSelection.cleanup()
		clearSocketResources()
		clearRefreshTimer()
		pendingSave = false
	}

	function setConnectionState(nextState: ConnectionState) {
		connectionState = nextState
		if (nextState === 'offline') {
			if (!refreshTimer) {
				refreshTimer = setInterval(() => {
					void loadSnapshot()
				}, refreshIntervalMs)
			}
		} else {
			clearRefreshTimer()
		}
		handle.update()
	}

	function setClipboardStatus(nextMessage: string | null, error = false) {
		clipboardMessage = nextMessage
		clipboardError = error
		clearClipboardMessageTimer()
		if (nextMessage) {
			clipboardMessageTimer = setTimeout(() => {
				clipboardMessage = null
				clipboardError = false
				handle.update()
			}, 2200)
		}
		handle.update()
	}

	async function copyValueToClipboard(label: string, value: string) {
		const normalized = value.trim()
		if (!normalized) {
			setClipboardStatus(`Unable to copy ${label.toLowerCase()}.`, true)
			return
		}
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(normalized)
				setClipboardStatus(`${label} copied.`)
				return
			}
			const copied = copyTextWithFallback(normalized)
			if (copied) {
				setClipboardStatus(`${label} copied.`)
				return
			}
			setClipboardStatus(`Unable to copy ${label.toLowerCase()}.`, true)
		} catch {
			const copied = copyTextWithFallback(normalized)
			if (copied) {
				setClipboardStatus(`${label} copied.`)
				return
			}
			setClipboardStatus(`Unable to copy ${label.toLowerCase()}.`, true)
		}
	}

	if (handle.signal.aborted) {
		cleanupResources()
	} else {
		setupMobileViewportListener()
		handle.signal.addEventListener('abort', cleanupResources)
	}

	function hasLocalHostChanges() {
		if (!snapshot) return false
		const rangeChanged = hasLocalRangeChanges(snapshot)
		return hasLocalNonRangeChanges(snapshot) || rangeChanged
	}

	function hasLocalNonRangeChanges(currentSnapshot: ScheduleSnapshot) {
		const hostNameChanged =
			normalizeName(hostNameDraft) !==
			normalizeName(getHostAttendeeName(currentSnapshot))
		const titleChanged =
			titleDraft.trim() !== currentSnapshot.schedule.title.trim()
		const blockedChanged = !areSetsEqual(blockedSlots, persistedBlockedSlots)
		return hostNameChanged || titleChanged || blockedChanged
	}

	function applySnapshot(
		nextSnapshot: ScheduleSnapshot,
		options?: { preserveHostDrafts?: boolean },
	) {
		const preserveHostDrafts = options?.preserveHostDrafts ?? false
		const previousSnapshot = snapshot
		const previousAttendeeNameById = new Map(
			(previousSnapshot?.attendees ?? []).map((attendee) => [
				attendee.id,
				attendee.name,
			]),
		)
		const currentHostName = getHostAttendeeName(previousSnapshot)
		const keepLocalHostName =
			preserveHostDrafts ||
			(!!previousSnapshot &&
				normalizeName(hostNameDraft) !== normalizeName(currentHostName))
		const keepLocalTitle =
			preserveHostDrafts ||
			(!!previousSnapshot &&
				titleDraft.trim() !== previousSnapshot.schedule.title.trim())
		const keepLocalBlocked =
			preserveHostDrafts ||
			(!!previousSnapshot && !areSetsEqual(blockedSlots, persistedBlockedSlots))
		const keepLocalRange =
			preserveHostDrafts ||
			(!!previousSnapshot && hasLocalRangeChanges(previousSnapshot))
		const nextBlockedSlots = toSet(nextSnapshot.blockedSlots)
		const nextDateRange = getSnapshotDateRangeInputs(nextSnapshot)
		snapshot = nextSnapshot
		persistedBlockedSlots = new Set(nextBlockedSlots)
		if (!keepLocalHostName) {
			hostNameDraft = getHostAttendeeName(nextSnapshot)
		}
		if (!keepLocalTitle) {
			titleDraft = nextSnapshot.schedule.title
		}
		if (!keepLocalBlocked) {
			blockedSlots = new Set(nextBlockedSlots)
		}
		if (!keepLocalRange) {
			rangeStartDateInput = nextDateRange.startDateInput
			rangeEndDateInput = nextDateRange.endDateInput
		}
		const validAttendeeIds = new Set(
			nextSnapshot.attendees.map((entry) => entry.id),
		)
		const editableAttendeeIds = new Set(
			nextSnapshot.attendees
				.filter((attendee) => !attendee.isHost)
				.map((attendee) => attendee.id),
		)
		const nextDayKeys = Array.from(
			new Set(
				nextSnapshot.slots
					.map((slot) => toDayKey(slot))
					.filter((value): value is string => value !== null),
			),
		)
		if (!mobileDayKey || !nextDayKeys.includes(mobileDayKey)) {
			mobileDayKey = nextDayKeys[0] ?? null
		}
		excludedAttendeeIds = new Set(
			Array.from(excludedAttendeeIds).filter((id) => validAttendeeIds.has(id)),
		)
		if (
			focusedPreviewAttendeeId &&
			!validAttendeeIds.has(focusedPreviewAttendeeId)
		) {
			focusedPreviewAttendeeId = null
		}
		const nextSubmissionNameDraftById = new Map<string, string>()
		for (const attendee of nextSnapshot.attendees) {
			if (attendee.isHost) continue
			const previousName = previousAttendeeNameById.get(attendee.id)
			const existingDraft = submissionNameDraftById.get(attendee.id)
			const shouldKeepDraft =
				typeof previousName === 'string' &&
				typeof existingDraft === 'string' &&
				existingDraft !== previousName
			nextSubmissionNameDraftById.set(
				attendee.id,
				shouldKeepDraft ? existingDraft : attendee.name,
			)
		}
		submissionNameDraftById = nextSubmissionNameDraftById
		submissionErrorById = new Map(
			Array.from(submissionErrorById).filter(([id]) =>
				validAttendeeIds.has(id),
			),
		)
		if (editingSubmissionId && !validAttendeeIds.has(editingSubmissionId)) {
			editingSubmissionId = null
		}
		if (
			deleteConfirmationAttendeeId &&
			!editableAttendeeIds.has(deleteConfirmationAttendeeId)
		) {
			deleteConfirmationAttendeeId = null
		}
		if (activePreviewSlot && !nextSnapshot.slots.includes(activePreviewSlot)) {
			activePreviewSlot = null
		}
		if (
			hostTapRangeAnchor &&
			!nextSnapshot.slots.includes(hostTapRangeAnchor)
		) {
			clearHostTapRangeSelection()
		}
		if (
			previewHoverTooltipSlot &&
			!nextSnapshot.slots.includes(previewHoverTooltipSlot)
		) {
			previewHoverTooltipSlot = null
			clearPreviewHoverTooltipPointerPosition()
		}
		if (
			keyboardRangeAnchor &&
			!nextSnapshot.slots.includes(keyboardRangeAnchor)
		) {
			clearKeyboardRangeSelection()
		} else if (keyboardRangeSlots.size > 0) {
			keyboardRangeSlots = new Set(
				Array.from(keyboardRangeSlots).filter((slot) =>
					nextSnapshot.slots.includes(slot),
				),
			)
			if (keyboardRangeSlots.size === 0) {
				clearKeyboardRangeSelection()
			}
		}
		const selectablePreviewSlots = new Set(
			nextSnapshot.slots.filter((slot) => !blockedSlots.has(slot)),
		)
		previewSelectedSlots = new Set(
			Array.from(previewSelectedSlots).filter((slot) =>
				selectablePreviewSlots.has(slot),
			),
		)
		if (previewRangeAnchor && !selectablePreviewSlots.has(previewRangeAnchor)) {
			previewRangeAnchor = null
			previewSelectionStatus = null
		}
		if (previewSelectedSlots.size === 0) {
			previewRangeAnchor = null
			if (isPreviewTapRangeStartMessage(previewSelectionStatus)) {
				previewSelectionStatus = null
			}
		}
		handle.update()
	}

	async function loadSnapshot() {
		const requestShareToken = shareToken
		const requestHostAccessToken = hostAccessToken
		if (
			!requestShareToken ||
			!requestHostAccessToken ||
			handle.signal.aborted
		) {
			return
		}
		const requestId = ++snapshotRequestId
		try {
			const response = await fetch(
				`/api/schedules/${requestShareToken}/host-snapshot`,
				{
					headers: {
						Accept: 'application/json',
						'X-Host-Token': requestHostAccessToken,
					},
				},
			)
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				snapshot?: ScheduleSnapshot
				error?: string
			} | null
			if (
				requestShareToken !== shareToken ||
				handle.signal.aborted ||
				requestId !== snapshotRequestId
			) {
				return
			}
			if (!response.ok || !payload?.ok || !payload.snapshot) {
				const errorText =
					typeof payload?.error === 'string'
						? payload.error
						: response.status === 401 || response.status === 403
							? 'Invalid host dashboard link.'
							: 'Unable to load host dashboard.'
				setStatus(errorText, true)
				isLoading = false
				handle.update()
				return
			}
			applySnapshot(payload.snapshot)
			isLoading = false
			handle.update()
		} catch {
			if (
				requestShareToken !== shareToken ||
				handle.signal.aborted ||
				requestId !== snapshotRequestId
			) {
				return
			}
			isLoading = false
			setStatus('Unable to load host dashboard.', true)
		}
	}

	function connectSocket() {
		if (!shareToken || handle.signal.aborted) return
		clearSocketResources()
		setConnectionState('connecting')
		try {
			const ws = new WebSocket(toWebSocketUrl(`/ws/${shareToken}`))
			socket = ws
			ws.onopen = () => {
				if (socket !== ws || handle.signal.aborted) return
				setConnectionState('live')
			}
			ws.onmessage = (event) => {
				if (socket !== ws || handle.signal.aborted) return
				try {
					const payload = JSON.parse(String(event.data)) as {
						type?: string
					} | null
					if (payload?.type === 'schedule-updated') {
						void loadSnapshot()
					}
				} catch {
					return
				}
			}
			ws.onerror = () => {
				if (socket !== ws || handle.signal.aborted) return
				setConnectionState('offline')
			}
			ws.onclose = () => {
				if (socket !== ws || handle.signal.aborted) return
				setConnectionState('offline')
				reconnectTimer = setTimeout(() => {
					if (socket !== ws) return
					connectSocket()
				}, reconnectDelayMs)
			}
		} catch {
			setConnectionState('offline')
		}
	}

	async function saveHostSettings() {
		const requestShareToken = shareToken
		const currentSnapshot = snapshot
		if (!requestShareToken || !currentSnapshot) return
		if (handle.signal.aborted) return
		if (isSaving) {
			pendingSave = true
			return
		}
		const requestHostAccessToken = hostAccessToken
		if (!requestHostAccessToken) {
			setStatus('Host access token missing.', true)
			return
		}
		const hostName = normalizeName(hostNameDraft)
		if (!hostName) {
			setStatus('Host name is required.', true)
			return
		}
		const shouldUpdateRange = hasLocalRangeChanges(currentSnapshot)
		const hasNonRangeChanges = hasLocalNonRangeChanges(currentSnapshot)
		let nextRangeStartUtc = ''
		let nextRangeEndUtc = ''
		let rangeValidationError: string | null = null
		let shouldIncludeRange = false
		if (shouldUpdateRange) {
			try {
				const rangeDraft = getDraftRangeFromDateInputs(currentSnapshot)
				nextRangeStartUtc = rangeDraft.rangeStartUtc
				nextRangeEndUtc = rangeDraft.rangeEndUtc
				shouldIncludeRange = true
			} catch (error) {
				rangeValidationError =
					error instanceof Error ? error.message : 'Invalid date range.'
				setStatus(rangeValidationError, true)
				if (!hasNonRangeChanges) {
					return
				}
			}
		}
		const saveVersion = changeVersion
		const title = titleDraft.trim() || 'New schedule'
		const sortedBlockedSlots = Array.from(blockedSlots).sort((left, right) =>
			left.localeCompare(right),
		)
		let shouldRetryAfterFailure = false
		isSaving = true
		handle.update()
		try {
			const body: {
				hostName: string
				title: string
				blockedSlots: Array<string>
				rangeStartUtc?: string
				rangeEndUtc?: string
			} = {
				hostName,
				title,
				blockedSlots: sortedBlockedSlots,
			}
			if (shouldIncludeRange) {
				body.rangeStartUtc = nextRangeStartUtc
				body.rangeEndUtc = nextRangeEndUtc
			}
			const response = await fetch(`/api/schedules/${requestShareToken}/host`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Host-Token': requestHostAccessToken,
				},
				body: JSON.stringify(body),
			})
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				snapshot?: ScheduleSnapshot
				error?: string
			} | null
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			if (!response.ok || !payload?.ok || !payload.snapshot) {
				shouldRetryAfterFailure = response.status >= 500
				const errorText =
					typeof payload?.error === 'string'
						? payload.error
						: 'Unable to save host dashboard changes.'
				setStatus(errorText, true)
				return
			}
			const hadQueuedLocalChanges = pendingSave
			const shouldPreserveHostDrafts =
				hadQueuedLocalChanges || saveVersion !== changeVersion
			applySnapshot(payload.snapshot, {
				preserveHostDrafts: shouldPreserveHostDrafts,
			})
			if (!rangeValidationError) {
				setStatus('Host settings synced.')
			}
			handle.update()
		} catch {
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			shouldRetryAfterFailure = true
			setStatus('Network error while saving host settings.', true)
		} finally {
			if (requestShareToken === shareToken && !handle.signal.aborted) {
				isSaving = false
				handle.update()
				const shouldReschedule =
					hasLocalHostChanges() && (pendingSave || shouldRetryAfterFailure)
				pendingSave = false
				if (shouldReschedule) {
					queueHostSettingsSave()
				}
			} else {
				pendingSave = false
			}
		}
	}

	async function renameSubmission(
		attendeeId: string,
		nextSubmissionName: string,
	) {
		const requestShareToken = shareToken
		if (!requestShareToken || handle.signal.aborted) return
		const requestHostAccessToken = hostAccessToken
		if (!requestHostAccessToken) {
			const errorText = 'Host access token missing.'
			submissionErrorById.set(attendeeId, errorText)
			setStatus(errorText, true)
			handle.update()
			return
		}
		if (!normalizeName(nextSubmissionName)) {
			submissionErrorById.set(attendeeId, 'Submission name is required.')
			handle.update()
			return
		}
		if (submissionActionById.has(attendeeId)) return
		submissionErrorById.delete(attendeeId)
		submissionActionById.set(attendeeId, 'rename')
		handle.update()
		try {
			const response = await fetch(`/api/schedules/${requestShareToken}/host`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Host-Token': requestHostAccessToken,
				},
				body: JSON.stringify({
					submissionId: attendeeId,
					submissionName: nextSubmissionName,
				}),
			})
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				snapshot?: ScheduleSnapshot
				error?: string
			} | null
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			if (!response.ok || !payload?.ok || !payload.snapshot) {
				const errorText =
					typeof payload?.error === 'string'
						? payload.error
						: 'Unable to rename submission.'
				submissionErrorById.set(attendeeId, errorText)
				setStatus(errorText, true)
				return
			}
			applySnapshot(payload.snapshot)
			submissionNameDraftById.set(attendeeId, nextSubmissionName)
			submissionErrorById.delete(attendeeId)
			setStatus('Submission name updated.')
			focusSubmissionEditButton(attendeeId)
		} catch {
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			submissionErrorById.set(
				attendeeId,
				'Network error while renaming submission.',
			)
			setStatus('Network error while renaming submission.', true)
		} finally {
			submissionActionById.delete(attendeeId)
			if (requestShareToken === shareToken && !handle.signal.aborted) {
				handle.update()
			}
		}
	}

	async function deleteSubmission(attendeeId: string) {
		const requestShareToken = shareToken
		if (!requestShareToken || handle.signal.aborted) return
		const requestHostAccessToken = hostAccessToken
		if (!requestHostAccessToken) {
			const errorText = 'Host access token missing.'
			submissionErrorById.set(attendeeId, errorText)
			setStatus(errorText, true)
			handle.update()
			return
		}
		if (submissionActionById.has(attendeeId)) return
		submissionErrorById.delete(attendeeId)
		submissionActionById.set(attendeeId, 'delete')
		handle.update()
		try {
			const response = await fetch(`/api/schedules/${requestShareToken}/host`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Host-Token': requestHostAccessToken,
				},
				body: JSON.stringify({
					submissionId: attendeeId,
					deleteSubmission: true,
				}),
			})
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				snapshot?: ScheduleSnapshot
				error?: string
			} | null
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			if (!response.ok || !payload?.ok || !payload.snapshot) {
				const errorText =
					typeof payload?.error === 'string'
						? payload.error
						: 'Unable to delete submission.'
				submissionErrorById.set(attendeeId, errorText)
				setStatus(errorText, true)
				return
			}
			applySnapshot(payload.snapshot)
			submissionErrorById.delete(attendeeId)
			if (editingSubmissionId === attendeeId) {
				editingSubmissionId = null
			}
			setStatus('Submission deleted.')
		} catch {
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			submissionErrorById.set(
				attendeeId,
				'Network error while deleting submission.',
			)
			setStatus('Network error while deleting submission.', true)
		} finally {
			submissionActionById.delete(attendeeId)
			if (requestShareToken === shareToken && !handle.signal.aborted) {
				handle.update()
			}
		}
	}

	function queueHostSettingsSave() {
		clearSaveDebounceTimer()
		if (handle.signal.aborted) return
		const currentSnapshot = snapshot
		if (!currentSnapshot) return
		const hasRangeChanges = hasLocalRangeChanges(currentSnapshot)
		const hasNonRangeChanges = hasLocalNonRangeChanges(currentSnapshot)
		const rangeValidationError = hasRangeChanges
			? getRangeValidationError(currentSnapshot)
			: null
		if (!hasRangeChanges && !hasNonRangeChanges) return
		if (rangeValidationError && !hasNonRangeChanges) return
		if (isSaving) {
			pendingSave = true
			return
		}
		saveDebounceTimer = setTimeout(() => {
			void saveHostSettings()
		}, saveDebounceMs)
	}

	function setBlockedSlotState(slot: string, shouldBeBlocked: boolean) {
		const currentlyBlocked = blockedSlots.has(slot)
		if (currentlyBlocked === shouldBeBlocked) return false
		if (shouldBeBlocked) {
			blockedSlots.add(slot)
		} else {
			blockedSlots.delete(slot)
		}
		changeVersion += 1
		queueHostSettingsSave()
		return true
	}

	function toggleBlockedSlot(slot: string) {
		const changed = setBlockedSlotState(slot, !blockedSlots.has(slot))
		if (changed) {
			handle.update()
		}
	}

	function applyBlockedSlotRange(
		startSlot: string,
		endSlot: string,
		shouldBeBlocked: boolean,
	) {
		const currentSnapshot = snapshot
		if (!currentSnapshot) return false
		const slotsInRange = getRectangularSlotSelection({
			slots: currentSnapshot.slots,
			startSlot,
			endSlot,
		})
		let changed = false
		for (const slot of slotsInRange) {
			const currentlyBlocked = blockedSlots.has(slot)
			if (currentlyBlocked === shouldBeBlocked) continue
			changed = true
			if (shouldBeBlocked) {
				blockedSlots.add(slot)
			} else {
				blockedSlots.delete(slot)
			}
		}
		if (!changed) return false
		changeVersion += 1
		queueHostSettingsSave()
		return true
	}

	function updateKeyboardRangePreview(params: {
		fromSlot: string
		toSlot: string
		shiftKey: boolean
	}) {
		const currentSnapshot = snapshot
		if (!currentSnapshot) return
		if (!params.shiftKey) {
			if (keyboardRangeAnchor || keyboardRangeSlots.size > 0) {
				clearKeyboardRangeSelection()
				handle.update()
			}
			return
		}
		if (!currentSnapshot.slots.includes(params.fromSlot)) return
		if (!currentSnapshot.slots.includes(params.toSlot)) return
		if (!keyboardRangeAnchor) {
			keyboardRangeAnchor = params.fromSlot
			keyboardRangeAction = blockedSlots.has(params.fromSlot) ? 'remove' : 'add'
		}
		if (!keyboardRangeAnchor) return
		keyboardRangeSlots = new Set(
			getRectangularSlotSelection({
				slots: currentSnapshot.slots,
				startSlot: keyboardRangeAnchor,
				endSlot: params.toSlot,
			}),
		)
		handle.update()
	}

	function applyKeyboardRangeSelection() {
		if (!keyboardRangeAnchor || !keyboardRangeAction) return false
		if (keyboardRangeSlots.size === 0) return false
		const shouldBeBlocked = keyboardRangeAction === 'add'
		for (const slot of keyboardRangeSlots) {
			setBlockedSlotState(slot, shouldBeBlocked)
		}
		clearKeyboardRangeSelection()
		clearHostTapRangeSelection()
		handle.update()
		return true
	}

	function handleHostUnavailableKeyboardActivate(slot: string) {
		if (applyKeyboardRangeSelection()) return
		clearHostTapRangeSelection()
		toggleBlockedSlot(slot)
	}

	function handleHostUnavailablePointerUp() {
		hostSelection.finishSelection(false)
	}

	function handleHostUnavailablePointerDown(slot: string, event: PointerEvent) {
		clearKeyboardRangeSelection()
		const nextMode = resolveTapRangeModeFromPointer({
			currentMode: useHostTapRangeMode,
			pointerType: event.pointerType,
		})
		if (nextMode !== useHostTapRangeMode) {
			useHostTapRangeMode = nextMode
			if (isTapRangeStartMessage(hostTapRangeSelectionStatus)) {
				hostTapRangeSelectionStatus = null
			}
			hostTapRangeAnchor = null
			hostTapRangeAction = null
			handle.update()
		}
		if (useHostTapRangeMode) return
		clearHostTapRangeSelection()
		hostSelection.startSelection({
			slot,
			event,
			mode: blockedSlots.has(slot) ? 'remove' : 'add',
		})
	}

	function handleHostUnavailablePointerEnter(slot: string) {
		hostSelection.updateSelectionToSlot(slot)
	}

	function handleHostUnavailableCellClick(slot: string, event: MouseEvent) {
		if (!useHostTapRangeMode && event.detail > 0) return
		if (!useHostTapRangeMode) return
		if (!hostTapRangeAnchor) {
			hostTapRangeAnchor = slot
			hostTapRangeAction = blockedSlots.has(slot) ? 'remove' : 'add'
			hostTapRangeSelectionStatus = getTapRangeStartMessage(
				hostTapRangeAction ?? 'add',
			)
			handle.update()
			return
		}
		const shouldBeBlocked = (hostTapRangeAction ?? 'add') === 'add'
		applyBlockedSlotRange(hostTapRangeAnchor, slot, shouldBeBlocked)
		clearHostTapRangeSelection()
		handle.update()
	}

	function setPreviewSelectedRange(nextSlots: ReadonlySet<string>) {
		const nextSelection = new Set(nextSlots)
		if (areSetsEqual(previewSelectedSlots, nextSelection)) return false
		previewSelectedSlots = nextSelection
		return true
	}

	function clearPreviewSelectedRange() {
		const hadSelection = previewSelectedSlots.size > 0 || !!previewRangeAnchor
		const didClearTooltip = clearPreviewHoverTooltip()
		previewSelectedSlots = new Set<string>()
		previewRangeAnchor = null
		previewSelectionStatus = null
		activePreviewSlot = null
		if (hadSelection || didClearTooltip) {
			handle.update()
		}
	}

	function getPreviewSelectionSlots(startSlot: string, endSlot: string) {
		if (!snapshot) return new Set<string>()
		return new Set(
			getRectangularSlotSelection({
				slots: snapshot.slots,
				startSlot,
				endSlot,
			}).filter((slot) => !blockedSlots.has(slot)),
		)
	}

	function updatePreviewTapMode(pointerType: string) {
		const nextMode = resolveTapRangeModeFromPointer({
			currentMode: usePreviewTapRangeMode,
			pointerType,
		})
		if (nextMode === usePreviewTapRangeMode) return false
		usePreviewTapRangeMode = nextMode
		previewRangeAnchor = null
		if (isPreviewTapRangeStartMessage(previewSelectionStatus)) {
			previewSelectionStatus = null
		}
		return true
	}

	function handlePreviewPointerDown(slot: string, event: PointerEvent) {
		const didClearTooltip = clearPreviewHoverTooltip()
		const didChangeTapMode = updatePreviewTapMode(event.pointerType)
		if (usePreviewTapRangeMode) {
			if (didClearTooltip || didChangeTapMode) {
				handle.update()
			}
			return
		}
		if (blockedSlots.has(slot)) {
			if (didClearTooltip || didChangeTapMode) {
				handle.update()
			}
			return
		}
		previewSelection.startSelection({
			slot,
			event,
			mode: 'add',
		})
	}

	function updatePreviewHoverTooltip(slot: string, event: PointerEvent) {
		if (event.pointerType !== 'mouse') return
		if (previewSelection.state.mode) return
		setPreviewHoverTooltipPointerPosition(event.clientX, event.clientY)
		const didChange =
			previewHoverTooltipSlot !== slot || activePreviewSlot !== slot
		previewHoverTooltipSlot = slot
		activePreviewSlot = slot
		if (didChange) {
			handle.update()
		}
	}

	function handlePreviewPointerEnter(slot: string, event: PointerEvent) {
		previewSelection.updateSelectionToSlot(slot)
		updatePreviewHoverTooltip(slot, event)
	}

	function handlePreviewPointerMove(slot: string, event: PointerEvent) {
		updatePreviewHoverTooltip(slot, event)
	}

	function handlePreviewHover(slot: string | null) {
		if (slot) {
			const previousActiveSlot = activePreviewSlot
			if (!previewSelection.state.mode) {
				activePreviewSlot = slot
			}
			if (activePreviewSlot !== previousActiveSlot) {
				handle.update()
			}
			return
		}
		const previousActiveSlot = activePreviewSlot
		const didClearTooltip = clearPreviewHoverTooltip()
		if (!previewSelection.state.mode) {
			activePreviewSlot = null
		}
		if (didClearTooltip || activePreviewSlot !== previousActiveSlot) {
			handle.update()
		}
	}

	function handlePreviewFocus(slot: string) {
		clearPreviewHoverTooltip()
		activePreviewSlot = slot
		handle.update()
	}

	function handlePreviewPointerUp() {
		previewSelection.finishSelection(false)
	}

	function handlePreviewSelectionClick(slot: string, event: MouseEvent) {
		const didClearTooltip = clearPreviewHoverTooltip()
		// In non-tap mode, pointer drag handles selection and clicks (`event.detail > 0`)
		// should be ignored. Keep keyboard activation (`event.detail === 0`) working.
		if (!usePreviewTapRangeMode && event.detail > 0) {
			if (didClearTooltip) {
				handle.update()
			}
			return
		}
		if (blockedSlots.has(slot)) {
			if (didClearTooltip) {
				handle.update()
			}
			return
		}
		if (usePreviewTapRangeMode) {
			if (!previewRangeAnchor) {
				previewRangeAnchor = slot
				previewSelectionStatus = previewTapRangeStartMessage
				setPreviewSelectedRange(new Set([slot]))
				activePreviewSlot = slot
				handle.update()
				return
			}
			const nextSlots = getPreviewSelectionSlots(previewRangeAnchor, slot)
			setPreviewSelectedRange(nextSlots)
			previewRangeAnchor = null
			previewSelectionStatus = null
			activePreviewSlot = slot
			handle.update()
			return
		}
		const changed = setPreviewSelectedRange(new Set([slot]))
		previewRangeAnchor = null
		previewSelectionStatus = null
		activePreviewSlot = slot
		if (changed) {
			handle.update()
		}
	}

	function toggleIncludedAttendee(attendeeId: string) {
		if (excludedAttendeeIds.has(attendeeId)) {
			excludedAttendeeIds.delete(attendeeId)
		} else {
			excludedAttendeeIds.add(attendeeId)
		}
		handle.update()
	}

	function toggleFocusedPreviewAttendee(attendeeId: string) {
		focusedPreviewAttendeeId =
			focusedPreviewAttendeeId === attendeeId ? null : attendeeId
		handle.update()
	}

	function updateRangeDraft(next: {
		startDateInput?: string
		endDateInput?: string
	}) {
		if (next.startDateInput !== undefined) {
			rangeStartDateInput = next.startDateInput
		}
		if (next.endDateInput !== undefined) {
			rangeEndDateInput = next.endDateInput
		}
		const currentSnapshot = snapshot
		if (!currentSnapshot) {
			handle.update()
			return
		}
		const rangeValidationError = getRangeValidationError(currentSnapshot)
		if (rangeValidationError) {
			setStatus(rangeValidationError, true)
			queueHostSettingsSave()
			return
		}
		changeVersion += 1
		queueHostSettingsSave()
		if (statusError) {
			statusError = false
			statusMessage = null
		}
		handle.update()
	}

	handle.queueTask(async () => {
		const nextPathname = getPathname()
		if (nextPathname === lastPathname) return
		lastPathname = nextPathname
		clearSaveDebounceTimer()
		clearSocketResources()
		clearRefreshTimer()
		const routeParams = parseHostRouteParams(nextPathname)
		shareToken = routeParams?.shareToken ?? ''
		hostAccessToken = routeParams?.hostAccessToken ?? ''
		snapshot = null
		hostNameDraft = ''
		titleDraft = ''
		rangeStartDateInput = ''
		rangeEndDateInput = ''
		blockedSlots = new Set<string>()
		persistedBlockedSlots = new Set<string>()
		excludedAttendeeIds = new Set<string>()
		submissionNameDraftById = new Map<string, string>()
		submissionActionById = new Map<string, 'rename' | 'delete'>()
		submissionErrorById = new Map<string, string>()
		editingSubmissionId = null
		deleteConfirmationAttendeeId = null
		focusedPreviewAttendeeId = null
		activePreviewSlot = null
		previewHoverTooltipSlot = null
		clearPreviewHoverTooltipPointerPosition()
		previewSelectedSlots = new Set<string>()
		previewRangeAnchor = null
		usePreviewTapRangeMode = detectTapRangeMode()
		previewSelectionStatus = null
		hostTapRangeAnchor = null
		hostTapRangeAction = null
		useHostTapRangeMode = detectTapRangeMode()
		hostTapRangeSelectionStatus = null
		mobileDayKey = null
		clearKeyboardRangeSelection()
		hostSelection.cleanup()
		previewSelection.cleanup()
		isLoading = true
		isSaving = false
		pendingSave = false
		connectionState = 'offline'
		setStatus(null, false)
		await loadSnapshot()
		if (shareToken && hostAccessToken) {
			connectSocket()
		}
	})

	return () => {
		if (!shareToken || !hostAccessToken) {
			setDocumentTitle(toAppTitle('Host dashboard not found'))
			return (
				<section css={{ display: 'grid', gap: spacing.md }}>
					<h2 css={{ margin: 0, color: colors.text }}>
						Host dashboard not found
					</h2>
					<p css={{ margin: 0, color: colors.textMuted }}>
						This link is invalid.
					</p>
				</section>
			)
		}

		const currentSnapshot = snapshot
		const attendees = currentSnapshot?.attendees ?? []
		const includedAttendees = attendees.filter(
			(attendee) => !excludedAttendeeIds.has(attendee.id),
		)
		const includedAttendeeCount = includedAttendees.length
		const includedAvailabilityById = new Map(
			includedAttendees.map((attendee) => [
				attendee.id,
				new Set(currentSnapshot?.availabilityByAttendee[attendee.id] ?? []),
			]),
		)
		const focusedPreviewAttendee =
			attendees.find((attendee) => attendee.id === focusedPreviewAttendeeId) ??
			null
		const focusedPreviewSlots = new Set(
			(focusedPreviewAttendee
				? (currentSnapshot?.availabilityByAttendee[focusedPreviewAttendee.id] ??
					[])
				: []
			).filter((slot) => !blockedSlots.has(slot)),
		)
		const previewAvailability: Record<
			string,
			{ count: number; availableNames: Array<string> }
		> = {}
		const allAvailableSlots = new Set<string>()
		const slots = currentSnapshot?.slots ?? []
		for (const slot of slots) {
			if (blockedSlots.has(slot)) {
				previewAvailability[slot] = { count: 0, availableNames: [] }
				continue
			}
			const availableNames = includedAttendees
				.filter((attendee) =>
					includedAvailabilityById.get(attendee.id)?.has(slot),
				)
				.map((attendee) => attendee.name)
			const count = availableNames.length
			const allIncludedCanAttend =
				includedAttendeeCount > 0 && count === includedAttendeeCount
			if (allIncludedCanAttend) {
				allAvailableSlots.add(slot)
			}
			previewAvailability[slot] = {
				count,
				availableNames,
			}
		}
		const previewMaxCount = Math.max(1, includedAttendeeCount)
		const previewHighlightedSlots = allAvailableSlots
		const blockedAvailability = currentSnapshot
			? buildEmptyAvailability(currentSnapshot.slots)
			: {}
		const hasPendingLocalChanges = hasLocalHostChanges() || isSaving
		const isPointerRangePending = hostSelection.state.mode !== null
		const pendingBlockedSelectionSlots = isPointerRangePending
			? hostSelection.state.slots
			: keyboardRangeSlots
		const pendingBlockedSelectionLabel = isPointerRangePending
			? 'included in pending drag selection'
			: 'included in pending keyboard range selection'
		const hostRangeAnchor = keyboardRangeAnchor ?? hostTapRangeAnchor
		const previewSelectionSource = previewSelection.state.mode
			? previewSelection.state.slots
			: previewSelectedSlots
		const previewSelectedSlotsForSummary = new Set(
			Array.from(previewSelectionSource).filter(
				(slot) => !blockedSlots.has(slot),
			),
		)
		const previewSelectionSlotsSorted = Array.from(
			previewSelectedSlotsForSummary,
		).sort((left, right) => left.localeCompare(right))
		const previewSelectionCount = previewSelectionSlotsSorted.length
		const previewRangeStartSlot = previewSelectionSlotsSorted[0] ?? null
		const previewRangeEndSlot = previewSelectionSlotsSorted.at(-1) ?? null
		const previewRangeEndSlotExclusive =
			previewRangeEndSlot && currentSnapshot
				? toRangeEndSlotExclusive(
						previewRangeEndSlot,
						currentSnapshot.schedule.intervalMinutes,
					)
				: null
		const previewRangeSummaryEntries =
			previewRangeStartSlot && previewRangeEndSlotExclusive && currentSnapshot
				? includedAttendees
						.map((attendee) => {
							const availableSlots =
								includedAvailabilityById.get(attendee.id) ?? new Set<string>()
							let availableSlotCount = 0
							for (const slot of previewSelectionSlotsSorted) {
								if (availableSlots.has(slot)) {
									availableSlotCount += 1
								}
							}
							const availabilityRanges = buildAvailabilityRangeSummary({
								selectionSlotsSorted: previewSelectionSlotsSorted,
								intervalMinutes: currentSnapshot.schedule.intervalMinutes,
								availableSlots,
								timeZone: attendee.timeZone,
							})
							return {
								id: attendee.id,
								name: attendee.name,
								availableSlotCount,
								availabilityRanges,
							}
						})
						.sort((left, right) => {
							if (right.availableSlotCount !== left.availableSlotCount) {
								return right.availableSlotCount - left.availableSlotCount
							}
							return left.name.localeCompare(right.name)
						})
				: []
		const selectedRangeLabel =
			previewRangeStartSlot && previewRangeEndSlotExclusive
				? `${formatSlotLabel(previewRangeStartSlot)} - ${formatSlotLabel(previewRangeEndSlotExclusive)}`
				: null
		const previewHoveredSlotValue = previewHoverTooltipSlot
		const previewHoveredSlotDetails =
			previewHoveredSlotValue && slots.includes(previewHoveredSlotValue)
				? {
						slot: previewHoveredSlotValue,
						isBlocked: blockedSlots.has(previewHoveredSlotValue),
						attendeeDetails: includedAttendees.map((attendee) => ({
							id: attendee.id,
							name: attendee.name,
							canAttend:
								includedAvailabilityById
									.get(attendee.id)
									?.has(previewHoveredSlotValue) ?? false,
							...formatSlotForAttendeeTimeZone(
								previewHoveredSlotValue,
								attendee.timeZone,
							),
						})),
					}
				: null
		const previewTooltipWidthPx = 340
		const previewTooltipHeightPx = 300
		const attendeeTotalSummaryEntries = includedAttendees
			.map((attendee) => {
				const availableSlotsForAttendee =
					includedAvailabilityById.get(attendee.id) ?? new Set<string>()
				let totalAvailableSlots = 0
				for (const slot of availableSlotsForAttendee) {
					if (!blockedSlots.has(slot)) {
						totalAvailableSlots += 1
					}
				}
				return {
					id: attendee.id,
					name: attendee.name,
					totalAvailableSlots,
					timeZoneLabel: attendee.timeZone ?? 'timezone unknown',
				}
			})
			.sort((left, right) => {
				if (right.totalAvailableSlots !== left.totalAvailableSlots) {
					return right.totalAvailableSlots - left.totalAvailableSlots
				}
				return left.name.localeCompare(right.name)
			})
		const previewRangeSummaryById = new Map(
			previewRangeSummaryEntries.map((entry) => [entry.id, entry]),
		)
		const attendeeTotalSummaryById = new Map(
			attendeeTotalSummaryEntries.map((entry) => [entry.id, entry]),
		)
		const connectionLabel =
			connectionState === 'live'
				? 'Realtime connected'
				: connectionState === 'connecting'
					? 'Connecting realtime…'
					: `Realtime unavailable; polling every ${Math.floor(refreshIntervalMs / 1000)}s`
		const appOrigin =
			typeof window === 'undefined' ? '' : window.location.origin
		const attendeePath = `/s/${encodeURIComponent(shareToken)}`
		const hostPath = `${attendeePath}/${encodeURIComponent(hostAccessToken)}`
		const attendeeUrl = appOrigin ? `${appOrigin}${attendeePath}` : attendeePath
		const hostUrl = appOrigin ? `${appOrigin}${hostPath}` : hostPath
		const scheduleTitle = currentSnapshot?.schedule.title.trim() ?? ''

		if (isLoading && !currentSnapshot) {
			setDocumentTitle(toAppTitle('Loading host dashboard'))
		} else if (currentSnapshot) {
			setDocumentTitle(
				toAppTitle(
					scheduleTitle ? `${scheduleTitle} host dashboard` : 'Host dashboard',
				),
			)
		} else {
			setDocumentTitle(toAppTitle('Host dashboard unavailable'))
		}

		return (
			<section css={{ display: 'grid', gap: spacing.lg }}>
				<header
					css={{
						display: 'grid',
						gap: spacing.sm,
						padding: spacing.lg,
						borderRadius: radius.lg,
						border: `1px solid ${colors.border}`,
						background:
							'linear-gradient(140deg, color-mix(in srgb, var(--color-primary) 24%, var(--color-surface)), color-mix(in srgb, var(--color-primary) 8%, var(--color-background)))',
						boxShadow: shadows.sm,
					}}
				>
					<h1
						css={{
							margin: 0,
							fontSize: typography.fontSize.xl,
							fontWeight: typography.fontWeight.semibold,
							color: colors.text,
						}}
					>
						Host dashboard
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Manage schedule settings and choose the best meeting slot.
					</p>
					<p
						role="status"
						aria-live="polite"
						css={{ margin: 0, color: colors.textMuted }}
					>
						{connectionLabel}
					</p>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Times are shown in your browser timezone: {browserTimeZone}
					</p>
					<p css={{ margin: 0, color: colors.text }}>Save these links.</p>
					<div
						css={{
							display: 'grid',
							gap: spacing.sm,
							padding: spacing.md,
							borderRadius: radius.md,
							backgroundColor:
								'color-mix(in srgb, var(--color-surface) 72%, transparent)',
							border: `1px solid ${colors.border}`,
						}}
					>
						<div css={{ display: 'grid', gap: spacing.xs }}>
							<p css={{ margin: 0, color: colors.textMuted }}>
								Attendee submission link
							</p>
							<div
								css={{
									display: 'grid',
									gap: spacing.xs,
									gridTemplateColumns: 'minmax(0, 1fr) auto',
									alignItems: 'center',
								}}
							>
								<code
									css={{
										display: 'block',
										padding: `${spacing.xs} ${spacing.sm}`,
										borderRadius: radius.sm,
										border: `1px solid ${colors.border}`,
										backgroundColor: colors.background,
										color: colors.text,
										overflowWrap: 'anywhere',
									}}
								>
									{attendeeUrl}
								</code>
								<button
									type="button"
									aria-label="Copy attendee submission link"
									on={{
										click: () =>
											void copyValueToClipboard('Attendee link', attendeeUrl),
									}}
									css={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: 34,
										height: 34,
										padding: 0,
										borderRadius: radius.sm,
										border: `1px solid ${colors.border}`,
										backgroundColor: colors.surface,
										color: colors.text,
										cursor: 'pointer',
									}}
								>
									{renderCopyIcon()}
								</button>
							</div>
						</div>

						<div css={{ display: 'grid', gap: spacing.xs }}>
							<p css={{ margin: 0, color: colors.textMuted }}>
								Host dashboard link
							</p>
							<div
								css={{
									display: 'grid',
									gap: spacing.xs,
									gridTemplateColumns: 'minmax(0, 1fr) auto',
									alignItems: 'center',
								}}
							>
								<code
									css={{
										display: 'block',
										padding: `${spacing.xs} ${spacing.sm}`,
										borderRadius: radius.sm,
										border: `1px solid ${colors.border}`,
										backgroundColor: colors.background,
										color: colors.text,
										overflowWrap: 'anywhere',
									}}
								>
									{hostUrl}
								</code>
								<button
									type="button"
									aria-label="Copy host dashboard link"
									on={{
										click: () =>
											void copyValueToClipboard('Host link', hostUrl),
									}}
									css={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: 34,
										height: 34,
										padding: 0,
										borderRadius: radius.sm,
										border: `1px solid ${colors.border}`,
										backgroundColor: colors.surface,
										color: colors.text,
										cursor: 'pointer',
									}}
								>
									{renderCopyIcon()}
								</button>
							</div>
						</div>
					</div>
					<p
						role={
							clipboardMessage
								? clipboardError
									? 'alert'
									: 'status'
								: undefined
						}
						aria-live="polite"
						aria-hidden={clipboardMessage ? undefined : true}
						css={{
							margin: 0,
							minHeight: '1.5rem',
							color: clipboardError ? colors.error : colors.textMuted,
						}}
					>
						{clipboardMessage ?? '\u00a0'}
					</p>
				</header>

				<section
					css={{
						display: 'grid',
						gap: spacing.lg,
						padding: spacing.lg,
						borderRadius: radius.lg,
						border: `1px solid ${colors.border}`,
						backgroundColor: colors.surface,
						boxShadow: shadows.sm,
					}}
				>
					{isLoading ? (
						<p css={{ margin: 0, color: colors.textMuted }}>
							Loading host dashboard…
						</p>
					) : currentSnapshot ? (
						<>
							<div
								css={{
									display: 'grid',
									gap: spacing.md,
									gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
									[mq.mobile]: {
										gridTemplateColumns: '1fr',
									},
								}}
							>
								<label css={{ display: 'grid', gap: spacing.xs }}>
									<span
										css={{
											color: colors.text,
											fontSize: typography.fontSize.sm,
										}}
									>
										Schedule title
									</span>
									<input
										type="text"
										value={titleDraft}
										on={{
											input: (event) => {
												const nextTitle = event.currentTarget.value
												if (nextTitle === titleDraft) return
												titleDraft = nextTitle
												changeVersion += 1
												queueHostSettingsSave()
												handle.update()
											},
										}}
										css={{
											padding: `${spacing.sm} ${spacing.md}`,
											borderRadius: radius.md,
											border: `1px solid ${colors.border}`,
											backgroundColor: colors.background,
											color: colors.text,
										}}
									/>
								</label>
								<label css={{ display: 'grid', gap: spacing.xs }}>
									<span
										css={{
											color: colors.text,
											fontSize: typography.fontSize.sm,
										}}
									>
										Start date
									</span>
									<input
										type="date"
										value={rangeStartDateInput}
										on={{
											change: (event) => {
												updateRangeDraft({
													startDateInput: event.currentTarget.value,
												})
											},
										}}
										css={{
											padding: `${spacing.sm} ${spacing.md}`,
											borderRadius: radius.md,
											border: `1px solid ${colors.border}`,
											backgroundColor: colors.background,
											color: colors.text,
										}}
									/>
								</label>
								<label css={{ display: 'grid', gap: spacing.xs }}>
									<span
										css={{
											color: colors.text,
											fontSize: typography.fontSize.sm,
										}}
									>
										End date
									</span>
									<input
										type="date"
										value={rangeEndDateInput}
										on={{
											change: (event) => {
												updateRangeDraft({
													endDateInput: event.currentTarget.value,
												})
											},
										}}
										css={{
											padding: `${spacing.sm} ${spacing.md}`,
											borderRadius: radius.md,
											border: `1px solid ${colors.border}`,
											backgroundColor: colors.background,
											color: colors.text,
										}}
									/>
								</label>
							</div>

							<div
								css={{
									display: 'grid',
									gap: spacing.lg,
									[mq.desktop]: {
										gridTemplateColumns: 'minmax(20rem, 26rem) minmax(0, 1fr)',
										alignItems: 'start',
									},
								}}
							>
								<section
									css={{
										display: 'grid',
										gap: spacing.sm,
										padding: spacing.md,
										borderRadius: radius.md,
										border: `1px solid ${colors.border}`,
										backgroundColor: colors.background,
									}}
								>
									<div
										css={{
											display: 'flex',
											flexWrap: 'wrap',
											alignItems: 'center',
											justifyContent: 'space-between',
											gap: spacing.sm,
										}}
									>
										<div css={{ display: 'grid', gap: spacing.xs }}>
											<h2
												css={{
													margin: 0,
													fontSize: typography.fontSize.base,
													color: colors.text,
												}}
											>
												Respondents and summary
											</h2>
										</div>
										{previewSelectionCount > 0 ? (
											<button
												type="button"
												on={{ click: clearPreviewSelectedRange }}
												css={{
													padding: `${spacing.xs} ${spacing.sm}`,
													borderRadius: radius.full,
													border: `1px solid ${colors.border}`,
													backgroundColor: colors.surface,
													color: colors.text,
													cursor: 'pointer',
												}}
											>
												Clear selection
											</button>
										) : null}
									</div>
									{previewSelection.state.mode ? (
										<p role="status" aria-live="polite" css={visuallyHiddenCss}>
											Selecting {previewSelection.state.slots.size} slot
											{previewSelection.state.slots.size === 1 ? '' : 's'} —
											release to apply or press Escape to cancel.
										</p>
									) : null}
									{previewSelectionStatus ? (
										<p role="status" aria-live="polite" css={visuallyHiddenCss}>
											{previewSelectionStatus}
										</p>
									) : null}
									<div
										css={{
											display: 'grid',
											gap: spacing.sm,
										}}
									>
										{attendees.map((attendee) => {
											const isIncluded = !excludedAttendeeIds.has(attendee.id)
											const isHostAttendee = attendee.isHost
											const submissionNameDraft =
												submissionNameDraftById.get(attendee.id) ??
												attendee.name
											const nameDraft = isHostAttendee
												? hostNameDraft
												: submissionNameDraft
											const displayNamePillWidthPx =
												measureNamePillWidthPx(nameDraft)
											const editNamePillWidthPx =
												measureNamePillWidthPx(nameDraft)
											const pendingSubmissionAction =
												submissionActionById.get(attendee.id) ?? null
											const submissionErrorMessage =
												submissionErrorById.get(attendee.id) ?? null
											const isEditingSubmission =
												editingSubmissionId === attendee.id
											const isFocusedPreviewAttendee =
												focusedPreviewAttendeeId === attendee.id
											const rangeSummaryEntry =
												previewRangeSummaryById.get(attendee.id) ?? null
											const totalSummaryEntry =
												attendeeTotalSummaryById.get(attendee.id) ?? null
											const normalizedSubmissionName = normalizeName(nameDraft)
											const hasBlankSubmissionName =
												isEditingSubmission &&
												normalizedSubmissionName.length === 0
											const inlineSubmissionErrorMessage =
												submissionErrorMessage ??
												(hasBlankSubmissionName
													? 'Submission name is required.'
													: null)
											const inlineSubmissionErrorId = `submission-error-${attendee.id}`
											return (
												<article
													key={attendee.id}
													css={{
														display: 'grid',
														gap: spacing.xs,
														padding: spacing.sm,
														borderRadius: radius.md,
														border: `1px solid ${colors.border}`,
														backgroundColor: isIncluded
															? colors.surface
															: colors.background,
													}}
												>
													<div
														css={{
															display: 'grid',
															gap: spacing.sm,
															gridTemplateColumns: 'minmax(0, 1fr) auto',
															alignItems: 'center',
															[mq.mobile]: {
																gridTemplateColumns: '1fr',
															},
														}}
													>
														<div
															css={{
																display: 'flex',
																alignItems: 'center',
																gap: spacing.sm,
																minWidth: 0,
															}}
														>
															{isEditingSubmission ? (
																<form
																	data-submission-edit-form={attendee.id}
																	on={{
																		submit: (event) => {
																			event.preventDefault()
																			const formData = new FormData(
																				event.currentTarget,
																			)
																			const submittedNameDraft = String(
																				formData.get('submissionName') ?? '',
																			)
																			const normalizedSubmittedName =
																				normalizeName(submittedNameDraft)
																			if (!normalizedSubmittedName) {
																				if (isHostAttendee) {
																					hostNameDraft = submittedNameDraft
																				} else {
																					submissionNameDraftById.set(
																						attendee.id,
																						submittedNameDraft,
																					)
																				}
																				submissionErrorById.set(
																					attendee.id,
																					'Submission name is required.',
																				)
																				handle.update()
																				return
																			}
																			if (
																				normalizedSubmittedName ===
																				normalizeName(attendee.name)
																			) {
																				editingSubmissionId = null
																				submissionErrorById.delete(attendee.id)
																				handle.update()
																				focusSubmissionEditButton(attendee.id)
																				return
																			}
																			if (isHostAttendee) {
																				hostNameDraft = submittedNameDraft
																				changeVersion += 1
																				queueHostSettingsSave()
																				editingSubmissionId = null
																				submissionErrorById.delete(attendee.id)
																				handle.update()
																				focusSubmissionEditButton(attendee.id)
																				return
																			}
																			submissionNameDraftById.set(
																				attendee.id,
																				submittedNameDraft,
																			)
																			editingSubmissionId = null
																			submissionErrorById.delete(attendee.id)
																			handle.update()
																			focusSubmissionEditButton(attendee.id)
																			void renameSubmission(
																				attendee.id,
																				normalizedSubmittedName,
																			)
																		},
																	}}
																	css={{
																		display: 'flex',
																		alignItems: 'center',
																		gap: spacing.xs,
																		minWidth: 0,
																	}}
																>
																	<div
																		css={{
																			display: 'inline-flex',
																			alignItems: 'center',
																			gap: spacing.xs,
																			maxWidth: '100%',
																		}}
																	>
																		<input
																			type="text"
																			data-submission-edit-input={attendee.id}
																			aria-label={`Submission name input for ${attendee.name}`}
																			aria-invalid={
																				inlineSubmissionErrorMessage
																					? true
																					: undefined
																			}
																			aria-describedby={
																				inlineSubmissionErrorMessage
																					? inlineSubmissionErrorId
																					: undefined
																			}
																			name="submissionName"
																			value={nameDraft}
																			disabled={
																				pendingSubmissionAction === 'delete'
																			}
																			css={{
																				appearance: 'none',
																				...getNamePillBaseStyles({
																					isIncluded,
																					widthPx: editNamePillWidthPx,
																				}),
																				margin: 0,
																				outline: 'none',
																				'&:focus-visible': {
																					outline: `2px solid ${colors.primary}`,
																					outlineOffset: 2,
																				},
																			}}
																			on={{
																				input: (event) => {
																					const nextName =
																						event.currentTarget.value
																					const measuredWidthPx =
																						measureNamePillWidthPx(nextName)
																					event.currentTarget.style.width = `${measuredWidthPx}px`
																					if (isHostAttendee) {
																						hostNameDraft = nextName
																					} else {
																						submissionNameDraftById.set(
																							attendee.id,
																							nextName,
																						)
																					}
																					const didClearError =
																						submissionErrorById.delete(
																							attendee.id,
																						)
																					if (didClearError) {
																						handle.update()
																					}
																				},
																				keydown: (event) => {
																					if (event.key !== 'Escape') return
																					event.preventDefault()
																					editingSubmissionId = null
																					if (isHostAttendee) {
																						hostNameDraft = attendee.name
																					} else {
																						submissionNameDraftById.set(
																							attendee.id,
																							attendee.name,
																						)
																					}
																					submissionErrorById.delete(
																						attendee.id,
																					)
																					handle.update()
																					focusSubmissionEditButton(attendee.id)
																				},
																				blur: (event) => {
																					if (
																						editingSubmissionId !== attendee.id
																					)
																						return
																					const nextFocused =
																						event.relatedTarget
																					if (nextFocused instanceof Element) {
																						const parentEditForm =
																							nextFocused.closest(
																								`form[data-submission-edit-form="${attendee.id}"]`,
																							)
																						if (parentEditForm) {
																							return
																						}
																					}
																					editingSubmissionId = null
																					if (isHostAttendee) {
																						hostNameDraft = attendee.name
																					} else {
																						submissionNameDraftById.set(
																							attendee.id,
																							attendee.name,
																						)
																					}
																					submissionErrorById.delete(
																						attendee.id,
																					)
																					handle.update()
																				},
																			}}
																		/>
																	</div>
																</form>
															) : (
																<button
																	type="button"
																	data-submission-name-button={attendee.id}
																	aria-label={
																		isHostAttendee
																			? `Edit host name for ${attendee.name}`
																			: `Edit submission name for ${attendee.name}`
																	}
																	disabled={pendingSubmissionAction !== null}
																	on={{
																		click: () => {
																			if (pendingSubmissionAction !== null)
																				return
																			const previousEditingSubmissionId =
																				editingSubmissionId
																			editingSubmissionId = attendee.id
																			if (
																				!isHostAttendee &&
																				!submissionNameDraftById.has(
																					attendee.id,
																				)
																			) {
																				submissionNameDraftById.set(
																					attendee.id,
																					attendee.name,
																				)
																			}
																			if (
																				previousEditingSubmissionId &&
																				previousEditingSubmissionId !==
																					attendee.id
																			) {
																				submissionErrorById.delete(
																					previousEditingSubmissionId,
																				)
																			}
																			submissionErrorById.delete(attendee.id)
																			handle.update()
																			focusSubmissionEditInput(attendee.id, {
																				selectAll: true,
																			})
																		},
																	}}
																	css={{
																		appearance: 'none',
																		display: 'inline-flex',
																		alignItems: 'center',
																		gap: spacing.xs,
																		...getNamePillBaseStyles({
																			isIncluded,
																			widthPx: displayNamePillWidthPx,
																		}),
																		textAlign: 'left',
																		cursor:
																			pendingSubmissionAction === null
																				? 'pointer'
																				: 'not-allowed',
																		overflow: 'hidden',
																		textOverflow: 'ellipsis',
																	}}
																>
																	{nameDraft}
																</button>
															)}
														</div>
														<div
															css={{
																display: 'inline-flex',
																gap: spacing.xs,
																justifySelf: 'start',
															}}
														>
															{!isHostAttendee ? (
																<button
																	type="button"
																	aria-label={`Delete submission for ${attendee.name}`}
																	title={
																		pendingSubmissionAction === 'delete'
																			? 'Deleting submission'
																			: deleteConfirmationAttendeeId ===
																				  attendee.id
																				? 'Confirm deletion'
																				: 'Delete submission'
																	}
																	disabled={pendingSubmissionAction !== null}
																	on={{
																		click: (event) => {
																			if (pendingSubmissionAction !== null)
																				return
																			if (
																				deleteConfirmationAttendeeId !==
																				attendee.id
																			) {
																				event.preventDefault()
																				setDeleteConfirmationAttendee(
																					attendee.id,
																				)
																				return
																			}
																			deleteConfirmationAttendeeId = null
																			handle.update()
																			void deleteSubmission(attendee.id)
																		},
																		blur: () => {
																			if (
																				deleteConfirmationAttendeeId !==
																				attendee.id
																			)
																				return
																			setDeleteConfirmationAttendee(null)
																		},
																	}}
																	css={{
																		display: 'inline-flex',
																		alignItems: 'center',
																		justifyContent: 'center',
																		width:
																			deleteConfirmationAttendeeId ===
																			attendee.id
																				? 'auto'
																				: 30,
																		height: 30,
																		padding:
																			deleteConfirmationAttendeeId ===
																			attendee.id
																				? `0 ${spacing.xs}`
																				: 0,
																		borderRadius: radius.sm,
																		border: `1px solid ${colors.border}`,
																		backgroundColor:
																			deleteConfirmationAttendeeId ===
																			attendee.id
																				? colors.error
																				: colors.background,
																		color:
																			deleteConfirmationAttendeeId ===
																			attendee.id
																				? colors.onPrimary
																				: colors.error,
																		cursor:
																			pendingSubmissionAction === null
																				? 'pointer'
																				: 'not-allowed',
																		opacity:
																			pendingSubmissionAction === null
																				? 1
																				: 0.72,
																	}}
																>
																	{pendingSubmissionAction === 'delete'
																		? 'Deleting…'
																		: deleteConfirmationAttendeeId ===
																			  attendee.id
																			? 'Confirm'
																			: renderTrashIcon()}
																</button>
															) : (
																<span
																	title="host"
																	aria-label="host"
																	role="img"
																	css={{
																		display: 'inline-flex',
																		alignItems: 'center',
																		justifyContent: 'center',
																		width: 30,
																		height: 30,
																		padding: 0,
																		borderRadius: radius.sm,
																		border: `1px solid ${colors.border}`,
																		backgroundColor: colors.background,
																		color: colors.textMuted,
																	}}
																>
																	{renderHostIcon()}
																</span>
															)}
															<button
																type="button"
																aria-pressed={isIncluded}
																aria-label={
																	isIncluded
																		? `Hide ${attendee.name} from preview`
																		: `Show ${attendee.name} in preview`
																}
																title={
																	isIncluded
																		? 'Hide submission from preview'
																		: 'Show submission in preview'
																}
																on={{
																	click: () =>
																		toggleIncludedAttendee(attendee.id),
																}}
																css={{
																	display: 'inline-flex',
																	alignItems: 'center',
																	justifyContent: 'center',
																	width: 30,
																	height: 30,
																	padding: 0,
																	borderRadius: radius.sm,
																	border: `1px solid ${colors.border}`,
																	backgroundColor: isIncluded
																		? colors.primary
																		: colors.background,
																	color: isIncluded
																		? colors.onPrimary
																		: colors.text,
																	cursor: 'pointer',
																}}
															>
																{isIncluded
																	? renderVisibleIcon()
																	: renderHiddenIcon()}
															</button>
															<button
																type="button"
																aria-pressed={isFocusedPreviewAttendee}
																aria-label={
																	isFocusedPreviewAttendee
																		? `Disable highlight for ${attendee.name}`
																		: `Highlight ${attendee.name}`
																}
																title={
																	isFocusedPreviewAttendee
																		? 'Disable highlight'
																		: 'Highlight attendee availability'
																}
																on={{
																	click: () =>
																		toggleFocusedPreviewAttendee(attendee.id),
																}}
																css={{
																	display: 'inline-flex',
																	alignItems: 'center',
																	justifyContent: 'center',
																	width: 30,
																	height: 30,
																	padding: 0,
																	borderRadius: radius.sm,
																	border: `1px solid ${colors.border}`,
																	backgroundColor: isFocusedPreviewAttendee
																		? colors.primary
																		: colors.background,
																	color: isFocusedPreviewAttendee
																		? colors.onPrimary
																		: colors.text,
																	cursor: 'pointer',
																}}
															>
																{renderHighlightIcon()}
															</button>
														</div>
														{inlineSubmissionErrorMessage ? (
															<p
																id={inlineSubmissionErrorId}
																role="alert"
																aria-live="polite"
																css={{
																	gridColumn: '1 / -1',
																	margin: 0,
																	color: colors.error,
																	fontSize: typography.fontSize.sm,
																	lineHeight: 1.25,
																}}
															>
																{inlineSubmissionErrorMessage}
															</p>
														) : null}
													</div>
													<div
														css={{
															display: 'grid',
															gap: spacing.xs,
															alignContent: 'start',
														}}
													>
														{isIncluded ? (
															<div css={{ display: 'grid', gap: spacing.xs }}>
																{previewSelectionCount > 0 &&
																selectedRangeLabel &&
																rangeSummaryEntry ? (
																	<>
																		<p
																			css={{
																				margin: 0,
																				color: colors.textMuted,
																			}}
																		>
																			{rangeSummaryEntry.availableSlotCount}/
																			{previewSelectionCount} selected slot
																			{previewSelectionCount === 1
																				? ''
																				: 's'}{' '}
																			available.
																		</p>
																		<p
																			css={{
																				margin: 0,
																				color: colors.textMuted,
																			}}
																		>
																			{rangeSummaryEntry.availabilityRanges.map(
																				(range, index) => (
																					<span
																						key={`${range.startSlot}-${range.isAvailable}`}
																					>
																						{index > 0 ? ', ' : null}
																						<span
																							css={{
																								color: range.isAvailable
																									? colors.text
																									: colors.textMuted,
																								textDecoration:
																									range.isAvailable
																										? 'none'
																										: 'line-through',
																								textDecorationColor:
																									colors.error,
																								textDecorationThickness: '2px',
																							}}
																						>
																							{range.localRangeText}{' '}
																							{range.timeZoneLabel}
																						</span>
																					</span>
																				),
																			)}
																		</p>
																	</>
																) : totalSummaryEntry ? (
																	<p
																		css={{ margin: 0, color: colors.textMuted }}
																	>
																		{totalSummaryEntry.totalAvailableSlots}{' '}
																		available slot
																		{totalSummaryEntry.totalAvailableSlots === 1
																			? ''
																			: 's'}{' '}
																		— {totalSummaryEntry.timeZoneLabel}
																	</p>
																) : (
																	<p
																		css={{ margin: 0, color: colors.textMuted }}
																	>
																		No availability recorded yet.
																	</p>
																)}
															</div>
														) : (
															<p css={{ margin: 0, color: colors.textMuted }}>
																Excluded from preview calculations.
															</p>
														)}
													</div>
												</article>
											)
										})}
									</div>
								</section>

								<section
									css={{
										display: 'grid',
										gap: spacing.sm,
									}}
								>
									<h2
										css={{
											margin: 0,
											fontSize: typography.fontSize.base,
											color: colors.text,
										}}
									>
										Best-time preview
									</h2>
									<p css={{ margin: 0, color: colors.textMuted }}>
										Green slots mean everyone currently included can attend.{' '}
										{onMobileViewport
											? 'Tap one slot for the start and another for the end.'
											: 'Drag to select a window.'}
									</p>
									{renderScheduleGrid({
										slots: currentSnapshot.slots,
										selectedSlots: previewSelectedSlotsForSummary,
										outlinedSlots: previewSelectedSlotsForSummary,
										outlinedSlotLabel: 'included in selected preview range',
										accentedSlots: focusedPreviewSlots,
										accentedSlotLabel:
											focusedPreviewAttendee === null
												? undefined
												: `highlighted for ${focusedPreviewAttendee.name}`,
										selectionSlots: previewSelection.state.slots,
										selectionSlotLabel:
											'included in pending preview range selection',
										desktopHorizontalOverflow: 'local',
										dayHeaderLayout: 'stacked',
										dayColumnWidth: 'narrow',
										showWeekSeparators: true,
										fitToContentWidth: true,
										selectedSlotLabel: 'selected in host preview',
										unselectedSlotLabel: 'host preview slot',
										disabledSlots: blockedSlots,
										hideDisabledOnlyRowsAndColumns: true,
										highlightedSlots: previewHighlightedSlots,
										highlightedSlotLabel: 'all selected attendees can attend',
										slotAvailability: previewAvailability,
										maxAvailabilityCount: previewMaxCount,
										activeSlot: activePreviewSlot,
										rangeAnchor: previewRangeAnchor,
										mobileDayKey,
										pending: false,
										onMobileDayChange: (dayKey) => {
											mobileDayKey = dayKey
											handle.update()
										},
										onCellPointerDown: (slot, event) => {
											handlePreviewPointerDown(slot, event)
										},
										onCellPointerEnter: (slot, event) => {
											handlePreviewPointerEnter(slot, event)
										},
										onCellPointerMove: (slot, event) => {
											handlePreviewPointerMove(slot, event)
										},
										onCellPointerUp: (_slot, _event) => {
											handlePreviewPointerUp()
										},
										onCellHover: handlePreviewHover,
										onCellFocus: handlePreviewFocus,
										onCellClick: (slot, event) => {
											handlePreviewSelectionClick(slot, event)
										},
									})}
									{previewHoveredSlotDetails && previewHoverTooltipSlot ? (
										<aside
											role="note"
											data-host-preview-hover-tooltip
											aria-live="polite"
											css={{
												'--preview-hover-tooltip-width': `min(${previewTooltipWidthPx}px, calc(100vw - 1.5rem))`,
												'--preview-hover-tooltip-height': `min(${previewTooltipHeightPx}px, calc(100vh - 1.5rem))`,
												position: 'fixed',
												left: 'max(12px, min(calc(var(--preview-hover-tooltip-pointer-x, 0px) + 16px), calc(100vw - var(--preview-hover-tooltip-width) - 12px)))',
												top: 'max(12px, min(calc(var(--preview-hover-tooltip-pointer-y, 0px) + 16px), calc(100vh - var(--preview-hover-tooltip-height) - 12px)))',
												zIndex: 40,
												width: 'var(--preview-hover-tooltip-width)',
												maxHeight: 'var(--preview-hover-tooltip-height)',
												overflowY: 'auto',
												display: 'grid',
												gap: spacing.xs,
												padding: spacing.sm,
												borderRadius: radius.md,
												border: `1px solid ${colors.border}`,
												backgroundColor: colors.surface,
												boxShadow: shadows.md,
												pointerEvents: 'none',
											}}
										>
											<p
												css={{ margin: 0, color: colors.text, fontWeight: 600 }}
											>
												{formatSlotLabel(
													previewHoveredSlotDetails.slot,
													'long',
												)}
											</p>
											{previewHoveredSlotDetails.isBlocked ? (
												<p css={{ margin: 0, color: colors.error }}>
													This slot is unavailable because the host blocked it.
												</p>
											) : null}
											{previewHoveredSlotDetails.attendeeDetails.length ===
											0 ? (
												<p css={{ margin: 0, color: colors.textMuted }}>
													No attendee responses are currently shown.
												</p>
											) : (
												<ul
													css={{
														margin: 0,
														paddingLeft: '1rem',
														display: 'grid',
														gap: spacing.xs,
													}}
												>
													{previewHoveredSlotDetails.attendeeDetails.map(
														(entry) => {
															const canAttend =
																!previewHoveredSlotDetails.isBlocked &&
																entry.canAttend
															return (
																<li
																	key={`preview-hovered-slot-attendee-${entry.id}`}
																	css={{
																		textDecoration: canAttend
																			? 'none'
																			: 'line-through',
																		color: canAttend
																			? colors.text
																			: colors.textMuted,
																	}}
																>
																	<strong>{entry.name}</strong> —{' '}
																	{entry.localTime} ({entry.timeZoneLabel})
																</li>
															)
														},
													)}
												</ul>
											)}
										</aside>
									) : null}
								</section>
							</div>

							<section
								css={{
									display: 'grid',
									gap: spacing.sm,
								}}
							>
								<h2
									css={{
										margin: 0,
										fontSize: typography.fontSize.base,
										color: colors.text,
									}}
								>
									Host unavailable slots
								</h2>
								<p css={{ margin: 0, color: colors.textMuted }}>
									{onMobileViewport
										? 'Tap one slot to start a range and tap another to apply.'
										: 'Click and drag to select a range, then release to apply. Use arrow keys to move between slots and press Enter or Space to toggle one slot. Press Escape to cancel an in-progress drag.'}
								</p>
								{renderScheduleGrid({
									slots: currentSnapshot.slots,
									selectedSlots: blockedSlots,
									desktopHorizontalOverflow: 'local',
									dayHeaderLayout: 'stacked',
									dayColumnWidth: 'narrow',
									showWeekSeparators: true,
									fitToContentWidth: true,
									selectionSlots: pendingBlockedSelectionSlots,
									selectionSlotLabel: pendingBlockedSelectionLabel,
									selectedSlotLabel: 'marked unavailable by host',
									unselectedSlotLabel: 'available for scheduling',
									selectedBackground:
										'color-mix(in srgb, var(--color-error) 34%, var(--color-surface))',
									slotAvailability: blockedAvailability,
									maxAvailabilityCount: 1,
									activeSlot: null,
									rangeAnchor: hostRangeAnchor,
									mobileDayKey,
									pending: hasPendingLocalChanges,
									onMobileDayChange: (dayKey) => {
										mobileDayKey = dayKey
										handle.update()
									},
									onCellPointerDown: (slot, event) => {
										handleHostUnavailablePointerDown(slot, event)
									},
									onCellPointerEnter: (slot, _event) => {
										handleHostUnavailablePointerEnter(slot)
									},
									onCellPointerUp: (_slot, _event) => {
										handleHostUnavailablePointerUp()
									},
									onCellClick: (slot, event) => {
										handleHostUnavailableCellClick(slot, event)
									},
									onCellKeyboardActivate: handleHostUnavailableKeyboardActivate,
									onCellKeyboardNavigate: ({ fromSlot, toSlot, shiftKey }) => {
										updateKeyboardRangePreview({ fromSlot, toSlot, shiftKey })
									},
								})}
								{isPointerRangePending || keyboardRangeSlots.size > 0 ? (
									<p role="status" aria-live="polite" css={visuallyHiddenCss}>
										Selecting{' '}
										{isPointerRangePending
											? hostSelection.state.slots.size
											: keyboardRangeSlots.size}{' '}
										slot
										{(isPointerRangePending
											? hostSelection.state.slots.size
											: keyboardRangeSlots.size) === 1
											? ''
											: 's'}{' '}
										—{' '}
										{isPointerRangePending
											? 'release to apply or press Escape to cancel.'
											: 'press Enter or Space to apply.'}
									</p>
								) : null}
								{hostTapRangeSelectionStatus ? (
									<p role="status" aria-live="polite" css={visuallyHiddenCss}>
										{hostTapRangeSelectionStatus}
									</p>
								) : null}
							</section>

						</>
					) : (
						<p css={{ margin: 0, color: colors.error }}>
							Schedule not found or unavailable.
						</p>
					)}

					<p
						role={
							statusMessage ? (statusError ? 'alert' : 'status') : undefined
						}
						aria-live="polite"
						aria-hidden={statusMessage ? undefined : true}
						css={{
							margin: 0,
							minHeight: '1.5rem',
							color: statusError ? colors.error : colors.textMuted,
						}}
					>
						{statusMessage ?? '\u00a0'}
					</p>
				</section>
			</section>
		)
	}
}
