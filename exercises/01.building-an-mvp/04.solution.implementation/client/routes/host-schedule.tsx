import { type Handle } from 'remix/component'
import {
	collectRangeSlotIds,
	createGridModel,
	renderScheduleGrid,
} from '#client/schedule-grid.tsx'
import {
	colors,
	mq,
	radius,
	spacing,
	typography,
} from '#client/styles/tokens.ts'
import {
	formatUtcInTimeZone,
	generateLocalSlotKeys,
	localSlotKeyToUtcIso,
	normalizeIanaTimeZone,
	slotIncrementOptions,
	type SlotIncrement,
	utcIsoToLocalSlotKey,
} from '#shared/scheduling-time.ts'

type SchedulePayload = {
	scheduleKey: string
	title: string
	startDate: string
	endDate: string
	slotMinutes: SlotIncrement
	timezone: string
	slotsUtc: Array<string>
	responseCounts: Record<string, number>
	totalResponders: number
	bestSlotUtc: string | null
}

type HostResponse = {
	ok: boolean
	schedule: SchedulePayload
	hostKey: string
	attendeeSummary: Array<{ attendeeName: string; slots: Array<string> }>
}

function getHostParamsFromPath() {
	if (typeof window === 'undefined') return null
	const segments = window.location.pathname.split('/').filter(Boolean)
	if (segments.length !== 3) return null
	if (segments[0] !== 's') return null
	return {
		scheduleKey: segments[1] ?? '',
		hostKey: segments[2] ?? '',
	}
}

