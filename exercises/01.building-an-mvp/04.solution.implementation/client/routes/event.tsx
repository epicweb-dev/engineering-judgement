import { type Handle } from 'remix/component'
import { colors, radius, spacing, typography } from '#client/styles/tokens.ts'

type EventRouteStatus = 'loading' | 'ready' | 'error'

type EventPayload = {
	ok: true
	event: {
		id: number
		title: string
		finalizedSlotId: number
		finalizedSlotLabel: string | null
	}
	slots: Array<{
		id: number
		label: string
		sortOrder: number
	}>
	votes: Array<{
		slotId: number
		count: number
		participants: Array<string>
	}>
}

function readEventIdFromPath(pathname: string) {
	const match = /^\/event\/(\d+)$/.exec(pathname)
	return match?.[1] ?? null
}

function readSavedMessage() {
	if (typeof window === 'undefined') return null
	const params = new URLSearchParams(window.location.search)
	if (params.get('saved') !== '1') return null
	const participantName = params.get('name')
	return participantName
		? `Saved availability for ${participantName}.`
		: 'Saved availability.'
}

function readErrorMessage() {
	if (typeof window === 'undefined') return null
	return new URLSearchParams(window.location.search).get('error')
}

export function EventRoute(handle: Handle) {
	let status: EventRouteStatus = 'loading'
	let currentEventId: string | null = null
	let payload: EventPayload | null = null
	let message: string | null = null

	function setLoadingForEvent(eventId: string) {
		currentEventId = eventId
		status = 'loading'
		payload = null
		message = null
	}

	async function loadEvent(signal: AbortSignal, eventId: string) {
		try {
			const response = await fetch(`/events/${eventId}/data`, {
				headers: { Accept: 'application/json' },
				signal,
			})
			if (signal.aborted || currentEventId !== eventId) return
			if (!response.ok) {
				status = 'error'
				message = 'Unable to load this event.'
				handle.update()
				return
			}
			const data = (await response.json()) as EventPayload
			payload = data
			status = 'ready'
			message = null
			handle.update()
		} catch {
			if (signal.aborted || currentEventId !== eventId) return
			status = 'error'
			message = 'Unable to load this event.'
			handle.update()
		}
	}

	return () => {
		const eventId =
			typeof window === 'undefined'
				? null
				: readEventIdFromPath(window.location.pathname)
		const savedMessage = readSavedMessage()
		const errorMessage = readErrorMessage()

		if (!eventId) {
			return (
				<section>
					<h1 css={{ marginTop: 0 }}>Event not found</h1>
					<p>Invalid event link.</p>
				</section>
			)
		}

		if (currentEventId !== eventId) {
			setLoadingForEvent(eventId)
		}

		if (status === 'loading') {
			handle.queueTask((signal) => loadEvent(signal, eventId))
		}

		return (
			<section css={{ display: 'grid', gap: spacing.lg }}>
				<header css={{ display: 'grid', gap: spacing.xs }}>
					<h1
						css={{
							fontSize: typography.fontSize['2xl'],
							margin: 0,
						}}
					>
						{payload?.event.title ?? 'Loading event…'}
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Pick every time you can make. No account needed.
					</p>
				</header>

				{savedMessage ? (
					<p
						role="status"
						css={{
							margin: 0,
							padding: `${spacing.sm} ${spacing.md}`,
							borderRadius: radius.md,
							background: colors.primarySoft,
							color: colors.primaryText,
						}}
					>
						{savedMessage}
					</p>
				) : null}

				{errorMessage ? (
					<p
						role="alert"
						css={{
							margin: 0,
							padding: `${spacing.sm} ${spacing.md}`,
							borderRadius: radius.md,
							background: 'color-mix(in srgb, #dc2626 12%, white)',
							color: colors.error,
						}}
					>
						{errorMessage}
					</p>
				) : null}

				{status === 'loading' ? (
					<p css={{ color: colors.textMuted }}>Loading options…</p>
				) : null}

				{status === 'error' ? (
					<p role="alert" css={{ color: colors.error }}>
						{message ?? 'Unable to load this event.'}
					</p>
				) : null}

				{status === 'ready' && payload ? (
					<>
						{payload.event.finalizedSlotLabel ? (
							<p
								role="status"
								css={{
									margin: 0,
									padding: `${spacing.sm} ${spacing.md}`,
									borderRadius: radius.md,
									background: colors.primarySoft,
									color: colors.primaryText,
									fontWeight: typography.fontWeight.medium,
								}}
							>
								Finalized time: {payload.event.finalizedSlotLabel}
							</p>
						) : null}
						<form
							method="post"
							action={`/event/${eventId}/respond`}
							css={{ display: 'grid', gap: spacing.md }}
						>
							<label css={{ display: 'grid', gap: spacing.xs }}>
								<span
									css={{
										fontWeight: typography.fontWeight.medium,
										color: colors.text,
									}}
								>
									Your name
								</span>
								<input
									type="text"
									name="participantName"
									required
									maxLength={60}
									placeholder="Alex"
									css={{
										border: `1px solid ${colors.border}`,
										borderRadius: radius.md,
										padding: spacing.sm,
										font: 'inherit',
									}}
								/>
							</label>

							<fieldset
								css={{
									margin: 0,
									padding: spacing.md,
									border: `1px solid ${colors.border}`,
									borderRadius: radius.md,
									display: 'grid',
									gap: spacing.sm,
								}}
							>
								<legend
									css={{
										padding: `0 ${spacing.xs}`,
										fontWeight: typography.fontWeight.medium,
									}}
								>
									I can make these times
								</legend>
								{payload.slots.map((slot) => (
									<label
										key={slot.id}
										css={{
											display: 'flex',
											alignItems: 'center',
											gap: spacing.sm,
										}}
									>
										<input type="checkbox" name="slotIds" value={slot.id} />
										<span>{slot.label}</span>
									</label>
								))}
							</fieldset>

							<button
								type="submit"
								css={{
									border: `1px solid ${colors.primary}`,
									background: colors.primary,
									color: colors.onPrimary,
									borderRadius: radius.full,
									padding: `${spacing.sm} ${spacing.lg}`,
									fontWeight: typography.fontWeight.semibold,
									cursor: 'pointer',
									justifySelf: 'start',
								}}
							>
								Submit availability
							</button>
						</form>
					</>
				) : null}
			</section>
		)
	}
}
