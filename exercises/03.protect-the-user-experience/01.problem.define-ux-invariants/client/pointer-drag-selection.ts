import {
	computeAutoScrollStep,
	findSlotAtPoint,
	getGridScrollerFromPointerEvent,
	setPointerCaptureIfAvailable,
} from '#client/grid-drag-autoscroll.ts'

export type PointerDragSelectionMode = 'add' | 'remove'

export type PointerDragSelectionState = {
	mode: PointerDragSelectionMode | null
	startSlot: string | null
	endSlot: string | null
	slots: Set<string>
}

type PointerDragSelectionControllerParams = {
	requestRender: () => void
	getSelectionSlots: (startSlot: string, endSlot: string) => Set<string>
	applySelection: (args: {
		mode: PointerDragSelectionMode
		slots: ReadonlySet<string>
	}) => boolean
	canUpdateSelection?: () => boolean
	onSelectionPreviewSlot?: (slot: string) => void
	onSelectionFinished?: (args: {
		changed: boolean
		cancelled: boolean
	}) => void | boolean
}

type StartPointerDragSelectionArgs = {
	slot: string
	event: PointerEvent
	mode: PointerDragSelectionMode
}

export function createPointerDragSelectionController(
	params: PointerDragSelectionControllerParams,
) {
	const state: PointerDragSelectionState = {
		mode: null,
		startSlot: null,
		endSlot: null,
		slots: new Set<string>(),
	}

	let selectionScroller: HTMLElement | null = null
	let pointerX = 0
	let pointerY = 0
	let activePointerId: number | null = null
	let autoScrollRaf: number | null = null

	function clearAutoScrollRaf() {
		if (autoScrollRaf === null) return
		cancelAnimationFrame(autoScrollRaf)
		autoScrollRaf = null
	}

	function clearSelection() {
		clearAutoScrollRaf()
		state.mode = null
		state.startSlot = null
		state.endSlot = null
		state.slots = new Set<string>()
		selectionScroller = null
		activePointerId = null
	}

	function detachSelectionListeners() {
		if (typeof window === 'undefined') return
		window.removeEventListener('pointerup', handleGlobalPointerUp)
		window.removeEventListener('pointercancel', handleGlobalPointerCancel)
		window.removeEventListener('pointermove', handleGlobalPointerMove)
		window.removeEventListener('keydown', handleGlobalKeyDown)
	}

	function attachSelectionListeners() {
		if (typeof window === 'undefined') return
		detachSelectionListeners()
		window.addEventListener('pointerup', handleGlobalPointerUp)
		window.addEventListener('pointercancel', handleGlobalPointerCancel)
		window.addEventListener('pointermove', handleGlobalPointerMove)
		window.addEventListener('keydown', handleGlobalKeyDown)
	}

	function updateSelectionToSlot(slot: string) {
		if (params.canUpdateSelection && !params.canUpdateSelection()) return
		if (!state.mode || !state.startSlot || state.endSlot === slot) return
		state.endSlot = slot
		state.slots = params.getSelectionSlots(state.startSlot, slot)
		params.onSelectionPreviewSlot?.(slot)
		params.requestRender()
	}

	function refreshSelectionAtPointerPosition() {
		const slot = findSlotAtPoint(pointerX, pointerY, {
			withinElement: selectionScroller,
		})
		if (!slot) return
		updateSelectionToSlot(slot)
	}

	function runAutoScrollStep() {
		autoScrollRaf = null
		if (!state.mode || !selectionScroller) return
		const delta = computeAutoScrollStep({
			clientX: pointerX,
			clientY: pointerY,
			rect: selectionScroller.getBoundingClientRect(),
		})
		if (delta.left === 0 && delta.top === 0) return
		selectionScroller.scrollBy({
			left: delta.left,
			top: delta.top,
		})
		refreshSelectionAtPointerPosition()
		autoScrollRaf = requestAnimationFrame(runAutoScrollStep)
	}

	function maybeStartAutoScroll() {
		if (!state.mode || !selectionScroller) return
		if (autoScrollRaf !== null) return
		const delta = computeAutoScrollStep({
			clientX: pointerX,
			clientY: pointerY,
			rect: selectionScroller.getBoundingClientRect(),
		})
		if (delta.left === 0 && delta.top === 0) return
		autoScrollRaf = requestAnimationFrame(runAutoScrollStep)
	}

	function finishSelection(cancelled = false) {
		if (!state.mode) return
		detachSelectionListeners()
		try {
			const changed = cancelled
				? false
				: params.applySelection({
						mode: state.mode,
						slots: state.slots,
					})
			const shouldRender = params.onSelectionFinished?.({ changed, cancelled })
			if (shouldRender !== false) {
				params.requestRender()
			}
		} finally {
			clearSelection()
		}
	}

	function handleGlobalPointerUp(event: PointerEvent) {
		if (activePointerId !== null && event.pointerId !== activePointerId) return
		finishSelection(false)
	}

	function handleGlobalPointerCancel(event: PointerEvent) {
		if (activePointerId !== null && event.pointerId !== activePointerId) return
		finishSelection(true)
	}

	function handlePointerMove(event: PointerEvent) {
		if (!state.mode) return
		pointerX = event.clientX
		pointerY = event.clientY
		refreshSelectionAtPointerPosition()
		maybeStartAutoScroll()
	}

	function handleGlobalPointerMove(event: PointerEvent) {
		if (activePointerId !== null && event.pointerId !== activePointerId) return
		handlePointerMove(event)
	}

	function handleGlobalKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !state.mode) return
		event.preventDefault()
		finishSelection(true)
	}

	function startSelection(args: StartPointerDragSelectionArgs) {
		setPointerCaptureIfAvailable(args.event)
		state.mode = args.mode
		state.startSlot = args.slot
		state.endSlot = args.slot
		state.slots = params.getSelectionSlots(args.slot, args.slot)
		selectionScroller = getGridScrollerFromPointerEvent(args.event)
		pointerX = args.event.clientX
		pointerY = args.event.clientY
		activePointerId = args.event.pointerId
		params.onSelectionPreviewSlot?.(args.slot)
		attachSelectionListeners()
		maybeStartAutoScroll()
		params.requestRender()
	}

	function cleanup() {
		detachSelectionListeners()
		clearSelection()
	}

	return {
		state,
		updateSelectionToSlot,
		finishSelection,
		startSelection,
		cleanup,
	}
}
