export function getScheduleCellBackgroundColor(params: {
	count: number
	maxCount: number
	isSelected: boolean
}) {
	if (params.isSelected) {
		return 'color-mix(in srgb, var(--color-primary) 38%, var(--color-surface))'
	}
	if (params.count <= 0 || params.maxCount <= 0) {
		return 'color-mix(in srgb, var(--color-surface) 95%, var(--color-background))'
	}

	const normalized = Math.max(
		0,
		Math.min(1, params.count / Math.max(1, params.maxCount)),
	)
	const primaryMix = Math.round(10 + normalized * 40)
	return `color-mix(in srgb, var(--color-primary) ${primaryMix}%, var(--color-surface))`
}
