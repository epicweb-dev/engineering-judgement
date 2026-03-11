import { type Handle } from 'remix/component'
import { getBrowserTimeZone } from '#client/browser-time-zone.ts'
import { setDocumentTitle, toAppTitle } from '#client/document-title.ts'
import { renderScheduleGrid } from '#client/components/schedule-grid.tsx'
import { createPointerDragSelectionController } from '#client/pointer-drag-selection.ts'
import { getSelectionDiff } from '#client/schedule-selection-utils.ts'
import {
	createSlotAvailability,
	getMaxAvailabilityCount,
} from '#client/schedule-snapshot-utils.ts'
import {
	findSelectionForAttendee,
	formatSlotLabel,
	formatSlotForAttendeeTimeZone,
	getRectangularSlotSelection,
} from '#client/schedule-utils.ts'
import {
	detectTapRangeMode,
	getTapRangeStartMessage,
	isTapRangeStartMessage,
	resolveTapRangeModeFromPointer,
} from '#client/tap-range-mode.ts'
import { type ScheduleSnapshot, normalizeName } from '#shared/schedule-store.ts'
import {
	colors,
	mq,
	radius,
	shadows,
	spacing,
	typography,
} from '#client/styles/tokens.ts'

type ConnectionState = 'connecting' | 'live' | 'offline'
const submissionHoverTooltipPointerXVar = '--submission-hover-tooltip-pointer-x'
const submissionHoverTooltipPointerYVar = '--submission-hover-tooltip-pointer-y'

function parseShareToken(pathname: string) {
	const segments = pathname.split('/').filter(Boolean)
	if (segments.length < 2) return ''
	if (segments[0] !== 's') return ''
	return segments[1] ?? ''
}

function toWebSocketUrl(path: string) {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
	return `${protocol}//${window.location.host}${path}`
}