export function HostScheduleRoute(handle: Handle) {
	const hostParams = getHostParamsFromPath()
	let status: 'loading' | 'ready' | 'error' = 'loading'
	let errorMessage: string | null = null
	let isSaving = false
	let saveMessage: string | null = null
	let requestQueued = false
	let listenersAttached = false
	let attendeeSummary: Array<{ attendeeName: string; slots: Array<string> }> = []
	let title = ''
	let startDate = ''
	let endDate = ''
	let slotMinutes: SlotIncrement = 30
	let timezone = 'UTC'
	let selectedLocalSlots = new Set<string>()
	let scheduleSnapshot: SchedulePayload | null = null
	let anchorSlotId: string | null = null
	let isMouseDragging = false
	let dragMode: 'add' | 'remove' | null = null
	let isHandleDragging = false

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
			for (const slot of localSlots) next.add(slot)
		}
		selectedLocalSlots = next
		if (anchorSlotId && !selectedLocalSlots.has(anchorSlotId)) {
			anchorSlotId = null
		}
	}

	function queueLoad() {
		if (requestQueued) return
		requestQueued = true
		if (!hostParams) {
			status = 'error'
			errorMessage = 'Invalid host link.'
			handle.update()
			return
		}

		handle.queueTask(async (signal) => {
			try {
				const response = await fetch(
					`/api/schedules/${encodeURIComponent(hostParams.scheduleKey)}/${encodeURIComponent(hostParams.hostKey)}`,
					{
						headers: { Accept: 'application/json' },
						signal,
					},
				)
				const payload = (await response.json().catch(() => null)) as
					| HostResponse
					| { error?: string }
					| null
				if (signal.aborted) return
				if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
					status = 'error'
					errorMessage =
						(payload && 'error' in payload && payload.error) ||
						'Unable to load host dashboard.'
					handle.update()
					return
				}

				const nextSchedule = payload.schedule
				scheduleSnapshot = nextSchedule
				attendeeSummary = payload.attendeeSummary
				title = nextSchedule.title
				startDate = nextSchedule.startDate
				endDate = nextSchedule.endDate
				slotMinutes = nextSchedule.slotMinutes
				timezone = normalizeIanaTimeZone(nextSchedule.timezone)
				selectedLocalSlots = new Set(
					nextSchedule.slotsUtc.map((slotUtc) =>
						utcIsoToLocalSlotKey(slotUtc, nextSchedule.timezone),
					),
				)
				status = 'ready'
				errorMessage = null
				handle.update()
			} catch {
				if (signal.aborted) return
				status = 'error'
				errorMessage = 'Network error while loading host dashboard.'
				handle.update()
			}
		})
	}

	function attendeeUrl() {
		if (!hostParams || typeof window === 'undefined') return ''
		return `${window.location.origin}/s/${hostParams.scheduleKey}`
	}

	function hostUrl() {
		if (!hostParams || typeof window === 'undefined') return ''
		return `${window.location.origin}/s/${hostParams.scheduleKey}/${hostParams.hostKey}`
	}

	async function copyLink(value: string) {
		try {
			await navigator.clipboard.writeText(value)
			saveMessage = 'Link copied.'
			handle.update()
		} catch {
			errorMessage = 'Unable to copy link in this browser.'
			handle.update()
		}
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

	async function handleSaveSchedule(event: SubmitEvent) {
		event.preventDefault()
		if (!hostParams) return
		errorMessage = null
		saveMessage = null
		isSaving = true
		handle.update()

		try {
			const selectedSlotsUtc = [...selectedLocalSlots].map((slotKey) =>
				localSlotKeyToUtcIso(slotKey, timezone),
			)
			const response = await fetch(
				`/api/schedules/${encodeURIComponent(hostParams.scheduleKey)}/${encodeURIComponent(hostParams.hostKey)}`,
				{
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
				},
			)
			const payload = (await response.json().catch(() => null)) as
				| HostResponse
				| { error?: string }
				| null
			if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
				errorMessage =
					(payload && 'error' in payload && payload.error) ||
					'Unable to save schedule.'
				isSaving = false
				handle.update()
				return
			}

			scheduleSnapshot = payload.schedule
			attendeeSummary = payload.attendeeSummary
			saveMessage = 'Schedule updated.'
			isSaving = false
			handle.update()
		} catch {
			errorMessage = 'Network error while updating schedule.'
			isSaving = false
			handle.update()
		}
	}

	return () => {
		ensureListeners()
		queueLoad()

		if (status === 'loading') {
			return <p css={{ margin: 0, color: colors.textMuted }}>Loading host dashboard...</p>
		}

		if (status === 'error' || !hostParams) {
			return (
				<p role="alert" css={{ margin: 0, color: colors.error }}>
					{errorMessage ?? 'Unable to load host dashboard.'}
				</p>
			)
		}

		const localSlots = generateLocalSlotKeys(startDate, endDate, slotMinutes)
		const gridSlots = localSlots.map((localSlotKey) => ({
			id: localSlotKey,
			startsAtUtc: localSlotKeyToUtcIso(localSlotKey, timezone),
		}))
		const model = createGridModel(gridSlots, timezone)

		return (
			<section css={{ display: 'grid', gap: spacing.lg }}>
				<header css={{ display: 'grid', gap: spacing.sm }}>
					<h1
						css={{
							margin: 0,
							color: colors.text,
							fontSize: typography.fontSize.xl,
						}}
					>
						Host dashboard
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Share your attendee link, tune schedule details, and review responses.
					</p>
				</header>

				<div
					css={{
						display: 'grid',
						gap: spacing.md,
						padding: spacing.md,
						borderRadius: radius.md,
						border: `1px solid ${colors.border}`,
						backgroundColor: colors.surface,
					}}
				>
					<div css={{ display: 'grid', gap: spacing.xs }}>
						<p css={{ margin: 0, color: colors.textMuted }}>Attendee link</p>
						<div css={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
							<code
								css={{
									backgroundColor: colors.background,
									padding: `${spacing.xs} ${spacing.sm}`,
									borderRadius: radius.sm,
								}}
							>
								{attendeeUrl()}
							</code>
							<button
								type="button"
								on={{ click: () => copyLink(attendeeUrl()) }}
								css={{
									border: `1px solid ${colors.primary}`,
									backgroundColor: colors.primary,
									color: colors.onPrimary,
									padding: `${spacing.xs} ${spacing.md}`,
									borderRadius: radius.md,
									cursor: 'pointer',
								}}
							>
								Copy attendee link
							</button>
						</div>
					</div>
					<div css={{ display: 'grid', gap: spacing.xs }}>
						<p css={{ margin: 0, color: colors.textMuted }}>Private host link</p>
						<div css={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
							<code
								css={{
									backgroundColor: colors.background,
									padding: `${spacing.xs} ${spacing.sm}`,
									borderRadius: radius.sm,
								}}
							>
								{hostUrl()}
							</code>
							<button
								type="button"
								on={{ click: () => copyLink(hostUrl()) }}
								css={{
									border: `1px solid ${colors.primary}`,
									backgroundColor: colors.primary,
									color: colors.onPrimary,
									padding: `${spacing.xs} ${spacing.md}`,
									borderRadius: radius.md,
									cursor: 'pointer',
								}}
							>
								Copy host link
							</button>
						</div>
					</div>
				</div>

				<form on={{ submit: handleSaveSchedule }} css={{ display: 'grid', gap: spacing.md }}>
					<div
						css={{
							display: 'grid',
							gap: spacing.md,
							gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
							[mq.tablet]: {
								gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
							},
							[mq.mobile]: {
								gridTemplateColumns: '1fr',
							},
						}}
					>
						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text, fontSize: typography.fontSize.sm }}>
								Plan title
							</span>
							<input
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
								}}
							/>
						</label>
						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text, fontSize: typography.fontSize.sm }}>
								Start date
							</span>
							<input
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
								}}
							/>
						</label>
						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text, fontSize: typography.fontSize.sm }}>
								End date
							</span>
							<input
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
								}}
							/>
						</label>
						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text, fontSize: typography.fontSize.sm }}>
								Slot size
							</span>
							<select
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
								}}
							>
								{slotIncrementOptions.map((value) => (
									<option key={String(value)} value={String(value)}>
										{value} minutes
									</option>
								))}
							</select>
						</label>
						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text, fontSize: typography.fontSize.sm }}>
								Timezone
							</span>
							<input
								value={timezone}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement)) return
										timezone = normalizeIanaTimeZone(event.currentTarget.value)
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
					</div>

					{renderScheduleGrid({
						model,
						selectedSlotIds: selectedLocalSlots,
						anchorSlotId,
						ariaLabel: 'Host availability editing grid',
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
							{isSaving ? 'Saving...' : 'Save schedule changes'}
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
					{saveMessage ? (
						<p css={{ margin: 0, color: colors.primaryText }}>{saveMessage}</p>
					) : null}
				</form>

				<section
					css={{
						display: 'grid',
						gap: spacing.sm,
						padding: spacing.md,
						border: `1px solid ${colors.border}`,
						borderRadius: radius.md,
						backgroundColor: colors.surface,
					}}
				>
					<h2
						css={{
							margin: 0,
							color: colors.text,
							fontSize: typography.fontSize.lg,
						}}
					>
						Response summary
					</h2>
					<p css={{ margin: 0, color: colors.textMuted }}>
						{scheduleSnapshot?.totalResponders ?? 0} attendees responded.
					</p>
					{scheduleSnapshot?.bestSlotUtc ? (
						<p css={{ margin: 0, color: colors.textMuted }}>
							Best slot:{' '}
							<strong css={{ color: colors.text }}>
								{formatUtcInTimeZone(scheduleSnapshot.bestSlotUtc, timezone, {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit',
								})}{' '}
								({scheduleSnapshot.responseCounts[scheduleSnapshot.bestSlotUtc] ?? 0}{' '}
								votes, {timezone})
							</strong>
						</p>
					) : (
						<p css={{ margin: 0, color: colors.textMuted }}>
							No attendee responses yet.
						</p>
					)}
					{attendeeSummary.length > 0 ? (
						<ul
							css={{
								margin: 0,
								paddingInlineStart: spacing.lg,
								color: colors.text,
								display: 'grid',
								gap: spacing.xs,
							}}
						>
							{attendeeSummary.map((attendee) => (
								<li key={attendee.attendeeName}>
									{attendee.attendeeName} ({attendee.slots.length} slots)
								</li>
							))}
						</ul>
					) : null}
				</section>
			</section>
		)
	}
}

