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

function normalizeRedirectTo(value: string | null) {
	if (!value) return '/account/schedules'
	if (!value.startsWith('/')) return '/account/schedules'
	if (value.startsWith('//')) return '/account/schedules'
	return value
}

function getLocationKey() {
	if (typeof window === 'undefined') return '/login'
	return `${window.location.pathname}${window.location.search}`
}

function getErrorMessage(code: string | null) {
	if (code === 'expired-link') {
		return 'That sign-in link expired. Request a fresh link below.'
	}
	if (code === 'invalid-link') {
		return 'That sign-in link is invalid. Request a fresh link below.'
	}
	return null
}

export function LoginRoute(handle: Handle) {
	let lastLocationKey = ''
	let redirectTo = '/account/schedules'
	let email = ''
	let isCheckingSession = true
	let isSubmitting = false
	let statusMessage: string | null = null
	let statusIsError = false
	let loginLink: string | null = null
	let expiresAt: string | null = null

	async function copyLoginLink() {
		if (!loginLink || typeof navigator === 'undefined') return
		try {
			await navigator.clipboard.writeText(loginLink)
			statusMessage = 'Sign-in link copied.'
			statusIsError = false
			handle.update()
		} catch {
			statusMessage = 'Unable to copy the sign-in link.'
			statusIsError = true
			handle.update()
		}
	}

	async function requestLoginLink() {
		const normalizedEmail = email.trim()
		if (!normalizedEmail) {
			statusMessage = 'Enter your email address to continue.'
			statusIsError = true
			handle.update()
			return
		}

		isSubmitting = true
		statusMessage = 'Creating sign-in link…'
		statusIsError = false
		loginLink = null
		expiresAt = null
		handle.update()

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: normalizedEmail,
					redirectTo,
				}),
			})
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				email?: string
				loginLink?: string
				expiresAt?: string
				error?: string
			} | null

			if (
				!response.ok ||
				!payload?.ok ||
				typeof payload.loginLink !== 'string' ||
				typeof payload.expiresAt !== 'string'
			) {
				statusMessage =
					typeof payload?.error === 'string'
						? payload.error
						: 'Unable to create a sign-in link.'
				statusIsError = true
				handle.update()
				return
			}

			email = payload.email ?? normalizedEmail
			loginLink = payload.loginLink
			expiresAt = payload.expiresAt
			statusMessage = 'Open the one-time sign-in link below.'
			statusIsError = false
			handle.update()
		} catch {
			statusMessage = 'Network error while creating a sign-in link.'
			statusIsError = true
			handle.update()
		} finally {
			isSubmitting = false
			handle.update()
		}
	}

	handle.queueTask(async () => {
		const nextLocationKey = getLocationKey()
		if (nextLocationKey === lastLocationKey) return
		lastLocationKey = nextLocationKey
		const url = new URL(
			typeof window === 'undefined' ? 'https://example.com/login' : window.location.href,
		)
		redirectTo = normalizeRedirectTo(url.searchParams.get('redirectTo'))
		statusMessage = getErrorMessage(url.searchParams.get('error'))
		statusIsError = statusMessage !== null
		loginLink = null
		expiresAt = null
		isCheckingSession = true
		handle.update()

		try {
			const response = await fetch('/api/session', {
				headers: { Accept: 'application/json' },
			})
			const payload = (await response.json().catch(() => null)) as {
				ok?: boolean
				authenticated?: boolean
			} | null
			if (handle.signal.aborted || nextLocationKey !== lastLocationKey) return
			if (response.ok && payload?.ok && payload.authenticated) {
				navigate(redirectTo)
				return
			}
		} catch {
			if (handle.signal.aborted || nextLocationKey !== lastLocationKey) return
		}

		isCheckingSession = false
		handle.update()
	})

	return () => {
		setDocumentTitle(toAppTitle('Host login'))

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
						Host login
					</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Use a one-time sign-in link to reopen schedules you have claimed.
					</p>
				</header>

				<section
					css={{
						display: 'grid',
						gap: spacing.md,
						padding: spacing.lg,
						borderRadius: radius.lg,
						border: `1px solid ${colors.border}`,
						backgroundColor: colors.surface,
						boxShadow: shadows.sm,
					}}
				>
					<label css={{ display: 'grid', gap: spacing.xs }}>
						<span css={{ color: colors.text }}>Email address</span>
						<input
							type="email"
							name="email"
							value={email}
							placeholder="host@example.com"
							autocomplete="email"
							on={{
								input: (event) => {
									email = (event.currentTarget as HTMLInputElement).value
									handle.update()
								},
							}}
							css={{
								padding: `${spacing.xs} ${spacing.sm}`,
								borderRadius: radius.sm,
								border: `1px solid ${colors.border}`,
								backgroundColor: colors.background,
								color: colors.text,
							}}
						/>
					</label>

					<div css={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
						<button
							type="button"
							on={{ click: () => void requestLoginLink() }}
							disabled={isSubmitting || isCheckingSession}
							css={{
								padding: `${spacing.xs} ${spacing.md}`,
								borderRadius: radius.sm,
								border: `1px solid ${colors.border}`,
								backgroundColor: colors.surface,
								color: colors.text,
								cursor:
									isSubmitting || isCheckingSession ? 'wait' : 'pointer',
							}}
						>
							{isSubmitting ? 'Creating link…' : 'Create sign-in link'}
						</button>
						<a href="/account/schedules">Your schedules</a>
					</div>

					<p
						role={
							statusMessage
								? statusIsError
									? 'alert'
									: 'status'
								: undefined
						}
						aria-live="polite"
						aria-hidden={statusMessage ? undefined : true}
						css={{
							margin: 0,
							minHeight: '1.5rem',
							color: statusIsError ? colors.error : colors.textMuted,
						}}
					>
						{statusMessage ?? '\u00a0'}
					</p>

					{loginLink ? (
						<div
							css={{
								display: 'grid',
								gap: spacing.sm,
								padding: spacing.md,
								borderRadius: radius.md,
								border: `1px solid ${colors.border}`,
								backgroundColor: colors.background,
							}}
						>
							<p css={{ margin: 0, color: colors.text }}>
								One-time sign-in link for {email}
							</p>
							<code
								css={{
									display: 'block',
									padding: `${spacing.xs} ${spacing.sm}`,
									borderRadius: radius.sm,
									border: `1px solid ${colors.border}`,
									backgroundColor: colors.surface,
									color: colors.text,
									overflowWrap: 'anywhere',
								}}
							>
								{loginLink}
							</code>
							<div css={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
								<a href={loginLink} data-router-reload>
									Open sign-in link
								</a>
								<button
									type="button"
									on={{ click: () => void copyLoginLink() }}
									css={{
										padding: 0,
										border: 'none',
										background: 'none',
										color: colors.primaryText,
										cursor: 'pointer',
									}}
								>
									Copy sign-in link
								</button>
							</div>
							<p css={{ margin: 0, color: colors.textMuted }}>
								Link expires at {new Date(expiresAt ?? '').toLocaleString()}.
							</p>
						</div>
					) : null}
				</section>
			</section>
		)
	}
}
