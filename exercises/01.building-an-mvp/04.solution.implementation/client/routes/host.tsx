import { type Handle } from 'remix/component'
import { colors, radius, spacing, typography } from '#client/styles/tokens.ts'

type HostRouteStatus = 'loading' | 'ready' | 'error'

type HostPayload = {
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
	host: {
		sharePath: string
	}
}

function readEventIdFromPath(pathname: string) {
	const match = /^\/host\/(\d+)$/.exec(pathname)
	return match?.[1] ?? null
}

function readCurrentHostKey() {
	if (typeof window === 'undefined') return ''
	return new URLSearchParams(window.location.search).get('key') ?? ''
}

function readCreatedMessage() {
	if (typeof window === 'undefined') return null
	return new URLSearchParams(window.location.search).get('created') === '1'
		? 'Schedule created. Save this private host link.'
		: null
}

function readFinalizedMessage() {
	if (typeof window === 'undefined') return null
	return new URLSearchParams(window.location.search).get('finalized') === '1'
		? 'Finalized schedule updated.'
		: null
}

function readErrorMessage() {
	if (typeof window === 'undefined') return null
	return new URLSearchParams(window.location.search).get('error')
}

export function HostRoute(handle: Handle) {
	let status: HostRouteStatus = 'loading'
	let currentKey = ''
	let currentEventId: string | null = null
	let currentSearch = ''
	let payload: HostPayload | null = null
	let message: string | null = null

	function setLoading(eventId: string, hostKey: string, search: string) {
		currentEventId = eventId
		currentKey = hostKey
		currentSearch = search
		status = 'loading'
		payload = null
		message = null
	}

	async function loadHost(
		signal: AbortSignal,
		eventId: string,
		hostKey: string,
		search: string,
	) {
		try {
			const endpoint = new URL(`/host/${eventId}/data`, window.location.origin)
			endpoint.searchParams.set('key', hostKey)
			const response = await fetch(endpoint.toString(), {
				headers: { Accept: 'application/json' },
				signal,
			})
			if (
				signal.aborted ||
				currentEventId !== eventId ||
				currentKey !== hostKey ||
				currentSearch !== search
			) {
				return
			}
			if (!response.ok) {
				status = 'error'
				message = 'Unable to load the host dashboard.'
				handle.update()
				return
			}
			payload = (await response.json()) as HostPayload
			status = 'ready'
			message = null
			handle.update()
		} catch {
			if (
				signal.aborted ||
				currentEventId !== eventId ||
				currentKey !== hostKey ||
				currentSearch !== search
			) {
				return
			}
			status = 'error'
			message = 'Unable to load the host dashboard.'
			handle.update()
		}
	}

	return () => {
		const eventId =
			typeof window === 'undefined'
				? null
				: readEventIdFromPath(window.location.pathname)
		const search = typeof window === 'undefined' ? '' : window.location.search
		const hostKey = readCurrentHostKey().trim()
		const createdMessage = readCreatedMessage()
		const finalizedMessage = readFinalizedMessage()
		const errorMessage = readErrorMessage()

		if (!eventId) {
			return (
				<section>
					<h1 css={{ marginTop: 0 }}>Host dashboard unavailable</h1>
					<p>Invalid host link.</p>
				</section>
			)
		}

		if (!hostKey) {
			return (
				<section>
					<h1 css={{ marginTop: 0 }}>Host dashboard unavailable</h1>
					<p>This link is missing the private host key.</p>
				</section>
			)
		}

		if (
			currentEventId !== eventId ||
			currentKey !== hostKey ||
			currentSearch !== search
		) {
			setLoading(eventId, hostKey, search)
		}

		if (status === 'loading') {
			handle.queueTask((signal) => loadHost(signal, eventId, hostKey, search))
		}

		const hostPayload = status === 'ready' ? payload : null
		const shareLink =
			typeof window === 'undefined' || !hostPayload
				? ''
				: `${window.location.origin}${hostPayload.host.sharePath}`

		return (
			<section css={{ display: 'grid', gap: spacing.lg }}>
				<header css={{ display: 'grid', gap: spacing.xs }}>
					<h1
						css={{
							fontSize: typography.fontSize['2xl'],
							margin: 0,
						}}
					>
						{payload?.event.title ?? 'Host dashboard'}
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Track responses, then finalize one time.
					</p>
				</header>

				{createdMessage ? (
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
						{createdMessage}
					</p>
				) : null}

				{finalizedMessage ? (
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
						{finalizedMessage}
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
					<p css={{ color: colors.textMuted }}>Loading host dashboard…</p>
				) : null}

				{status === 'error' ? (
					<p role="alert" css={{ color: colors.error }}>
						{message ?? 'Unable to load the host dashboard.'}
					</p>
				) : null}

				{hostPayload ? (
					<>
						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span
								css={{
									fontWeight: typography.fontWeight.medium,
									color: colors.text,
								}}
							>
								Share this participant link
							</span>
							<input
								type="text"
								value={shareLink}
								readOnly
								css={{
									border: `1px solid ${colors.border}`,
									borderRadius: radius.md,
									padding: spacing.sm,
									font: 'inherit',
									background: colors.surface,
								}}
							/>
						</label>

						{hostPayload.event.finalizedSlotLabel ? (
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
								Finalized time: {hostPayload.event.finalizedSlotLabel}
							</p>
						) : null}

						<ul
							css={{
								listStyle: 'none',
								padding: 0,
								margin: 0,
								display: 'grid',
								gap: spacing.md,
							}}
						>
							{hostPayload.slots.map((slot) => {
								const voteSummary = hostPayload.votes.find(
									(vote) => vote.slotId === slot.id,
								)
								const participantList = voteSummary?.participants ?? []
								return (
									<li
										key={slot.id}
										css={{
											display: 'grid',
											gap: spacing.sm,
											padding: spacing.md,
											borderRadius: radius.md,
											border: `1px solid ${colors.border}`,
										}}
									>
										<div
											css={{
												display: 'flex',
												flexWrap: 'wrap',
												alignItems: 'center',
												justifyContent: 'space-between',
												gap: spacing.sm,
											}}
										>
											<strong>{slot.label}</strong>
											<span css={{ color: colors.textMuted }}>
												{voteSummary?.count ?? 0} available
											</span>
										</div>
										<p css={{ margin: 0, color: colors.textMuted }}>
											{participantList.length
												? participantList.join(', ')
												: 'No availability yet.'}
										</p>
										<form
											method="post"
											action={`/host/${eventId}/finalize`}
											css={{ margin: 0 }}
										>
											<input type="hidden" name="key" value={hostKey} />
											<input type="hidden" name="slotId" value={slot.id} />
											<button
												type="submit"
												css={{
													border: `1px solid ${colors.primary}`,
													background: colors.primary,
													color: colors.onPrimary,
													borderRadius: radius.full,
													padding: `${spacing.xs} ${spacing.md}`,
													fontWeight: typography.fontWeight.semibold,
													cursor: 'pointer',
												}}
											>
												Finalize this time
											</button>
										</form>
									</li>
								)
							})}
						</ul>
					</>
				) : null}
			</section>
		)
	}
}