export function ScheduleRoute(handle: Handle) {
	const browserTimeZone = getBrowserTimeZone()
	let shareToken = ''
	let attendeeName = ''
	let snapshot: ScheduleSnapshot | null = null
	let selectedSlots = new Set<string>()
	let persistedSelectedSlots = new Set<string>()
	let activeSlot: string | null = null
	let hoverTooltipSlot: string | null = null
	let hoverTooltipPointerX: number | null = null
	let hoverTooltipPointerY: number | null = null
	let rangeAnchor: string | null = null
	let tapRangeAction: 'add' | 'remove' | null = null
	let keyboardRangeAnchor: string | null = null
	let keyboardRangeAction: 'add' | 'remove' | null = null
	let keyboardRangeSlots = new Set<string>()
	let mobileDayKey: string | null = null
	let useTapRangeMode = detectTapRangeMode()
	let statusMessage: string | null = null
	let statusError = false
	let attendeeNameError: string | null = null
	let isSaving = false
	let isDeletingSubmission = false
	let isRenamingSubmission = false
	let isLoading = true
	let connectionState: ConnectionState = 'connecting'
	let socket: WebSocket | null = null
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null
	let offlinePollTimer: ReturnType<typeof setInterval> | null = null
	let offlinePollInFlight = false
	let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
	let hasDirtyChanges = false
	let changeVersion = 0
	let pendingSave = false
	let snapshotRequestId = 0
	let lastPathname = ''
	let initialNameLoaded = false
	let pendingRenameSourceName: string | null = null
	const nameRequiredMessage = 'Name is required before making a submission.'
	const autoSaveDelayMs = 650
	const reconnectDelayMs = 1200
	const offlinePollIntervalMs = 4000

	function setStatus(nextMessage: string | null, error = false) {
		statusMessage = nextMessage
		statusError = error
		handle.update()
	}

	function focusAttendeeNameInput() {
		if (typeof window === 'undefined' || typeof document === 'undefined') return
		window.setTimeout(() => {
			const nameInput = document.querySelector<HTMLInputElement>(
				'input[name="attendeeName"]',
			)
			nameInput?.focus()
		}, 0)
	}

	function ensureAttendeeNameProvided() {
		const normalizedName = normalizeName(attendeeName)
		if (normalizedName) {
			if (attendeeNameError) {
				attendeeNameError = null
			}
			return normalizedName
		}
		attendeeNameError = nameRequiredMessage
		focusAttendeeNameInput()
		handle.update()
		return null
	}

	function getPathname() {
		if (typeof window === 'undefined') return '/'
		return window.location.pathname
	}

	function getQueryName() {
		const params = new URLSearchParams(window.location.search)
		const value = params.get('name')
		return value ? normalizeName(value) : ''
	}

	function getBlockedSlots() {
		return new Set(snapshot?.blockedSlots ?? [])
	}

	function getPersistedSelectionForName(name: string) {
		if (!snapshot) return new Set<string>()
		const blockedSlots = getBlockedSlots()
		return new Set(
			findSelectionForAttendee({
				attendeeName: name,
				attendees: snapshot.attendees,
				availabilityByAttendee: snapshot.availabilityByAttendee,
			}).filter((slot) => !blockedSlots.has(slot)),
		)
	}

	function normalizeNameForLookup(name: string) {
		return normalizeName(name).toLowerCase()
	}

	function getPersistedAttendee(name: string) {
		if (!snapshot) return null
		const normalizedName = normalizeNameForLookup(name)
		if (!normalizedName) return null
		return (
			snapshot.attendees.find(
				(attendee) => normalizeNameForLookup(attendee.name) === normalizedName,
			) ?? null
		)
	}

	function hasPersistedSubmissionForName(name: string) {
		return getPersistedAttendee(name) !== null
	}

	function getPersistedAttendeeName(name: string) {
		return getPersistedAttendee(name)?.name ?? null
	}

	function normalizeLocalSelectionAgainstBlockedSlots() {
		const blockedSlots = getBlockedSlots()
		selectedSlots = new Set(
			Array.from(selectedSlots).filter((slot) => !blockedSlots.has(slot)),
		)
	}

	function clearKeyboardRangeSelection() {
		keyboardRangeAnchor = null
		keyboardRangeAction = null
		keyboardRangeSlots = new Set<string>()
	}

	function clearSaveDebounceTimer() {
		if (!saveDebounceTimer) return
		clearTimeout(saveDebounceTimer)
		saveDebounceTimer = null
	}

	function clearSocketResources() {
		if (socket) {
			const currentSocket = socket
			socket = null
			currentSocket.onopen = null
			currentSocket.onmessage = null
			currentSocket.onerror = null
			currentSocket.onclose = null
			currentSocket.close()
		}
		if (reconnectTimer) {
			clearTimeout(reconnectTimer)
			reconnectTimer = null
		}
	}

	function clearOfflinePollTimer() {
		if (!offlinePollTimer) return
		clearInterval(offlinePollTimer)
		offlinePollTimer = null
		offlinePollInFlight = false
	}

	function setHoverTooltipPointerPosition(clientX: number, clientY: number) {
		if (typeof document === 'undefined') return
		if (hoverTooltipPointerX === clientX && hoverTooltipPointerY === clientY) {
			return
		}
		hoverTooltipPointerX = clientX
		hoverTooltipPointerY = clientY
		const rootStyle = document.documentElement.style
		rootStyle.setProperty(submissionHoverTooltipPointerXVar, `${clientX}px`)
		rootStyle.setProperty(submissionHoverTooltipPointerYVar, `${clientY}px`)
	}

	function clearHoverTooltipPointerPosition() {
		hoverTooltipPointerX = null
		hoverTooltipPointerY = null
		if (typeof document === 'undefined') return
		const rootStyle = document.documentElement.style
		rootStyle.removeProperty(submissionHoverTooltipPointerXVar)
		rootStyle.removeProperty(submissionHoverTooltipPointerYVar)
	}

	function clearSubmissionHoverTooltip() {
		const didChange =
			hoverTooltipSlot !== null ||
			hoverTooltipPointerX !== null ||
			hoverTooltipPointerY !== null
		hoverTooltipSlot = null
		clearHoverTooltipPointerPosition()
		return didChange
	}

	const pointerSelection = createPointerDragSelectionController({
		requestRender: () => {
			handle.update()
		},
		canUpdateSelection: () => !useTapRangeMode,
		getSelectionSlots: (startSlot, endSlot) => {
			if (!snapshot) return new Set<string>()
			const blockedSlots = getBlockedSlots()
			return new Set(
				getRectangularSlotSelection({
					slots: snapshot.slots,
					startSlot,
					endSlot,
				}).filter((slot) => !blockedSlots.has(slot)),
			)
		},
		applySelection: ({ mode, slots }) => {
			const shouldSelect = mode === 'add'
			let changed = false
			for (const slot of slots) {
				const wasSelected = selectedSlots.has(slot)
				if (wasSelected === shouldSelect) continue
				setSlotSelection(slot, shouldSelect)
				changed = true
			}
			return changed
		},
		onSelectionPreviewSlot: (slot) => {
			activeSlot = slot
		},
		onSelectionFinished: ({ changed }) => {
			if (!changed) return true
			markDirty()
			return false
		},
	})

	function cleanupResources() {
		clearSocketResources()
		clearOfflinePollTimer()
		clearSaveDebounceTimer()
		clearSubmissionHoverTooltip()
		clearKeyboardRangeSelection()
		pointerSelection.cleanup()
		pendingSave = false
	}

	if (handle.signal.aborted) {
		cleanupResources()
	} else {
		handle.signal.addEventListener('abort', cleanupResources)
	}

	function setConnectionState(nextState: ConnectionState) {
		connectionState = nextState
		if (nextState === 'offline') {
			if (!offlinePollTimer) {
				offlinePollTimer = setInterval(() => {
					if (offlinePollInFlight) return
					offlinePollInFlight = true
					void loadSnapshot().finally(() => {
						offlinePollInFlight = false
					})
				}, offlinePollIntervalMs)
			}
		} else {
			clearOfflinePollTimer()
		}
		handle.update()
	}

	async function loadSnapshot() {
		const requestShareToken = shareToken
		if (!requestShareToken) return
		const requestId = ++snapshotRequestId
		try {
			const response = await fetch(`/api/schedules/${requestShareToken}`, {
				headers: { Accept: 'application/json' },
			})
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
						: 'Unable to load schedule.'
				setStatus(errorText, true)
				isLoading = false
				handle.update()
				return
			}

			snapshot = payload.snapshot
			const currentSnapshot = payload.snapshot
			isLoading = false

			if (!initialNameLoaded) {
				const initialName = getQueryName()
				if (initialName) attendeeName = initialName
				initialNameLoaded = true
			}

			persistedSelectedSlots = getPersistedSelectionForName(attendeeName)
			if (!hasDirtyChanges) {
				selectedSlots = new Set(persistedSelectedSlots)
			} else {
				normalizeLocalSelectionAgainstBlockedSlots()
			}
			if (
				keyboardRangeAnchor &&
				!currentSnapshot.slots.includes(keyboardRangeAnchor)
			) {
				clearKeyboardRangeSelection()
			} else if (keyboardRangeSlots.size > 0) {
				keyboardRangeSlots = new Set(
					Array.from(keyboardRangeSlots).filter((slot) =>
						currentSnapshot.slots.includes(slot),
					),
				)
				if (keyboardRangeSlots.size === 0) {
					clearKeyboardRangeSelection()
				}
			}
			if (rangeAnchor && !currentSnapshot.slots.includes(rangeAnchor)) {
				rangeAnchor = null
				tapRangeAction = null
			}
			if (activeSlot && !currentSnapshot.slots.includes(activeSlot)) {
				activeSlot = null
			}

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
			setStatus('Unable to load schedule.', true)
		}
	}

	async function saveAvailability() {
		const requestShareToken = shareToken
		if (!snapshot || !requestShareToken) return
		if (handle.signal.aborted) return
		if (isSaving) {
			pendingSave = true
			return
		}
		if (isDeletingSubmission || isRenamingSubmission) {
			pendingSave = true
			return
		}
		const normalizedName = ensureAttendeeNameProvided()
		if (!normalizedName) {
			return
		}

		const blockedSlots = getBlockedSlots()
		const sanitizedSelection = Array.from(selectedSlots)
			.filter((slot) => !blockedSlots.has(slot))
			.sort((left, right) => left.localeCompare(right))
		selectedSlots = new Set(sanitizedSelection)

		const saveVersion = changeVersion
		let shouldRetryAfterFailure = false
		isSaving = true
		handle.update()

		try {
			const response = await fetch(
				`/api/schedules/${requestShareToken}/availability`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: normalizedName,
						attendeeTimeZone: browserTimeZone,
						selectedSlots: sanitizedSelection,
					}),
				},
			)
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				snapshot?: ScheduleSnapshot
				error?: string
			} | null

			if (requestShareToken !== shareToken || handle.signal.aborted) return
			if (!response.ok || !payload?.ok || !payload?.snapshot) {
				shouldRetryAfterFailure = response.status >= 500
				const errorMessage =
					typeof payload?.error === 'string'
						? payload.error
						: 'Unable to save availability.'
				setStatus(errorMessage, true)
				return
			}

			snapshot = payload.snapshot
			persistedSelectedSlots = getPersistedSelectionForName(attendeeName)
			if (saveVersion === changeVersion) {
				hasDirtyChanges = false
				setStatus(null, false)
			}
		} catch {
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			shouldRetryAfterFailure = true
			setStatus('Network error while saving availability.', true)
		} finally {
			if (requestShareToken === shareToken && !handle.signal.aborted) {
				isSaving = false
				handle.update()
				const shouldReschedule =
					hasDirtyChanges && (pendingSave || shouldRetryAfterFailure)
				pendingSave = false
				if (shouldReschedule) {
					scheduleAutoSave()
				}
			} else {
				pendingSave = false
			}
		}
	}

	function scheduleAutoSave() {
		clearSaveDebounceTimer()
		if (handle.signal.aborted) return
		if (isDeletingSubmission || isRenamingSubmission) return
		const normalizedName = normalizeName(attendeeName)
		if (!normalizedName) return
		if (isSaving) {
			pendingSave = true
			return
		}
		saveDebounceTimer = setTimeout(() => {
			void saveAvailability()
		}, autoSaveDelayMs)
	}

	function markDirty() {
		hasDirtyChanges = true
		changeVersion += 1
		scheduleAutoSave()
		handle.update()
	}

	async function deleteSubmission() {
		const requestShareToken = shareToken
		if (!snapshot || !requestShareToken) return
		if (handle.signal.aborted || isDeletingSubmission || isRenamingSubmission) {
			return
		}
		if (isSaving) {
			setStatus('Saving availability. Try again in a moment.')
			return
		}
		const normalizedName = normalizeName(attendeeName)
		if (!normalizedName) {
			setStatus('Enter your name before deleting your submission.', true)
			return
		}

		clearSaveDebounceTimer()
		isDeletingSubmission = true
		handle.update()
		let completedSuccessfully = false

		try {
			const response = await fetch(
				`/api/schedules/${requestShareToken}/submission-delete`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: normalizedName }),
				},
			)
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				snapshot?: ScheduleSnapshot
				deleted?: boolean
				error?: string
			} | null

			if (requestShareToken !== shareToken || handle.signal.aborted) return
			if (!response.ok || !payload?.ok || !payload.snapshot) {
				const errorMessage =
					typeof payload?.error === 'string'
						? payload.error
						: 'Unable to delete submission.'
				setStatus(errorMessage, true)
				return
			}

			snapshot = payload.snapshot
			persistedSelectedSlots = getPersistedSelectionForName(attendeeName)
			selectedSlots = new Set(persistedSelectedSlots)
			rangeAnchor = null
			tapRangeAction = null
			pendingRenameSourceName = null
			hasDirtyChanges = false
			pendingSave = false
			setStatus(
				payload.deleted
					? 'Submission deleted.'
					: 'No saved submission to delete.',
			)
			completedSuccessfully = true
		} catch {
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			setStatus('Network error while deleting submission.', true)
		} finally {
			if (requestShareToken === shareToken && !handle.signal.aborted) {
				isDeletingSubmission = false
				if (!completedSuccessfully && (hasDirtyChanges || pendingSave)) {
					scheduleAutoSave()
				}
				handle.update()
			}
		}
	}

	async function renameSubmission() {
		const requestShareToken = shareToken
		if (!snapshot || !requestShareToken) return
		if (handle.signal.aborted || isRenamingSubmission || isDeletingSubmission) {
			return
		}
		if (isSaving) {
			setStatus('Saving availability. Try again in a moment.')
			return
		}
		const renameSourceName = pendingRenameSourceName
		const currentName = normalizeName(renameSourceName ?? '')
		const nextName = normalizeName(attendeeName)
		if (!currentName) {
			setStatus('No saved submission to rename.', true)
			return
		}
		if (!nextName) {
			setStatus('Enter your updated name before renaming.', true)
			return
		}

		clearSaveDebounceTimer()
		isRenamingSubmission = true
		handle.update()
		let completedSuccessfully = false

		try {
			const response = await fetch(
				`/api/schedules/${requestShareToken}/submission-rename`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						currentName,
						nextName,
					}),
				},
			)
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				snapshot?: ScheduleSnapshot
				renamed?: boolean
				error?: string
			} | null

			if (requestShareToken !== shareToken || handle.signal.aborted) return
			if (!response.ok || !payload?.ok || !payload.snapshot) {
				const errorMessage =
					typeof payload?.error === 'string'
						? payload.error
						: 'Unable to update attendee name.'
				setStatus(errorMessage, true)
				return
			}

			snapshot = payload.snapshot
			persistedSelectedSlots = getPersistedSelectionForName(attendeeName)
			selectedSlots = new Set(persistedSelectedSlots)
			rangeAnchor = null
			tapRangeAction = null
			pendingRenameSourceName = null
			hasDirtyChanges = false
			pendingSave = false
			setStatus(payload.renamed ? 'Name updated.' : 'Name already up to date.')
			completedSuccessfully = true
		} catch {
			if (requestShareToken !== shareToken || handle.signal.aborted) return
			setStatus('Network error while updating attendee name.', true)
		} finally {
			if (requestShareToken === shareToken && !handle.signal.aborted) {
				isRenamingSubmission = false
				if (!completedSuccessfully && (hasDirtyChanges || pendingSave)) {
					scheduleAutoSave()
				}
				handle.update()
			}
		}
	}

	function setSlotSelection(slot: string, shouldSelect: boolean) {
		if (shouldSelect) {
			selectedSlots.add(slot)
			return
		}
		selectedSlots.delete(slot)
	}

	function applyRange(
		startSlot: string,
		endSlot: string,
		shouldSelect: boolean,
	) {
		if (!snapshot) return
		const startIndex = snapshot.slots.indexOf(startSlot)
		const endIndex = snapshot.slots.indexOf(endSlot)
		if (startIndex < 0 || endIndex < 0) return
		const min = Math.min(startIndex, endIndex)
		const max = Math.max(startIndex, endIndex)
		const blockedSlots = getBlockedSlots()
		for (let index = min; index <= max; index += 1) {
			const slot = snapshot.slots[index]
			if (!slot || blockedSlots.has(slot)) continue
			setSlotSelection(slot, shouldSelect)
		}
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
		const blockedSlots = getBlockedSlots()
		const baseAnchor = keyboardRangeAnchor ?? params.fromSlot
		if (!ensureSlotIsEditable(baseAnchor)) {
			clearKeyboardRangeSelection()
			return
		}
		if (!keyboardRangeAnchor) {
			keyboardRangeAnchor = baseAnchor
			keyboardRangeAction = selectedSlots.has(baseAnchor) ? 'remove' : 'add'
		}
		if (!keyboardRangeAnchor) return
		keyboardRangeSlots = new Set(
			getRectangularSlotSelection({
				slots: currentSnapshot.slots,
				startSlot: keyboardRangeAnchor,
				endSlot: params.toSlot,
			}).filter((slot) => !blockedSlots.has(slot)),
		)
		activeSlot = params.toSlot
		handle.update()
	}

	function applyKeyboardRangeSelection() {
		if (!keyboardRangeAnchor || !keyboardRangeAction) return false
		if (keyboardRangeSlots.size === 0) return false
		if (!ensureSlotIsEditable(keyboardRangeAnchor)) {
			clearKeyboardRangeSelection()
			return false
		}
		const shouldSelect = keyboardRangeAction === 'add'
		for (const slot of keyboardRangeSlots) {
			setSlotSelection(slot, shouldSelect)
		}
		clearKeyboardRangeSelection()
		setStatus(null, false)
		markDirty()
		return true
	}

	function toggleSingleSlot(slot: string) {
		if (!ensureSlotIsEditable(slot)) return
		const shouldSelect = !selectedSlots.has(slot)
		setSlotSelection(slot, shouldSelect)
		rangeAnchor = null
		tapRangeAction = null
		clearKeyboardRangeSelection()
		activeSlot = slot
		setStatus(null, false)
		markDirty()
	}

	function ensureSlotIsEditable(slot: string) {
		activeSlot = slot
		const blockedSlots = getBlockedSlots()
		if (blockedSlots.has(slot)) {
			handle.update()
			return false
		}
		const normalizedName = ensureAttendeeNameProvided()
		if (!normalizedName) {
			return false
		}
		return true
	}

	function handleCellPointerDown(slot: string, event: PointerEvent) {
		if (clearSubmissionHoverTooltip()) {
			handle.update()
		}
		clearKeyboardRangeSelection()
		const nextMode = resolveTapRangeModeFromPointer({
			currentMode: useTapRangeMode,
			pointerType: event.pointerType,
		})
		if (nextMode !== useTapRangeMode) {
			useTapRangeMode = nextMode
			rangeAnchor = null
			tapRangeAction = null
			if (isTapRangeStartMessage(statusMessage)) {
				setStatus(null, false)
			} else {
				handle.update()
			}
		}
		if (useTapRangeMode) return
		if (!ensureSlotIsEditable(slot)) return
		pointerSelection.startSelection({
			slot,
			event,
			mode: selectedSlots.has(slot) ? 'remove' : 'add',
		})
	}

	function handleCellPointerEnter(slot: string) {
		pointerSelection.updateSelectionToSlot(slot)
	}

	function handleCellPointerMove(slot: string, event: PointerEvent) {
		if (event.pointerType !== 'mouse') return
		if (pointerSelection.state.mode) return
		setHoverTooltipPointerPosition(event.clientX, event.clientY)
		if (hoverTooltipSlot === slot) return
		hoverTooltipSlot = slot
		handle.update()
	}

	function handleCellHover(slot: string | null) {
		if (slot) return
		if (!clearSubmissionHoverTooltip()) return
		handle.update()
	}

	function handleCellPointerUp() {
		pointerSelection.finishSelection(false)
	}

	function handleCellClick(slot: string) {
		if (!useTapRangeMode) return
		if (!ensureSlotIsEditable(slot)) return
		if (!rangeAnchor) {
			rangeAnchor = slot
			tapRangeAction = selectedSlots.has(slot) ? 'remove' : 'add'
			activeSlot = slot
			setStatus(getTapRangeStartMessage(tapRangeAction))
			return
		}
		const shouldSelect = (tapRangeAction ?? 'add') === 'add'
		applyRange(rangeAnchor, slot, shouldSelect)
		rangeAnchor = null
		tapRangeAction = null
		activeSlot = slot
		setStatus(null, false)
		markDirty()
	}

	function handleCellKeyboardActivate(slot: string) {
		if (applyKeyboardRangeSelection()) return
		toggleSingleSlot(slot)
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

	handle.queueTask(async () => {
		const nextPathname = getPathname()
		if (nextPathname === lastPathname) return
		lastPathname = nextPathname
		clearSaveDebounceTimer()
		clearSocketResources()
		clearOfflinePollTimer()
		shareToken = parseShareToken(nextPathname)
		snapshot = null
		selectedSlots = new Set<string>()
		persistedSelectedSlots = new Set<string>()
		activeSlot = null
		hoverTooltipSlot = null
		clearHoverTooltipPointerPosition()
		rangeAnchor = null
		tapRangeAction = null
		clearKeyboardRangeSelection()
		mobileDayKey = null
		hasDirtyChanges = false
		changeVersion = 0
		pendingSave = false
		isSaving = false
		isDeletingSubmission = false
		isRenamingSubmission = false
		pendingRenameSourceName = null
		connectionState = 'offline'
		pointerSelection.cleanup()
		isLoading = true
		initialNameLoaded = false
		attendeeNameError = null
		setStatus(null, false)
		await loadSnapshot()
		connectSocket()
	})

	return () => {
		const currentSnapshot = snapshot
		const blockedSlots = new Set(currentSnapshot?.blockedSlots ?? [])
		const slotAvailability = createSlotAvailability(currentSnapshot)
		const maxAvailabilityCount = getMaxAvailabilityCount(slotAvailability)
		const selectedCount = selectedSlots.size
		const pendingDiff = getSelectionDiff({
			currentSelection: selectedSlots,
			persistedSelection: persistedSelectedSlots,
		})
		const pendingChangeCount =
			pendingDiff.pendingAdded.size + pendingDiff.pendingRemoved.size
		const submissionActionInFlight =
			isSaving || isDeletingSubmission || isRenamingSubmission
		const pendingSync = pendingChangeCount > 0 || submissionActionInFlight
		const isPointerRangePending = pointerSelection.state.mode !== null
		const pendingSelectionSlots = isPointerRangePending
			? pointerSelection.state.slots
			: keyboardRangeSlots
		const pendingSelectionLabel = isPointerRangePending
			? 'included in pending drag selection'
			: 'included in pending keyboard range selection'
		const gridRangeAnchor = keyboardRangeAnchor ?? rangeAnchor
		const normalizedAttendeeName = normalizeName(attendeeName)
		const persistedAttendee = getPersistedAttendee(attendeeName)
		const hasPersistedSubmission = hasPersistedSubmissionForName(attendeeName)
		const persistedSubmissionIsHost = persistedAttendee?.isHost === true
		const renameSourceIsHost = pendingRenameSourceName
			? getPersistedAttendee(pendingRenameSourceName)?.isHost === true
			: false
		const canRenameSubmission =
			typeof pendingRenameSourceName === 'string' &&
			normalizedAttendeeName.length > 0 &&
			!renameSourceIsHost &&
			normalizeNameForLookup(pendingRenameSourceName) !==
				normalizeNameForLookup(attendeeName)
		const showRenameSubmissionButton =
			canRenameSubmission || isRenamingSubmission
		const showDeleteSubmissionButton =
			normalizedAttendeeName.length > 0 &&
			(hasPersistedSubmission || isDeletingSubmission) &&
			!persistedSubmissionIsHost &&
			!showRenameSubmissionButton
		const attendeeEntries = currentSnapshot?.attendees ?? []
		const activeSlotAvailableNames = activeSlot
			? (currentSnapshot?.availableNamesBySlot[activeSlot] ?? [])
			: []
		const activeSlotAvailableNameSet = new Set(activeSlotAvailableNames)
		const activeSlotAvailableAttendees = attendeeEntries.filter((entry) =>
			activeSlotAvailableNameSet.has(entry.name),
		)
		const activeSlotUnavailableAttendees = attendeeEntries.filter(
			(entry) => !activeSlotAvailableNameSet.has(entry.name),
		)
		const activeSlotValue = activeSlot
		const activeSlotAvailableDetails =
			activeSlotValue === null
				? []
				: activeSlotAvailableAttendees.map((entry) => ({
						name: entry.name,
						...formatSlotForAttendeeTimeZone(activeSlotValue, entry.timeZone),
					}))
		const activeSlotUnavailableDetails =
			activeSlotValue === null
				? []
				: activeSlotUnavailableAttendees.map((entry) => ({
						name: entry.name,
						...formatSlotForAttendeeTimeZone(activeSlotValue, entry.timeZone),
					}))
		const activeSlotBlocked =
			activeSlotValue !== null && blockedSlots.has(activeSlotValue)
		const hoveredSlotValue = hoverTooltipSlot
		const hoveredSlotAvailableNames = hoveredSlotValue
			? (currentSnapshot?.availableNamesBySlot[hoveredSlotValue] ?? [])
			: []
		const hoveredSlotAvailableNameSet = new Set(hoveredSlotAvailableNames)
		const hoveredSlotDetails =
			hoveredSlotValue && currentSnapshot?.slots.includes(hoveredSlotValue)
				? {
						slot: hoveredSlotValue,
						isBlocked: blockedSlots.has(hoveredSlotValue),
						attendeeDetails: attendeeEntries.map((entry) => ({
							id: entry.id,
							name: entry.name,
							canAttend: hoveredSlotAvailableNameSet.has(entry.name),
							...formatSlotForAttendeeTimeZone(
								hoveredSlotValue,
								entry.timeZone,
							),
						})),
					}
				: null
		const tooltipWidthPx = 340
		const tooltipHeightPx = 300
		const hostName =
			currentSnapshot?.attendees.find((entry) => entry.isHost)?.name ??
			'the organizer'
		const connectionLabel =
			connectionState === 'live'
				? 'Realtime connected'
				: connectionState === 'connecting'
					? 'Connecting realtime…'
					: `Realtime unavailable; polling every ${Math.floor(offlinePollIntervalMs / 1000)}s`

		if (!shareToken) {
			setDocumentTitle(toAppTitle('Schedule not found'))
			return (
				<section css={{ display: 'grid', gap: spacing.md }}>
					<h2 css={{ margin: 0, color: colors.text }}>Schedule not found</h2>
					<p css={{ margin: 0, color: colors.textMuted }}>
						This link is invalid.
					</p>
				</section>
			)
		}

		const scheduleTitle = currentSnapshot?.schedule.title.trim() ?? ''
		if (isLoading && !currentSnapshot) {
			setDocumentTitle(toAppTitle('Loading schedule'))
		} else if (currentSnapshot) {
			setDocumentTitle(
				toAppTitle(
					scheduleTitle
						? `${scheduleTitle} availability`
						: 'Schedule availability',
				),
			)
		} else {
			setDocumentTitle(toAppTitle('Schedule unavailable'))
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
							'linear-gradient(140deg, color-mix(in srgb, var(--color-primary) 22%, var(--color-surface)), color-mix(in srgb, var(--color-primary) 8%, var(--color-background)))',
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
						{currentSnapshot?.schedule.title ?? 'Schedule'}
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Hosted by {hostName}
					</p>
					<p
						role="status"
						aria-live="polite"
						css={{ margin: 0, color: colors.textMuted }}
					>
						{connectionLabel}
					</p>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Enter your name, then mark every time that works for you.
					</p>
					<p
						css={{
							margin: 0,
							color: colors.textMuted,
							[mq.mobile]: {
								display: 'none',
							},
						}}
					>
						Desktop: click and drag across slots to add or remove availability.
					</p>
					<p
						css={{
							margin: 0,
							color: colors.textMuted,
							display: 'none',
							[mq.mobile]: {
								display: 'block',
							},
						}}
					>
						Mobile: tap one slot to start a range, then tap another to apply it.
					</p>
				</header>

				<section
					css={{
						display: 'grid',
						gap: spacing.md,
						padding: spacing.lg,
						borderRadius: radius.lg,
						border: `1px solid ${colors.border}`,
						backgroundColor: colors.surface,
						boxShadow: shadows.sm,
					}}
				>
					<div
						css={{
							display: 'grid',
							gap: spacing.md,
							gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
							[mq.mobile]: {
								gridTemplateColumns: '1fr',
							},
						}}
					>
						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span
								css={{ color: colors.text, fontSize: typography.fontSize.sm }}
							>
								Your name
							</span>
							<input
								type="text"
								name="attendeeName"
								value={attendeeName}
								placeholder="Add your name"
								aria-invalid={attendeeNameError ? 'true' : undefined}
								aria-describedby={
									attendeeNameError ? 'attendee-name-error' : undefined
								}
								on={{
									input: (event) => {
										const nextName = event.currentTarget.value
										const previousPersistedAttendee =
											getPersistedAttendee(attendeeName)
										const previousPersistedName =
											previousPersistedAttendee?.name ?? null
										attendeeName = nextName
										const nextPersistedName =
											getPersistedAttendeeName(attendeeName)
										if (!normalizeName(attendeeName)) {
											pendingRenameSourceName = null
										} else if (nextPersistedName) {
											pendingRenameSourceName = null
										} else if (
											previousPersistedName &&
											!previousPersistedAttendee?.isHost &&
											normalizeNameForLookup(previousPersistedName) !==
												normalizeNameForLookup(attendeeName)
										) {
											pendingRenameSourceName = previousPersistedName
										}
										if (normalizeName(attendeeName)) {
											attendeeNameError = null
										}
										persistedSelectedSlots =
											getPersistedSelectionForName(attendeeName)
										if (!hasDirtyChanges) {
											selectedSlots = new Set(persistedSelectedSlots)
										}
										if (!normalizeName(attendeeName)) {
											pendingRenameSourceName = null
											clearSaveDebounceTimer()
										} else if (hasDirtyChanges) {
											scheduleAutoSave()
										}
										handle.update()
									},
								}}
								css={{
									padding: `${spacing.sm} ${spacing.md}`,
									borderRadius: radius.md,
									border: `1px solid ${attendeeNameError ? colors.error : colors.border}`,
									backgroundColor: colors.background,
									color: colors.text,
								}}
							/>
							<p
								id="attendee-name-error"
								role={attendeeNameError ? 'alert' : undefined}
								aria-live="polite"
								aria-hidden={attendeeNameError ? undefined : 'true'}
								css={{
									margin: 0,
									minHeight: '1.25rem',
									color: colors.error,
									fontSize: typography.fontSize.xs,
								}}
							>
								{attendeeNameError ?? ''}
							</p>
						</label>
						<div
							css={{
								display: 'grid',
								alignContent: 'end',
								gap: spacing.xs,
							}}
						>
							<p
								role="status"
								aria-live="polite"
								css={{ margin: 0, color: colors.textMuted }}
							>
								{selectedCount} selected slot{selectedCount === 1 ? '' : 's'}
							</p>
							<p css={{ margin: 0, color: colors.textMuted }}>
								Times are shown in your browser timezone: {browserTimeZone}
							</p>
						</div>
					</div>

					{isLoading ? (
						<p css={{ margin: 0, color: colors.textMuted }}>
							Loading schedule…
						</p>
					) : currentSnapshot ? (
						renderScheduleGrid({
							slots: currentSnapshot.slots,
							selectedSlots,
							disabledSlots: blockedSlots,
							hideDisabledOnlyRowsAndColumns: true,
							selectionSlots: pendingSelectionSlots,
							selectionSlotLabel: pendingSelectionLabel,
							mobileDayKey,
							slotAvailability,
							maxAvailabilityCount,
							activeSlot,
							rangeAnchor: gridRangeAnchor,
							pending: pendingSync,
							onMobileDayChange: (dayKey) => {
								mobileDayKey = dayKey
								handle.update()
							},
							onCellPointerDown: handleCellPointerDown,
							onCellPointerEnter: (slot, _event) => {
								handleCellPointerEnter(slot)
							},
							onCellPointerMove: (slot, event) => {
								handleCellPointerMove(slot, event)
							},
							onCellHover: (slot) => {
								handleCellHover(slot)
							},
							onCellPointerUp: (_slot, _event) => {
								handleCellPointerUp()
							},
							onCellClick: (slot, _event) => {
								const didClearTooltip = clearSubmissionHoverTooltip()
								if (!useTapRangeMode) {
									if (didClearTooltip) {
										handle.update()
									}
									return
								}
								handleCellClick(slot)
							},
							onCellKeyboardActivate: handleCellKeyboardActivate,
							onCellKeyboardNavigate: ({ fromSlot, toSlot, shiftKey }) => {
								updateKeyboardRangePreview({ fromSlot, toSlot, shiftKey })
							},
							onCellFocus: (slot) => {
								clearSubmissionHoverTooltip()
								activeSlot = slot
								handle.update()
							},
						})
					) : (
						<p css={{ margin: 0, color: colors.error }}>
							Schedule not found or unavailable.
						</p>
					)}
					{hoveredSlotDetails && hoverTooltipSlot ? (
						<aside
							role="note"
							data-submission-hover-tooltip
							aria-live="polite"
							css={{
								'--submission-hover-tooltip-width': `min(${tooltipWidthPx}px, calc(100vw - 1.5rem))`,
								'--submission-hover-tooltip-height': `min(${tooltipHeightPx}px, calc(100vh - 1.5rem))`,
								position: 'fixed',
								left: 'max(12px, min(calc(var(--submission-hover-tooltip-pointer-x, 0px) + 16px), calc(100vw - var(--submission-hover-tooltip-width) - 12px)))',
								top: 'max(12px, min(calc(var(--submission-hover-tooltip-pointer-y, 0px) + 16px), calc(100vh - var(--submission-hover-tooltip-height) - 12px)))',
								zIndex: 40,
								width: 'var(--submission-hover-tooltip-width)',
								maxHeight: 'var(--submission-hover-tooltip-height)',
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
							<p css={{ margin: 0, color: colors.text, fontWeight: 600 }}>
								{formatSlotLabel(hoveredSlotDetails.slot, 'long')}
							</p>
							{hoveredSlotDetails.isBlocked ? (
								<p css={{ margin: 0, color: colors.error }}>
									This slot is unavailable because the host blocked it.
								</p>
							) : null}
							<ul
								css={{
									margin: 0,
									paddingLeft: '1rem',
									display: 'grid',
									gap: spacing.xs,
								}}
							>
								{hoveredSlotDetails.attendeeDetails.map((entry) => {
									const canAttend =
										!hoveredSlotDetails.isBlocked && entry.canAttend
									return (
										<li
											key={`hovered-slot-attendee-${entry.id}`}
											css={{
												textDecoration: canAttend ? 'none' : 'line-through',
												color: canAttend ? colors.text : colors.textMuted,
											}}
										>
											<strong>{entry.name}</strong> — {entry.localTime} (
											{entry.timeZoneLabel})
										</li>
									)
								})}
							</ul>
						</aside>
					) : null}

					{activeSlot && currentSnapshot ? (
						<section
							aria-live="polite"
							css={{
								display: 'grid',
								gap: spacing.sm,
								padding: spacing.md,
								borderRadius: radius.md,
								border: `1px solid ${colors.border}`,
								backgroundColor: colors.background,
							}}
						>
							<h2
								css={{
									margin: 0,
									fontSize: typography.fontSize.base,
									color: colors.text,
								}}
							>
								Slot details
							</h2>
							<p css={{ margin: 0, color: colors.textMuted }}>
								{formatSlotLabel(activeSlot, 'long')}
							</p>
							{activeSlotBlocked ? (
								<p css={{ margin: 0, color: colors.error, fontWeight: 600 }}>
									This slot is unavailable because the host blocked it.
								</p>
							) : null}
							<div css={{ display: 'grid', gap: spacing.xs }}>
								<p css={{ margin: 0, color: colors.text, fontWeight: 600 }}>
									Available ({activeSlotAvailableDetails.length})
								</p>
								{activeSlotAvailableDetails.length > 0 ? (
									<ul
										css={{
											margin: 0,
											paddingLeft: '1rem',
											display: 'grid',
											gap: spacing.xs,
										}}
									>
										{activeSlotAvailableDetails.map((entry) => (
											<li key={`available-${entry.name}`}>
												<strong>{entry.name}</strong> — {entry.localTime} (
												{entry.timeZoneLabel})
											</li>
										))}
									</ul>
								) : (
									<p css={{ margin: 0, color: colors.textMuted }}>None</p>
								)}
							</div>
							<div css={{ display: 'grid', gap: spacing.xs }}>
								<p
									css={{ margin: 0, color: colors.textMuted, fontWeight: 600 }}
								>
									Unavailable ({activeSlotUnavailableDetails.length})
								</p>
								{activeSlotUnavailableDetails.length > 0 ? (
									<ul
										css={{
											margin: 0,
											paddingLeft: '1rem',
											display: 'grid',
											gap: spacing.xs,
										}}
									>
										{activeSlotUnavailableDetails.map((entry) => (
											<li key={`unavailable-${entry.name}`}>
												<strong>{entry.name}</strong> — {entry.localTime} (
												{entry.timeZoneLabel})
											</li>
										))}
									</ul>
								) : (
									<p css={{ margin: 0, color: colors.textMuted }}>None</p>
								)}
							</div>
						</section>
					) : null}

					{!normalizedAttendeeName ? (
						<p css={{ margin: 0, color: colors.textMuted }}>
							Add your name before selecting availability.
						</p>
					) : null}
					{showRenameSubmissionButton ? (
						<button
							type="button"
							on={{ click: () => void renameSubmission() }}
							disabled={submissionActionInFlight}
							css={{
								justifySelf: 'start',
								padding: `${spacing.sm} ${spacing.lg}`,
								borderRadius: radius.full,
								border: `1px solid ${colors.primary}`,
								backgroundColor: 'transparent',
								color: colors.primary,
								fontWeight: typography.fontWeight.medium,
								cursor: submissionActionInFlight ? 'not-allowed' : 'pointer',
								opacity: submissionActionInFlight ? 0.72 : 1,
							}}
						>
							{isRenamingSubmission ? 'Updating name…' : 'Change my name'}
						</button>
					) : null}
					{showDeleteSubmissionButton ? (
						<button
							type="button"
							on={{ click: () => void deleteSubmission() }}
							disabled={submissionActionInFlight}
							css={{
								justifySelf: 'start',
								padding: `${spacing.sm} ${spacing.lg}`,
								borderRadius: radius.full,
								border: `1px solid ${colors.error}`,
								backgroundColor: 'transparent',
								color: colors.error,
								fontWeight: typography.fontWeight.medium,
								cursor: submissionActionInFlight ? 'not-allowed' : 'pointer',
								opacity: submissionActionInFlight ? 0.72 : 1,
							}}
						>
							{isDeletingSubmission
								? 'Deleting submission…'
								: 'Delete my submission'}
						</button>
					) : null}
					{isPointerRangePending || keyboardRangeSlots.size > 0 ? (
						<p css={{ margin: 0, color: colors.textMuted }}>
							Selecting{' '}
							{isPointerRangePending
								? pointerSelection.state.slots.size
								: keyboardRangeSlots.size}{' '}
							slot
							{(isPointerRangePending
								? pointerSelection.state.slots.size
								: keyboardRangeSlots.size) === 1
								? ''
								: 's'}{' '}
							—{' '}
							{isPointerRangePending
								? 'release to apply or press Escape to cancel.'
								: 'press Enter or Space to apply.'}
						</p>
					) : null}
					{statusMessage ? (
						<p
							role={statusError ? 'alert' : 'status'}
							aria-live="polite"
							css={{
								margin: 0,
								color: statusError ? colors.error : colors.textMuted,
								fontSize: typography.fontSize.sm,
							}}
						>
							{statusMessage}
						</p>
					) : null}
				</section>
			</section>
		)
	}
}
