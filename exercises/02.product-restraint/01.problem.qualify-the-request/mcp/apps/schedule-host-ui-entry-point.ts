import { scheduleHostUiResourceUri } from '#shared/mcp-ui-resource-uris.ts'

export { scheduleHostUiResourceUri }

function escapeHtmlAttribute(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}

export function renderScheduleHostUiEntryPoint(baseUrl: string | URL) {
	const canonicalBaseUrl = new URL('/', baseUrl).toString()
	const stylesheetHref = new URL('/styles.css', canonicalBaseUrl).toString()
	const widgetScriptHref = new URL(
		'/mcp-apps/schedule-host-widget.js',
		canonicalBaseUrl,
	).toString()

	return `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Epic Scheduler Host Dashboard App</title>
		<link rel="stylesheet" href="${stylesheetHref}" />
		<style>
			:root {
				color-scheme: light dark;
			}
			:root[data-theme='light'] {
				color-scheme: light;
			}
			:root[data-theme='dark'] {
				color-scheme: dark;
			}
			* {
				box-sizing: border-box;
			}
			html,
			body {
				width: 100%;
				min-height: 100%;
			}
			body {
				margin: 0;
				padding: 0;
				font-family: var(--font-family);
				background: var(--color-background);
				color: var(--color-text);
			}
			.host-widget {
				display: grid;
				gap: var(--spacing-md);
				width: min(100%, 72rem);
				margin: 0 auto;
				padding: var(--spacing-lg);
			}
			.host-card {
				display: grid;
				gap: var(--spacing-sm);
				padding: var(--spacing-lg);
				border: 1px solid var(--color-border);
				border-radius: var(--radius-lg);
				background: var(--color-surface);
				box-shadow: var(--shadow-sm);
			}
			.host-card h1,
			.host-card p {
				margin: 0;
			}
			.host-muted {
				color: var(--color-text-muted);
			}
			.host-row {
				display: flex;
				flex-wrap: wrap;
				gap: var(--spacing-sm);
				align-items: center;
			}
			.host-field {
				display: grid;
				gap: var(--spacing-xs);
				max-width: 24rem;
			}
			.host-field span {
				font-size: var(--font-size-sm);
				color: var(--color-text);
				font-weight: var(--font-weight-medium);
			}
			.host-field input {
				padding: var(--spacing-sm);
				border-radius: var(--radius-md);
				border: 1px solid var(--color-border);
				background: var(--color-background);
				color: var(--color-text);
				font-family: inherit;
				font-size: var(--font-size-sm);
				min-width: min(22rem, 100%);
			}
			.host-primary-button {
				padding: var(--spacing-sm) var(--spacing-md);
				border-radius: var(--radius-full);
				border: none;
				background: var(--color-primary);
				color: var(--color-on-primary);
				font-weight: var(--font-weight-semibold);
				font-size: var(--font-size-sm);
				cursor: pointer;
				font-family: inherit;
			}
			.host-secondary-button {
				padding: var(--spacing-xs) var(--spacing-sm);
				border-radius: var(--radius-full);
				border: 1px solid var(--color-border);
				background: transparent;
				color: var(--color-text-muted);
				font-size: var(--font-size-xs);
				font-weight: var(--font-weight-medium);
				cursor: pointer;
				font-family: inherit;
				opacity: 0.72;
			}
			.host-secondary-button:hover,
			.host-secondary-button:focus-visible {
				opacity: 1;
			}
			.host-status {
				font-size: var(--font-size-sm);
				color: var(--color-text-muted);
				min-height: 1.4rem;
			}
			.host-status[data-status-tone='error'] {
				color: var(--color-error);
			}
			.host-iframe-wrap {
				border: 1px solid var(--color-border);
				border-radius: var(--radius-lg);
				background: var(--color-surface);
				overflow: hidden;
				min-height: 28rem;
			}
			.host-iframe-wrap iframe {
				width: 100%;
				height: 72vh;
				border: none;
				background: var(--color-surface);
			}
			@media (max-width: 640px) {
				.host-widget {
					padding: var(--spacing-md);
				}
				.host-iframe-wrap iframe {
					height: 66vh;
				}
			}
		</style>
	</head>
	<body>
		<main
			class="host-widget"
			data-schedule-host-widget
			data-api-base-url="${escapeHtmlAttribute(canonicalBaseUrl)}"
		>
			<section class="host-card">
				<h1>Host dashboard</h1>
				<p class="host-muted">
					This MCP app is for managing a schedule link. Use the availability app
					when an attendee is submitting their own slots.
				</p>
				<p class="host-muted">
					Share token: <code data-share-token>Not provided</code>
				</p>
				<p class="host-muted">
					Host access token: <code data-host-access-token>Not provided</code>
				</p>
				<div class="host-row">
					<button
						type="button"
						class="host-secondary-button"
						data-action="request-fullscreen"
					>
						Fullscreen
					</button>
				</div>
				<label class="host-field">
					<span>Share token</span>
					<input name="shareToken" type="text" placeholder="Paste share token" />
				</label>
				<label class="host-field">
					<span>Host access token</span>
					<input
						name="hostAccessToken"
						type="text"
						placeholder="Paste host access token"
					/>
				</label>
				<div class="host-row">
					<button type="button" class="host-primary-button" data-action="load-host">
						Load host dashboard
					</button>
					<a data-attendee-link href="#" class="host-muted">Open attendee view</a>
				</div>
				<p class="host-status" data-status aria-live="polite">
					Waiting for share token and host access token input.
				</p>
			</section>
			<section class="host-iframe-wrap">
				<iframe data-host-iframe title="Epic Scheduler host dashboard"></iframe>
			</section>
		</main>
		<script type="module" src="${widgetScriptHref}" crossorigin="anonymous"></script>
	</body>
</html>
`.trim()
}
