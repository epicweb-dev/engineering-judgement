const defaultEdgeDistancePx = 56
const defaultMaxStepPx = 18

function computeAxisStep(params: {
	pointer: number
	start: number
	end: number
	edgeDistancePx: number
	maxStepPx: number
}) {
	const nearStartDistance = params.pointer - params.start
	if (nearStartDistance < params.edgeDistancePx) {
		const intensity =
			(params.edgeDistancePx - nearStartDistance) / params.edgeDistancePx
		return -Math.round(Math.min(params.maxStepPx, intensity * params.maxStepPx))
	}

	const nearEndDistance = params.end - params.pointer
	if (nearEndDistance < params.edgeDistancePx) {
		const intensity =
			(params.edgeDistancePx - nearEndDistance) / params.edgeDistancePx
		return Math.round(Math.min(params.maxStepPx, intensity * params.maxStepPx))
	}

	return 0
}

export function computeAutoScrollStep(params: {
	clientX: number
	clientY: number
	rect: DOMRect
	edgeDistancePx?: number
	maxStepPx?: number
}) {
	const edgeDistancePx = params.edgeDistancePx ?? defaultEdgeDistancePx
	const maxStepPx = params.maxStepPx ?? defaultMaxStepPx
	return {
		left: computeAxisStep({
			pointer: params.clientX,
			start: params.rect.left,
			end: params.rect.right,
			edgeDistancePx,
			maxStepPx,
		}),
		top: computeAxisStep({
			pointer: params.clientY,
			start: params.rect.top,
			end: params.rect.bottom,
			edgeDistancePx,
			maxStepPx,
		}),
	}
}

export function findSlotAtPoint(
	clientX: number,
	clientY: number,
	params?: { withinElement?: Element | null },
) {
	if (typeof document === 'undefined') return null
	const element = document.elementFromPoint(clientX, clientY)
	if (!(element instanceof Element)) return null
	const slotButton = element.closest('button[data-slot]')
	if (!(slotButton instanceof HTMLButtonElement)) return null
	if (params?.withinElement && !params.withinElement.contains(slotButton)) {
		return null
	}
	if (slotButton.getAttribute('aria-disabled') === 'true') return null
	const slot = slotButton.dataset.slot?.trim()
	return slot || null
}

export function getGridScrollerFromPointerEvent(event: PointerEvent) {
	const target = event.currentTarget
	if (!(target instanceof Element)) return null
	const scroller = target.closest('[data-schedule-grid-scroller]')
	return scroller instanceof HTMLElement ? scroller : null
}

export function setPointerCaptureIfAvailable(event: PointerEvent) {
	const target = event.currentTarget
	if (!(target instanceof Element)) return
	if (!('setPointerCapture' in target)) return
	try {
		;(
			target as Element & { setPointerCapture(pointerId: number): void }
		).setPointerCapture(event.pointerId)
	} catch {
		return
	}
}
