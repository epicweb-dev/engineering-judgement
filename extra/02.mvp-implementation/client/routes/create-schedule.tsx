import { type Handle } from 'remix/component'
import { navigate } from '#client/client-router.tsx'
import {
	collectRangeSlotIds,
	createGridModel,
	renderScheduleGrid,
} from '#client/schedule-grid.tsx'
import {
	colors,
	mq,
	radius,
	shadows,
	spacing,
	typography,
} from '#client/styles/tokens.ts'
import {
	generateLocalSlotKeys,
	localSlotKeyToUtcIso,
	normalizeIanaTimeZone,
	slotIncrementOptions,
	type SlotIncrement,
} from '#shared/scheduling-time.ts'

function toDateInputValue(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function getDefaultDates() {
	const now = new Date()
	const startDate = toDateInputValue(now)
	const end = new Date(now)
	end.setDate(now.getDate() + 2)
	const endDate = toDateInputValue(end)
	return { startDate, endDate }
}

export function CreateScheduleRoute(handle: Handle) {
	const defaults = getDefaultDates()
	let title = 'Friday Hangout'
	let startDate = defaults.startDate
	let endDate = defaults.endDate
	let slotMinutes: SlotIncrement = 30
	let timezone = normalizeIanaTimeZone(
		normalizeIanaTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'),
	)
	let selectedLocalSlots = new Set<string>(
		new Set(generateLocalSlotKeys(defaults.startDate, defaults.endDate, 30)),
	)
	let isSubmitting = false
	let errorMessage: string | null = null
	let anchorSlotId: string | null = null
	let isMouseDragging = false
	let dragMode: 'add' | 'remove' | null = null
	let isHandleDragging = false
	let listenersAttached = false

	function syncSelectedSlotsToRange() {
		const localSlots = generateLocalSlotKeys(startDate, endDate, slotMinutes)
		const available = new Set(localSlots)
		const next = new Set<string>()
		for (const slot of selectedLocalSlots) {
			if (available.has(slot)) {
				next.add(slot)
			}
		}
		if (next.size === 0) {
			for (const slot of localSlots) {
				next.add(slot)
			}
		}
		selectedLocalSlots = next
		if (anchorSlotId && !selectedLocalSlots.has(anchorSlotId)) {
			anchorSlotId = null
		}
	}

	function ensureListeners() {
		if (listenersAttached || typeof window === 'undefined') return
		listenersAttached = true
		window.addEventListener('mouseup', () => {
			if (!isMouseDragging && !dragMode) return
			isMouseDragging = false
			dragMode = null
			handle.update()
		})
	}

	function updateSelected(mutator: (next: Set<string>) => void) {
		const next = new Set(selectedLocalSlots)
		mutator(next)
		selectedLocalSlots = next
		handle.update()
	}

	function handleCellClick(slotId: string) {
		anchorSlotId = slotId
		updateSelected((next) => {
			if (next.has(slotId)) {
				next.delete(slotId)
			} else {
				next.add(slotId)
			}
		})
	}

	function handleCellMouseDown(event: MouseEvent, slotId: string) {
		if (event.button !== 0) return
		event.preventDefault()
		anchorSlotId = slotId
		dragMode = selectedLocalSlots.has(slotId) ? 'remove' : 'add'
		isMouseDragging = true
		updateSelected((next) => {
			if (dragMode === 'add') {
				next.add(slotId)
			} else {
				next.delete(slotId)
			}
		})
	}

	function handleCellMouseEnter(slotId: string) {
		if (!isMouseDragging || !dragMode) return
		updateSelected((next) => {
			if (dragMode === 'add') {
				next.add(slotId)
			} else {
				next.delete(slotId)
			}
		})
	}

	function handleSelectionHandlePointerDown(event: PointerEvent) {
		if (!anchorSlotId) return
		event.preventDefault()
		event.stopPropagation()
		isHandleDragging = true
		const target = event.currentTarget as HTMLElement
		target.setPointerCapture(event.pointerId)
	}

	function handleSelectionHandlePointerMove(event: PointerEvent) {
		if (!isHandleDragging || !anchorSlotId) return
		const gridSlots = generateLocalSlotKeys(startDate, endDate, slotMinutes).map(
			(localSlotKey) => ({
				id: localSlotKey,
				startsAtUtc: localSlotKeyToUtcIso(localSlotKey, timezone),
			}),
		)
		const model = createGridModel(gridSlots, timezone)
		const targetElement = document.elementFromPoint(event.clientX, event.clientY)
		const cellElement = targetElement?.closest('[data-slot-id]') as
			| HTMLElement
			| null
		const targetSlotId = cellElement?.dataset.slotId
		if (!targetSlotId) return
		selectedLocalSlots = new Set(
			collectRangeSlotIds(model, anchorSlotId, targetSlotId),
		)
		handle.update()
	}

	function handleSelectionHandlePointerUp(event: PointerEvent) {
		if (!isHandleDragging) return
		isHandleDragging = false
		const target = event.currentTarget as HTMLElement
		if (target.hasPointerCapture(event.pointerId)) {
			target.releasePointerCapture(event.pointerId)
		}
	}

	async function handleCreateSchedule(event: SubmitEvent) {
		event.preventDefault()
		isSubmitting = true
		errorMessage = null
		handle.update()

		const selectedSlotsUtc = [...selectedLocalSlots].map((slotKey) =>
			localSlotKeyToUtcIso(slotKey, timezone),
		)

		if (selectedSlotsUtc.length === 0) {
			errorMessage = 'Select at least one available time slot before creating.'
			isSubmitting = false
			handle.update()
			return
		}

		try {
			const response = await fetch('/api/schedules', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					title,
					startDate,
					endDate,
					slotMinutes,
					timezone,
					selectedSlotsUtc,
				}),
			})
			const payload = (await response.json().catch(() => null)) as
				| { hostUrl?: string; error?: string }
				| null
			if (!response.ok || !payload?.hostUrl) {
				errorMessage = payload?.error ?? 'Unable to create schedule.'
				isSubmitting = false
				handle.update()
				return
			}
			navigate(payload.hostUrl)
		} catch {
			errorMessage = 'Network error while creating schedule.'
			isSubmitting = false
			handle.update()
		}
	}

	return () => {
		ensureListeners()
		const localSlots = generateLocalSlotKeys(startDate, endDate, slotMinutes)
		const gridSlots = localSlots.map((localSlotKey) => ({
			id: localSlotKey,
			startsAtUtc: localSlotKeyToUtcIso(localSlotKey, timezone),
		}))
		const model = createGridModel(gridSlots, timezone)

		return (
			<section css={{ display: 'grid', gap: spacing.xl }}>
			<header
				css={{
					display: 'grid',
					gap: spacing.sm,
					padding: spacing.lg,
					border: `1px solid ${colors.border}`,
					borderRadius: radius.lg,
					boxShadow: shadows.sm,
					background: `linear-gradient(135deg, ${colors.primarySoftStrong}, ${colors.primarySoftest})`,
				}}
			>
				<h1
					css={{
						margin: 0,
						color: colors.text,
						fontSize: typography.fontSize.xl,
						fontWeight: typography.fontWeight.semibold,
					}}
				>
					Create a schedule
				</h1>
				<p css={{ margin: 0, color: colors.textMuted }}>
					Pick a date range, choose host availability, then share your attendee
					link.
				</p>
			</header>

			<form
				on={{ submit: handleCreateSchedule }}
				css={{
					display: 'grid',
					gap: spacing.lg,
				}}
			>
				<div
					css={{
						display: 'grid',
						gap: spacing.md,
						gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
						[mq.tablet]: {
							gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
						},
						[mq.mobile]: {
							gridTemplateColumns: '1fr',
						},
					}}
				>
					<label css={{ display: 'grid', gap: spacing.xs }}>
						<span
							css={{
								fontSize: typography.fontSize.sm,
								fontWeight: typography.fontWeight.medium,
								color: colors.text,
							}}
						>
							Plan title
						</span>
						<input
							id="title"
							name="title"
							value={title}
							on={{
								input: (event) => {
									if (!(event.currentTarget instanceof HTMLInputElement)) return
									title = event.currentTarget.value
									handle.update()
								},
							}}
							css={{
								border: `1px solid ${colors.border}`,
								borderRadius: radius.md,
								padding: `${spacing.sm} ${spacing.md}`,
								backgroundColor: colors.surface,
								color: colors.text,
								fontSize: typography.fontSize.base,
							}}
						/>
					</label>
					<label css={{ display: 'grid', gap: spacing.xs }}>
						<span
							css={{
								fontSize: typography.fontSize.sm,
								fontWeight: typography.fontWeight.medium,
								color: colors.text,
							}}
						>
							Start date
						</span>
						<input
							id="start-date"
							name="start-date"
							type="date"
							value={startDate}
							on={{
								input: (event) => {
									if (!(event.currentTarget instanceof HTMLInputElement)) return
									startDate = event.currentTarget.value
									syncSelectedSlotsToRange()
									handle.update()
								},
							}}
							css={{
								border: `1px solid ${colors.border}`,
								borderRadius: radius.md,
								padding: `${spacing.sm} ${spacing.md}`,
								backgroundColor: colors.surface,
								color: colors.text,
								fontSize: typography.fontSize.base,
							}}
						/>
					</label>
					<label css={{ display: 'grid', gap: spacing.xs }}>
						<span
							css={{
								fontSize: typography.fontSize.sm,
								fontWeight: typography.fontWeight.medium,
								color: colors.text,
							}}
						>
							End date
						</span>
						<input
							id="end-date"
							name="end-date"
							type="date"
							value={endDate}
							on={{
								input: (event) => {
									if (!(event.currentTarget instanceof HTMLInputElement)) return
									endDate = event.currentTarget.value
									syncSelectedSlotsToRange()
									handle.update()
								},
							}}
							css={{
								border: `1px solid ${colors.border}`,
								borderRadius: radius.md,
								padding: `${spacing.sm} ${spacing.md}`,
								backgroundColor: colors.surface,
								color: colors.text,
								fontSize: typography.fontSize.base,
							}}
						/>
					</label>
					<label css={{ display: 'grid', gap: spacing.xs }}>
						<span
							css={{
								fontSize: typography.fontSize.sm,
								fontWeight: typography.fontWeight.medium,
								color: colors.text,
							}}
						>
							Slot size
						</span>
						<select
							id="slot-minutes"
							name="slot-minutes"
							value={String(slotMinutes)}
							on={{
								change: (event) => {
									if (!(event.currentTarget instanceof HTMLSelectElement)) return
									slotMinutes = Number(
										event.currentTarget.value,
									) as SlotIncrement
									syncSelectedSlotsToRange()
									handle.update()
								},
							}}
							css={{
								border: `1px solid ${colors.border}`,
								borderRadius: radius.md,
								padding: `${spacing.sm} ${spacing.md}`,
								backgroundColor: colors.surface,
								color: colors.text,
								fontSize: typography.fontSize.base,
							}}
						>
							{slotIncrementOptions.map((value) => (
								<option value={String(value)} key={String(value)}>
									{value} minutes
								</option>
							))}
						</select>
					</label>
				</div>

				<div css={{ display: 'grid', gap: spacing.sm }}>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Host timezone: <strong css={{ color: colors.text }}>{timezone}</strong>
					</p>
					{renderScheduleGrid({
						model,
						selectedSlotIds: selectedLocalSlots,
						anchorSlotId,
						ariaLabel: 'Host availability selection grid',
						onCellClick: handleCellClick,
						onCellMouseDown: handleCellMouseDown,
						onCellMouseEnter: handleCellMouseEnter,
						onHandlePointerDown: handleSelectionHandlePointerDown,
						onHandlePointerMove: handleSelectionHandlePointerMove,
						onHandlePointerUp: handleSelectionHandlePointerUp,
					})}
				</div>

				<div css={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
					<button
						type="submit"
						disabled={isSubmitting}
						css={{
							border: `1px solid ${colors.primary}`,
							backgroundColor: colors.primary,
							color: colors.onPrimary,
							padding: `${spacing.sm} ${spacing.lg}`,
							borderRadius: radius.md,
							fontWeight: typography.fontWeight.semibold,
							cursor: isSubmitting ? 'not-allowed' : 'pointer',
						}}
					>
						{isSubmitting ? 'Creating schedule...' : 'Create schedule'}
					</button>
					<p css={{ margin: 0, color: colors.textMuted }}>
						{selectedLocalSlots.size} slots selected
					</p>
				</div>
				{errorMessage ? (
					<p role="alert" css={{ margin: 0, color: colors.error }}>
						{errorMessage}
					</p>
				) : null}
			</form>
			</section>
		)
	}
}

