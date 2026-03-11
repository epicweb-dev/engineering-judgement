export function getSelectionDiff(params: {
	currentSelection: ReadonlySet<string>
	persistedSelection: ReadonlySet<string>
}) {
	const pendingAdded = new Set<string>()
	const pendingRemoved = new Set<string>()

	for (const slot of params.currentSelection) {
		if (!params.persistedSelection.has(slot)) {
			pendingAdded.add(slot)
		}
	}
	for (const slot of params.persistedSelection) {
		if (!params.currentSelection.has(slot)) {
			pendingRemoved.add(slot)
		}
	}

	return {
		pendingAdded,
		pendingRemoved,
	}
}
