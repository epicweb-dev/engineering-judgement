import { type Handle } from 'remix/component'
import { navigate } from '#client/client-router.tsx'
import { setDocumentTitle, toAppTitle } from '#client/document-title.ts'
import {
	colors,
	radius,
	shadows,
	spacing,
	typography,
} from '#client/styles/tokens.ts'

type HostScheduleSummary = {
	shareToken: string
	title: string
	createdAt: string
	claimedAt: string | null
}

function getLocationKey() {
	if (typeof window === 'undefined') return '/account/schedules'
	return `${window.location.pathname}${window.location.search}`
}

export function AccountSchedulesRoute(handle: Handle) {
	let lastLocationKey = ''
	let isLoading = true
	let email = ''
	let errorMessage: string | null = null
	let schedules: Array<HostScheduleSummary> = []

	handle.queueTask(async () => {
		const nextLocationKey = getLocationKey()
		if (nextLocationKey === lastLocationKey) return
		lastLocationKey = nextLocationKey
		isLoading = true
		errorMessage = null
		handle.update()

		try {
			const response = await fetch('/api/account/schedules', {
				headers: { Accept: 'application/json' },
			})
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				email?: string
				schedules?: Array<HostScheduleSummary>
				error?: string
			} | null
			if (handle.signal.aborted || nextLocationKey !== lastLocationKey) return
			if (response.status === 401) {
				navigate(
					`/login?redirectTo=${encodeURIComponent('/account/schedules')}`,
				)
				return
			}
			if (!response.ok || !payload?.ok || !Array.isArray(payload.schedules)) {
				errorMessage =
					typeof payload?.error === 'string'
						? payload.error
						: 'Unable to load your schedules.'
				isLoading = false
				handle.update()
				return
			}
			email = payload.email ?? ''
			schedules = payload.schedules
			isLoading = false
			handle.update()
		} catch {
			if (handle.signal.aborted || nextLocationKey !== lastLocationKey) return
			errorMessage = 'Network error while loading your schedules.'
			isLoading = false
			handle.update()
		}
	})

	return () => {
		setDocumentTitle(toAppTitle('Your schedules'))

		return (
			<section css={{ display: 'grid', gap: spacing.lg }}>
				<header css={{ display: 'grid', gap: spacing.sm }}>
					<h1
						css={{
							margin: 0,
							fontSize: typography.fontSize.xl,
							fontWeight: typography.fontWeight.semibold,
							color: colors.text,
						}}
					>
						Your schedules
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Open any schedule you have already claimed
						{email ? ` as ${email}` : ''}.
					</p>
				</header>

				<div css={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
					<a href="/">Create a new schedule</a>
					<form method="post" action="/logout?redirectTo=/">
						<button
							type="submit"
							css={{
								padding: 0,
								border: 'none',
								background: 'none',
								color: colors.primaryText,
								cursor: 'pointer',
							}}
						>
							Log out
						</button>
					</form>
				</div>

				{isLoading ? (
					<p css={{ margin: 0, color: colors.textMuted }}>
						Loading your schedules…
					</p>
				) : errorMessage ? (
					<p role="alert" css={{ margin: 0, color: colors.error }}>
						{errorMessage}
					</p>
				) : schedules.length === 0 ? (
					<section
						css={{
							display: 'grid',
							gap: spacing.sm,
							padding: spacing.lg,
							borderRadius: radius.lg,
							border: `1px solid ${colors.border}`,
							backgroundColor: colors.surface,
							boxShadow: shadows.sm,
						}}
					>
						<p css={{ margin: 0, color: colors.text }}>
							No claimed schedules yet.
						</p>
						<p css={{ margin: 0, color: colors.textMuted }}>
							Open a private host link, then save that schedule to your account.
						</p>
					</section>
				) : (
					<div css={{ display: 'grid', gap: spacing.md }}>
						{schedules.map((schedule) => (
							<article
								key={schedule.shareToken}
								css={{
									display: 'grid',
									gap: spacing.sm,
									padding: spacing.lg,
									borderRadius: radius.lg,
									border: `1px solid ${colors.border}`,
									backgroundColor: colors.surface,
									boxShadow: shadows.sm,
								}}
							>
								<h2
									css={{
										margin: 0,
										fontSize: typography.fontSize.lg,
										color: colors.text,
									}}
								>
									{schedule.title}
								</h2>
								<p css={{ margin: 0, color: colors.textMuted }}>
									Claimed{' '}
									{new Date(
										schedule.claimedAt ?? schedule.createdAt,
									).toLocaleString()}
								</p>
								<div css={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
									<a
										href={`/account/schedules/${encodeURIComponent(schedule.shareToken)}`}
									>
										Open dashboard
									</a>
									<a href={`/s/${encodeURIComponent(schedule.shareToken)}`}>
										Attendee view
									</a>
								</div>
							</article>
						))}
					</div>
				)}
			</section>
		)
	}
}
