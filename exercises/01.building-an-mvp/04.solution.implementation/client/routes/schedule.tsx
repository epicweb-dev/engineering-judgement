import { type Handle } from 'remix/component'
import { FormField } from '#client/components/form-field.tsx'
import { PrimaryButton } from '#client/components/primary-button.tsx'
import { ScheduleGrid } from '#client/components/schedule-grid.tsx'
import {
	createSchedule,
	fetchSchedule,
	submitScheduleResponse,
	updateSchedule,
} from '#client/schedule-api.ts'
import {
	colors,
	radius,
	shadows,
	spacing,
	typography,
} from '#client/styles/tokens.ts'
import {
	createDateRange,
	type SlotId,
} from '#shared/schedule-model.ts'

type RouteMode = 'create' | 'respond' | 'edit'
type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

type RouteContext = {
	mode: RouteMode
	scheduleKey: string | null
	hostKey: string | null
}

function getRouteContext(pathname: string): RouteContext {
	if (pathname === '/') {
		return { mode: 'create', scheduleKey: null, hostKey: null }
	}
	const editMatch = pathname.match(/^\/s\/([^/]+)\/([^/]+)$/)
	if (editMatch) {
		const scheduleKey = editMatch[1]
		const hostKey = editMatch[2]
		if (!scheduleKey || !hostKey) {
			return { mode: 'create', scheduleKey: null, hostKey: null }
		}
		return {
			mode: 'edit',
			scheduleKey: decodeURIComponent(scheduleKey),
			hostKey: decodeURIComponent(hostKey),
		}
	}
	const respondMatch = pathname.match(/^\/s\/([^/]+)$/)
	if (respondMatch) {
		const scheduleKey = respondMatch[1]
		if (!scheduleKey) {
			return { mode: 'create', scheduleKey: null, hostKey: null }
		}
		return {
			mode: 'respond',
			scheduleKey: decodeURIComponent(scheduleKey),
			hostKey: null,
		}
	}
	return { mode: 'create', scheduleKey: null, hostKey: null }
}

function todayIsoDate() {
	return new Date().toISOString().slice(0, 10)
}

function plusDays(isoDate: string, days: number) {
	const date = new Date(`${isoDate}T00:00:00.000Z`)
	date.setUTCDate(date.getUTCDate() + days)
	return date.toISOString().slice(0, 10)
}

function summarizeTopSlots(
	responses: Array<{ attendeeName: string; slots: Array<SlotId> }>,
) {
	const counts = new Map<SlotId, number>()
	for (const response of responses) {
		for (const slot of response.slots) {
			counts.set(slot, (counts.get(slot) ?? 0) + 1)
		}
	}
	return Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
}

