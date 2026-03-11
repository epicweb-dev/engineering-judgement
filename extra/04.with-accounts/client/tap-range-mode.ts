const touchFriendlyMediaQuery = '(hover: none), (pointer: coarse)'

const tapRangeStartMessages = {
	add: 'Range start selected. Tap another slot to add range.',
	remove: 'Range start selected. Tap another slot to remove range.',
} as const

export function getTapRangeStartMessage(action: 'add' | 'remove') {
	return tapRangeStartMessages[action]
}

export function isTapRangeStartMessage(message: string | null) {
	return (
		message === tapRangeStartMessages.add ||
		message === tapRangeStartMessages.remove
	)
}

function hasTouchPoints() {
	if (typeof navigator === 'undefined') return false
	return navigator.maxTouchPoints > 0
}

function matchesTouchFriendlyMediaQuery() {
	if (typeof window === 'undefined') return false
	if (typeof window.matchMedia !== 'function') return false
	return window.matchMedia(touchFriendlyMediaQuery).matches
}

export function detectTapRangeMode() {
	return hasTouchPoints() || matchesTouchFriendlyMediaQuery()
}

export function resolveTapRangeModeFromPointer(params: {
	currentMode: boolean
	pointerType: string
}) {
	const pointerType = params.pointerType.trim().toLowerCase()
	if (pointerType === 'touch') return true
	if (pointerType === 'mouse' || pointerType === 'pen') return false
	return params.currentMode
}
