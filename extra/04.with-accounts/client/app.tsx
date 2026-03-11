import { type Handle } from 'remix/component'
import { clientRoutes } from './routes/index.tsx'
import { listenToRouterNavigation, Router } from './client-router.tsx'
import { colors, mq, spacing, typography } from './styles/tokens.ts'
import { visuallyHiddenCss } from './styles/visually-hidden.ts'

function getRouteAnnouncement(pathname: string) {
	const segments = pathname.split('/').filter(Boolean)
	if (segments.length === 0) return 'Create schedule page loaded.'
	if (segments[0] === 'login') return 'Host login page loaded.'
	if (segments[0] === 'account' && segments[1] === 'schedules') {
		return segments.length >= 3
			? 'Saved host dashboard loaded.'
			: 'Your schedules page loaded.'
	}
	if (segments[0] === 's' && segments.length >= 3)
		return 'Host dashboard loaded.'
	if (segments[0] === 's' && segments.length >= 2) {
		return 'Schedule availability page loaded.'
	}
	return 'Page content loaded.'
}

function focusMainContentHeading() {
	if (typeof document === 'undefined') return
	const heading = document.querySelector('#main-content h1')
	if (heading instanceof HTMLElement) {
		if (!heading.hasAttribute('tabindex')) {
			heading.setAttribute('tabindex', '-1')
		}
		heading.focus()
		return
	}
	const mainContent = document.getElementById('main-content')
	if (mainContent instanceof HTMLElement) {
		mainContent.focus()
	}
}

export function App(handle: Handle) {
	let pendingRouteA11ySync = true
	let shouldMoveFocusToMainContent = false
	let lastAnnouncedPath = ''
	let routeAnnouncement = ''

	listenToRouterNavigation(handle, () => {
		pendingRouteA11ySync = true
		shouldMoveFocusToMainContent = true
		void handle.update()
	})

	handle.queueTask(() => {
		if (!pendingRouteA11ySync) return
		pendingRouteA11ySync = false
		if (typeof window === 'undefined') return
		const pathname = window.location.pathname
		if (pathname !== lastAnnouncedPath) {
			lastAnnouncedPath = pathname
			routeAnnouncement = getRouteAnnouncement(pathname)
			void handle.update()
		}
		if (shouldMoveFocusToMainContent) {
			shouldMoveFocusToMainContent = false
			focusMainContentHeading()
		}
	})

	const navLinkCss = {
		color: colors.primaryText,
		fontWeight: typography.fontWeight.medium,
		textDecoration: 'none',
		'&:hover': {
			textDecoration: 'underline',
		},
	}

	const skipToMainLinkCss = {
		position: 'absolute',
		left: spacing.sm,
		top: spacing.sm,
		padding: `${spacing.xs} ${spacing.sm}`,
		borderRadius: spacing.xs,
		border: `1px solid ${colors.border}`,
		backgroundColor: colors.surface,
		color: colors.text,
		textDecoration: 'none',
		transform: 'translateY(-150%)',
		transition: 'transform 120ms ease',
		zIndex: 100,
		'&:focus-visible': {
			transform: 'translateY(0)',
		},
	}

	return () => {
		return (
			<div
				css={{
					maxWidth: '80rem',
					margin: '0 auto',
					padding: spacing['2xl'],
					fontFamily: typography.fontFamily,
					[mq.mobile]: {
						padding: `calc(${spacing['2xl']} / 2)`,
					},
				}}
			>
				<a href="#main-content" css={skipToMainLinkCss}>
					Skip to main content
				</a>
				<p role="status" aria-live="polite" css={visuallyHiddenCss}>
					{routeAnnouncement}
				</p>
				<header>
					<nav
						aria-label="Primary"
						css={{
							display: 'flex',
							gap: spacing.lg,
							flexWrap: 'wrap',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: spacing.xl,
						}}
					>
						<a
							href="/"
							css={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: spacing.xs,
								textDecoration: 'none',
							}}
							aria-label="Epic Scheduler home"
						>
							<img
								src="/epic-scheduler-favicon.svg"
								alt=""
								aria-hidden="true"
								css={{
									width: '1.5rem',
									height: '1.5rem',
									borderRadius: '0.45rem',
								}}
							/>
							<span
								css={{
									color: colors.text,
									fontWeight: typography.fontWeight.semibold,
								}}
							>
								Epic Scheduler
							</span>
						</a>
						<div css={{ display: 'inline-flex', gap: spacing.md }}>
							<a href="/" css={navLinkCss}>
								New schedule
							</a>
							<a href="/account/schedules" css={navLinkCss}>
								Your schedules
							</a>
							<a href="/how-it-works" css={navLinkCss} data-router-reload>
								How it works
							</a>
							<a href="/blog" css={navLinkCss} data-router-reload>
								Blog
							</a>
						</div>
					</nav>
				</header>
				<main id="main-content" tabIndex={-1}>
					<Router
						setup={{
							routes: clientRoutes,
							fallback: (
								<section>
									<h2
										css={{
											fontSize: typography.fontSize.lg,
											fontWeight: typography.fontWeight.semibold,
											marginBottom: spacing.sm,
											color: colors.text,
										}}
									>
										Not Found
									</h2>
									<p css={{ color: colors.textMuted }}>
										That route does not exist.
									</p>
								</section>
							),
						}}
					/>
				</main>
				<footer
					css={{
						marginTop: spacing.xl,
						paddingTop: spacing.md,
						borderTop: `1px solid ${colors.border}`,
						display: 'flex',
						flexWrap: 'wrap',
						gap: spacing.md,
					}}
				>
					<a href="/privacy" css={navLinkCss} data-router-reload>
						Privacy
					</a>
					<a href="/terms" css={navLinkCss} data-router-reload>
						Terms
					</a>
					<a
						href="/meeting-scheduler-features"
						css={navLinkCss}
						data-router-reload
					>
						Features
					</a>
				</footer>
			</div>
		)
	}
}