export function ScheduleRoute(handle: Handle) {
	const initialStart = todayIsoDate()
	const initialEnd = plusDays(initialStart, 4)

	let title = 'Weekend plans'
	let startDate = initialStart
	let endDate = initialEnd
	let attendeeName = ''
	let selectedSlots: Array<SlotId> = []
	let hostSlots: Array<SlotId> = []
	let responses: Array<{ attendeeName: string; slots: Array<SlotId> }> = []
	let status: SaveStatus = 'idle'
	let message: string | null = null
	let loadedScheduleKey: string | null = null
	let loadedRoutePathname: string | null = null

	function setState(nextStatus: SaveStatus, nextMessage: string | null = null) {
		status = nextStatus
		message = nextMessage
		handle.update()
	}

	function setSelectedSlots(next: Array<SlotId>) {
		selectedSlots = next
		handle.update()
	}

	async function ensureLoaded(pathname: string, signal: AbortSignal) {
		const context = getRouteContext(pathname)
		if (context.mode === 'create') {
			hostSlots = selectedSlots
			responses = []
			loadedScheduleKey = null
			loadedRoutePathname = pathname
			return
		}
		if (!context.scheduleKey) return
		if (
			loadedScheduleKey === context.scheduleKey &&
			loadedRoutePathname === pathname &&
			status !== 'error'
		) {
			return
		}
		const schedule = await fetchSchedule(context.scheduleKey, signal)
		if (signal.aborted) return
		title = schedule.title
		startDate = schedule.startDate
		endDate = schedule.endDate
		hostSlots = schedule.hostSlots
		responses = schedule.responses
		selectedSlots = context.mode === 'edit' ? schedule.hostSlots : []
		loadedScheduleKey = context.scheduleKey
		loadedRoutePathname = pathname
		setState('idle')
	}

	handle.queueTask(async (signal) => {
		if (typeof window === 'undefined') return
		try {
			await ensureLoaded(window.location.pathname, signal)
		} catch (error) {
			if (signal.aborted) return
			const fallback = 'Unable to load schedule.'
			const nextMessage = error instanceof Error ? error.message : fallback
			setState('error', nextMessage || fallback)
		}
	})

	async function saveCurrentMode(pathname: string) {
		const context = getRouteContext(pathname)
		if (context.mode === 'respond' && !context.scheduleKey) return

		setState('saving')
		try {
			if (context.mode === 'create') {
				const created = await createSchedule({
					title,
					startDate,
					endDate,
					hostSlots: selectedSlots,
				})
				if (typeof window !== 'undefined') {
					window.location.assign(`/s/${created.scheduleKey}/${created.hostKey}`)
					return
				}
				setState('success', 'Schedule created.')
				return
			}

			if (context.mode === 'edit' && context.scheduleKey && context.hostKey) {
				await updateSchedule(context.scheduleKey, context.hostKey, {
					title,
					startDate,
					endDate,
					hostSlots: selectedSlots,
				})
				hostSlots = selectedSlots
				setState('success', 'Schedule updated.')
				return
			}

			if (context.mode === 'respond' && context.scheduleKey) {
				await submitScheduleResponse(context.scheduleKey, {
					attendeeName,
					slots: selectedSlots,
				})
				setState('success', 'Availability submitted.')
				return
			}
		} catch (error) {
			const fallback =
				context.mode === 'respond'
					? 'Unable to submit availability.'
					: 'Unable to save schedule.'
			const nextMessage = error instanceof Error ? error.message : fallback
			setState('error', nextMessage || fallback)
			return
		}
		setState('idle')
	}

	return () => {
		const pathname =
			typeof window === 'undefined' ? '/' : window.location.pathname
		const context = getRouteContext(pathname)
		const isCreate = context.mode === 'create'
		const isEdit = context.mode === 'edit'
		const isRespond = context.mode === 'respond'
		const enabledSlots =
			isRespond && hostSlots.length > 0 ? hostSlots : undefined
		const canSave = status !== 'saving'
		const dateCount = createDateRange(startDate, endDate).length
		const topSlots = summarizeTopSlots(responses)
		const respondentLink = context.scheduleKey
			? `/s/${encodeURIComponent(context.scheduleKey)}`
			: null

		return (
			<section css={{ display: 'grid', gap: spacing.lg }}>
				<header css={{ display: 'grid', gap: spacing.xs }}>
					<h1
						css={{
							margin: 0,
							fontSize: typography.fontSize.xl,
							color: colors.text,
						}}
					>
						{isCreate
							? 'Create availability schedule'
							: isEdit
								? 'Edit schedule + review responses'
								: 'Share your availability'}
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						{isCreate
							? 'Pick dates, set your availability, and create a share link.'
							: isEdit
								? 'Adjust host slots, copy links, and watch responses arrive.'
								: 'Enter your name and select the times that work for you.'}
					</p>
				</header>

				<div
					css={{
						display: 'grid',
						gap: spacing.md,
						padding: spacing.lg,
						borderRadius: radius.lg,
						backgroundColor: colors.surface,
						border: `1px solid ${colors.border}`,
						boxShadow: shadows.sm,
					}}
				>
					<FormField
						setup={{
							label: 'Plan title',
							control: (
								<input
									type="text"
									value={title}
									on={{
										input: (event) => {
											if (!(event.currentTarget instanceof HTMLInputElement)) return
											title = event.currentTarget.value
											handle.update()
										},
									}}
								/>
							),
						}}
					/>
					<div
						css={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
							gap: spacing.md,
						}}
					>
						<FormField
							setup={{
								label: 'Start date',
								control: (
									<input
										type="date"
										value={startDate}
										on={{
											input: (event) => {
												if (!(event.currentTarget instanceof HTMLInputElement)) return
												startDate = event.currentTarget.value
												handle.update()
											},
										}}
									/>
								),
							}}
						/>
						<FormField
							setup={{
								label: 'End date',
								control: (
									<input
										type="date"
										value={endDate}
										on={{
											input: (event) => {
												if (!(event.currentTarget instanceof HTMLInputElement)) return
												endDate = event.currentTarget.value
												handle.update()
											},
										}}
									/>
								),
							}}
						/>
					</div>
					{isRespond ? (
						<FormField
							setup={{
								label: 'Your name',
								hint: 'Used to identify your response in host view.',
								control: (
									<input
										type="text"
										value={attendeeName}
										on={{
											input: (event) => {
												if (!(event.currentTarget instanceof HTMLInputElement)) return
												attendeeName = event.currentTarget.value
												handle.update()
											},
										}}
									/>
								),
							}}
						/>
					) : null}
				</div>

				<ScheduleGrid
					setup={{
						startDate,
						endDate,
						selectedSlots,
						enabledSlots,
						onSelectedSlotsChange: setSelectedSlots,
					}}
				/>

				<div css={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
					<PrimaryButton
						setup={{
							type: 'button',
							disabled: !canSave,
							label:
								status === 'saving'
									? 'Saving...'
									: isCreate
										? 'Create schedule'
										: isEdit
											? 'Save updates'
											: 'Submit availability',
							onClick: () => {
								void saveCurrentMode(pathname)
							},
						}}
					/>
					<span css={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>
						{dateCount} day{dateCount === 1 ? '' : 's'} selected, {selectedSlots.length}{' '}
						slot{selectedSlots.length === 1 ? '' : 's'} active
					</span>
				</div>

				{message ? (
					<p
						css={{
							margin: 0,
							color: status === 'error' ? colors.error : colors.primaryText,
						}}
					>
						{message}
					</p>
				) : null}

				{isEdit && respondentLink ? (
					<section
						css={{
							display: 'grid',
							gap: spacing.md,
							padding: spacing.lg,
							borderRadius: radius.lg,
							backgroundColor: colors.surface,
							border: `1px solid ${colors.border}`,
						}}
					>
						<h2
							css={{
								margin: 0,
								fontSize: typography.fontSize.lg,
								color: colors.text,
							}}
						>
							Share + response review
						</h2>
						<p css={{ margin: 0, color: colors.textMuted }}>
							Respondent link:{' '}
							<a href={respondentLink} css={{ color: colors.primaryText }}>
								{respondentLink}
							</a>
						</p>
						<p css={{ margin: 0, color: colors.textMuted }}>
							Responses: {responses.length}
						</p>
						{topSlots.length > 0 ? (
							<ul css={{ margin: 0, paddingLeft: spacing.lg, color: colors.textMuted }}>
								{topSlots.map(([slot, count]) => (
									<li key={slot}>
										{slot} — {count} vote{count === 1 ? '' : 's'}
									</li>
								))}
							</ul>
						) : (
							<p css={{ margin: 0, color: colors.textMuted }}>
								No attendee responses yet.
							</p>
						)}
					</section>
				) : null}
			</section>
		)
	}
}

