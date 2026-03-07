import { type Handle } from 'remix/component'
import {
	collectRangeSlotIds,
	createGridModel,
	renderScheduleGrid,
} from '#client/schedule-grid.tsx'
import { colors, radius, spacing, typography } from '#client/styles/tokens.ts'
import { formatUtcInTimeZone, normalizeIanaTimeZone } from '#shared/scheduling-time.ts'

type SchedulePayload = {
	scheduleKey: string
	title: string
	startDate: string
	endDate: string
	slotMinutes: number
	timezone: string
	slotsUtc: Array<string>
	responseCounts: Record<string, number>
	totalResponders: number
	bestSlotUtc: string | null
}

type ReadScheduleResponse = {
	ok: boolean
	schedule: SchedulePayload
}

function getScheduleKeyFromPath() {
	if (typeof window === 'undefined') return null
	const segments = window.location.pathname.split('/').filter(Boolean)
	if (segments.length !== 2) return null
	if (segments[0] !== 's') return null
	return segments[1] ?? null
}

export function RespondScheduleRoute(handle: Handle) {
	let schedule: SchedulePayload | null = null
	let selectedSlots = new Set<string>()
	let attendeeName = ''
	let status: 'loading' | 'ready' | 'error' = 'loading'
	let errorMessage: string | null = null
	let saveMessage: string | null = null
	let isSaving = false
	let requestQueued = false
	let anchorSlotId: string | null = null
	let isMouseDragging = false
	let dragMode: 'add' | 'remove' | null = null
	let isHandleDragging = false
	let listenersAttached = false

	const scheduleKey = getScheduleKeyFromPath()
	const attendeeTimeZone = normalizeIanaTimeZone(
		Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
	)

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

	function queueLoad() {
		if (requestQueued) return
		requestQueued = true
		if (!scheduleKey) {
			status = 'error'
			errorMessage = 'Invalid attendee link.'
			handle.update()
			return
		}

		handle.queueTask(async (signal) => {
			try {
				const response = await fetch(
					`/api/schedules/${encodeURIComponent(scheduleKey)}`,
					{
						headers: {
							Accept: 'application/json',
						},
						signal,
					},
				)
				const payload = (await response.json().catch(() => null)) as
					| ReadScheduleResponse
					| { error?: string }
					| null
				if (signal.aborted) return
				if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
					status = 'error'
					errorMessage =
						(payload && 'error' in payload && payload.error) ||
						'Unable to load this schedule.'
					handle.update()
					return
				}
				schedule = payload.schedule
				status = 'ready'
				errorMessage = null
				handle.update()
			} catch {
				if (signal.aborted) return
				status = 'error'
				errorMessage = 'Network error while loading schedule.'
				handle.update()
			}
		})
	}

	function updateSelected(mutator: (next: Set<string>) => void) {
		const next = new Set(selectedSlots)
		mutator(next)
		selectedSlots = next
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
		dragMode = selectedSlots.has(slotId) ? 'remove' : 'add'
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
		if (!isHandleDragging || !anchorSlotId || !schedule) return
		const slots = schedule.slotsUtc.map((slot) => ({ id: slot, startsAtUtc: slot }))
		const model = createGridModel(slots, attendeeTimeZone)
		const targetElement = document.elementFromPoint(event.clientX, event.clientY)
		const cellElement = targetElement?.closest('[data-slot-id]') as
			| HTMLElement
			| null
		const targetSlotId = cellElement?.dataset.slotId
		if (!targetSlotId) return
		selectedSlots = new Set(collectRangeSlotIds(model, anchorSlotId, targetSlotId))
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

	async function handleSaveResponse(event: SubmitEvent) {
		event.preventDefault()
		if (!scheduleKey) return
		if (!attendeeName.trim()) {
			errorMessage = 'Enter your name before submitting.'
			handle.update()
			return
		}
		errorMessage = null
		saveMessage = null
		isSaving = true
		handle.update()
		try {
			const response = await fetch(
				`/api/schedules/${encodeURIComponent(scheduleKey)}/responses`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({
						attendeeName: attendeeName.trim(),
						selectedSlotsUtc: [...selectedSlots],
					}),
				},
			)
			const payload = (await response.json().catch(() => null)) as
				| { ok?: boolean; error?: string }
				| null
			if (!response.ok || !payload?.ok) {
				errorMessage = payload?.error ?? 'Unable to submit availability.'
				isSaving = false
				handle.update()
				return
			}
			saveMessage = 'Availability saved.'
			isSaving = false
			handle.update()
		} catch {
			errorMessage = 'Network error while saving availability.'
			isSaving = false
			handle.update()
		}
	}

	return () => {
		ensureListeners()
		queueLoad()

		if (status === 'loading') {
			return <p css={{ margin: 0, color: colors.textMuted }}>Loading schedule...</p>
		}

		if (status === 'error' || !schedule) {
			return (
				<p role="alert" css={{ margin: 0, color: colors.error }}>
					{errorMessage ?? 'Unable to load schedule.'}
				</p>
			)
		}

		const gridSlots = schedule.slotsUtc.map((slot) => ({
			id: slot,
			startsAtUtc: slot,
		}))
		const model = createGridModel(gridSlots, attendeeTimeZone)

		return (
			<section css={{ display: 'grid', gap: spacing.lg }}>
				<header
					css={{
						display: 'grid',
						gap: spacing.xs,
						padding: spacing.lg,
						border: `1px solid ${colors.border}`,
						borderRadius: radius.lg,
						backgroundColor: colors.surface,
					}}
				>
					<h1
						css={{
							margin: 0,
							fontSize: typography.fontSize.xl,
							color: colors.text,
						}}
					>
						{schedule.title}
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Select every time that works for you. Times are shown in{' '}
						<strong css={{ color: colors.text }}>{attendeeTimeZone}</strong>.
					</p>
					{schedule.bestSlotUtc ? (
						<p css={{ margin: 0, color: colors.textMuted }}>
							Current top slot:{' '}
							<strong css={{ color: colors.text }}>
								{formatUtcInTimeZone(schedule.bestSlotUtc, attendeeTimeZone, {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit',
								})}{' '}
								({schedule.responseCounts[schedule.bestSlotUtc] ?? 0} votes)
							</strong>
						</p>
					) : null}
				</header>

				<form on={{ submit: handleSaveResponse }} css={{ display: 'grid', gap: spacing.md }}>
					<label
						for="attendee-name"
						css={{
							display: 'grid',
							gap: spacing.xs,
							maxWidth: '20rem',
						}}
					>
						<span
							css={{
								fontSize: typography.fontSize.sm,
								fontWeight: typography.fontWeight.medium,
								color: colors.text,
							}}
						>
							Your name
						</span>
						<input
							id="attendee-name"
							value={attendeeName}
							on={{
								input: (event) => {
									if (!(event.currentTarget instanceof HTMLInputElement)) return
									attendeeName = event.currentTarget.value
									handle.update()
								},
							}}
							css={{
								border: `1px solid ${colors.border}`,
								borderRadius: radius.md,
								padding: `${spacing.sm} ${spacing.md}`,
								backgroundColor: colors.surface,
								color: colors.text,
							}}
						/>
					</label>
					{renderScheduleGrid({
						model,
						selectedSlotIds: selectedSlots,
						anchorSlotId,
						ariaLabel: 'Attendee availability selection grid',
						onCellClick: handleCellClick,
						onCellMouseDown: handleCellMouseDown,
						onCellMouseEnter: handleCellMouseEnter,
						onHandlePointerDown: handleSelectionHandlePointerDown,
						onHandlePointerMove: handleSelectionHandlePointerMove,
						onHandlePointerUp: handleSelectionHandlePointerUp,
					})}
					<div css={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
						<button
							type="submit"
							disabled={isSaving}
							css={{
								border: `1px solid ${colors.primary}`,
								backgroundColor: colors.primary,
								color: colors.onPrimary,
								padding: `${spacing.sm} ${spacing.lg}`,
								borderRadius: radius.md,
								fontWeight: typography.fontWeight.semibold,
								cursor: isSaving ? 'not-allowed' : 'pointer',
							}}
						>
							{isSaving ? 'Saving...' : 'Save availability'}
						</button>
						<p css={{ margin: 0, color: colors.textMuted }}>
							{selectedSlots.size} slots selected
						</p>
					</div>
					{errorMessage ? (
						<p role="alert" css={{ margin: 0, color: colors.error }}>
							{errorMessage}
						</p>
					) : null}
					{saveMessage ? (
						<p css={{ margin: 0, color: colors.primaryText }}>{saveMessage}</p>
					) : null}
				</form>
			</section>
		)
	}
}

