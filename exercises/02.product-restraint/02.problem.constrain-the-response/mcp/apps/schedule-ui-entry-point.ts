import { scheduleUiResourceUri } from '#shared/mcp-ui-resource-uris.ts'

export { scheduleUiResourceUri }

function escapeHtmlAttribute(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}

export function renderScheduleUiEntryPoint(baseUrl: string | URL) {
	const canonicalBaseUrl = new URL('/', baseUrl).toString()
	const stylesheetHref = new URL('/styles.css', canonicalBaseUrl).toString()
	const widgetScriptHref = new URL(
		'/mcp-apps/schedule-widget.js',
		canonicalBaseUrl,
	).toString()

	return `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Epic Scheduler Availability App</title>
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
			.scheduler-widget {
				display: flex;
				justify-content: center;
				width: 100%;
				min-height: 100dvh;
				margin: 0;
				padding: var(--spacing-xl);
			}
			@supports not (height: 100dvh) {
				.scheduler-widget {
					min-height: 100vh;
				}
			}
			.scheduler-card {
				display: grid;
				gap: var(--spacing-md);
				padding: var(--spacing-lg);
				border: 1px solid var(--color-border);
				border-radius: var(--radius-lg);
				background: var(--color-surface);
				box-shadow: var(--shadow-sm);
				width: min(100%, 52rem);
			}
			.scheduler-card h1 {
				margin: 0;
				font-size: var(--font-size-xl);
			}
			.scheduler-card p {
				margin: 0;
			}
			.scheduler-muted {
				color: var(--color-text-muted);
			}
			.scheduler-row {
				display: grid;
				gap: var(--spacing-md);
			}
			.scheduler-row-split {
				grid-template-columns: minmax(0, 1fr) auto;
				align-items: end;
			}
			.scheduler-button-row {
				display: flex;
				flex-wrap: wrap;
				gap: var(--spacing-sm);
				align-items: center;
			}
			.scheduler-field {
				display: grid;
				gap: var(--spacing-xs);
			}
			.scheduler-field span {
				font-size: var(--font-size-sm);
				color: var(--color-text);
				font-weight: var(--font-weight-medium);
			}
			.scheduler-field input,
			.scheduler-field select {
				padding: var(--spacing-sm);
				border-radius: var(--radius-md);
				border: 1px solid var(--color-border);
				background: var(--color-background);
				color: var(--color-text);
				font-family: inherit;
				font-size: var(--font-size-sm);
			}
			.scheduler-primary-button,
			.scheduler-secondary-button {
				padding: var(--spacing-sm) var(--spacing-md);
				border-radius: var(--radius-full);
				font-weight: var(--font-weight-semibold);
				font-size: var(--font-size-sm);
				cursor: pointer;
				font-family: inherit;
			}
			.scheduler-primary-button {
				border: none;
				background: var(--color-primary);
				color: var(--color-on-primary);
			}
			.scheduler-secondary-button {
				border: 1px solid var(--color-border);
				background: transparent;
				color: var(--color-text);
			}
			.scheduler-tertiary-button {
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
			.scheduler-tertiary-button:hover,
			.scheduler-tertiary-button:focus-visible {
				opacity: 1;
			}
			.scheduler-tertiary-button:focus-visible {
				outline: 2px solid var(--color-primary);
				outline-offset: 2px;
			}
			.scheduler-status {
				font-size: var(--font-size-sm);
				color: var(--color-text-muted);
				min-height: 1.4rem;
			}
			.scheduler-status[data-status-tone='error'] {
				color: var(--color-error);
			}
			.scheduler-grid-wrap {
				border: 1px solid var(--color-border);
				border-radius: var(--radius-lg);
				overflow: auto;
				background-color: var(--color-surface);
			}
			.scheduler-grid-wrap table {
				border-collapse: separate;
				border-spacing: 0;
				min-width: max(40rem, 100%);
				width: 100%;
			}
			.scheduler-grid-wrap th {
				background-color: var(--color-surface);
				padding: var(--spacing-xs) var(--spacing-sm);
				border-bottom: 1px solid var(--color-border);
				color: var(--color-text-muted);
				font-size: var(--font-size-xs);
				font-weight: var(--font-weight-medium);
			}
			.scheduler-grid-wrap th[scope='col'] {
				text-align: center;
				position: sticky;
				top: 0;
				z-index: 2;
			}
			.scheduler-grid-wrap th[scope='row'] {
				text-align: left;
				position: sticky;
				left: 0;
				z-index: 1;
				min-width: 4.8rem;
			}
			.scheduler-grid-wrap td {
				padding: 0;
				border-bottom: 1px solid var(--color-border);
				border-right: 1px solid var(--color-border);
				height: 2.25rem;
			}
			.scheduler-grid-empty {
				background: color-mix(
					in srgb,
					var(--color-background) 88%,
					var(--color-surface)
				);
			}
			.scheduler-slot {
				display: grid;
				place-items: center;
				width: 100%;
				height: 100%;
				min-height: 2.25rem;
				border: none;
				padding: var(--spacing-xs);
				color: var(--color-text);
				font-weight: var(--font-weight-medium);
				font-size: var(--font-size-xs);
				cursor: pointer;
			}
			.scheduler-slot:focus-visible {
				outline: 2px solid var(--color-primary);
				outline-offset: -2px;
			}
			.scheduler-slot.is-active {
				outline: 2px solid var(--color-primary);
				outline-offset: -2px;
			}
			.scheduler-slot.is-pending-add {
				box-shadow: inset 0 0 0 2px var(--color-primary);
			}
			.scheduler-slot.is-pending-remove {
				background-image: repeating-linear-gradient(
					135deg,
					color-mix(in srgb, var(--color-error) 24%, transparent) 0 6px,
					transparent 6px 12px
				);
			}
			.scheduler-slot-details {
				display: grid;
				gap: var(--spacing-sm);
				padding-top: var(--spacing-sm);
				border-top: 1px solid var(--color-border);
			}
			.scheduler-slot-details h2,
			.scheduler-slot-details p {
				margin: 0;
			}
			.scheduler-slot-details ul {
				margin: 0;
				padding-left: 1rem;
				display: grid;
				gap: var(--spacing-xs);
			}
			.scheduler-slot-details li {
				color: var(--color-text);
				font-size: var(--font-size-sm);
			}
			.scheduler-output {
				margin: 0;
				overflow: auto;
				padding: var(--spacing-sm);
				border-radius: var(--radius-md);
				border: 1px solid var(--color-border);
				background: color-mix(
					in srgb,
					var(--color-background) 85%,
					var(--color-surface)
				);
				font-size: var(--font-size-xs);
				max-height: 15rem;
			}
			@media (max-width: 640px) {
				.scheduler-widget {
					padding: var(--spacing-md);
				}
				.scheduler-row-split {
					grid-template-columns: 1fr;
				}
				.scheduler-grid-wrap table {
					min-width: 100%;
				}
				.scheduler-grid-wrap td,
				.scheduler-slot {
					min-height: 2.65rem;
					height: 2.65rem;
					font-size: var(--font-size-sm);
				}
			}
		</style>
	</head>
	<body>
		<main
			class="scheduler-widget"
			data-schedule-widget
			data-api-base-url="${escapeHtmlAttribute(canonicalBaseUrl)}"
		>
			<section class="scheduler-card">
				<h1 data-schedule-title>Your availability</h1>
				<p class="scheduler-muted">
					This attendee UI uses the share token provided to open_schedule_ui. Use
					open_schedule_host_ui for host link management, slot blocking, and
					attendee response handling.
				</p>
				<p class="scheduler-muted">
					Share token: <code data-share-token>Not provided</code>
				</p>
				<div class="scheduler-button-row">
					<button
						type="button"
						class="scheduler-tertiary-button"
						data-action="request-fullscreen"
					>
						Fullscreen
					</button>
				</div>
				<div class="scheduler-row scheduler-row-split">
					<label class="scheduler-field">
						<span>Your name</span>
						<input name="attendeeName" type="text" placeholder="Add your name" />
					</label>
					<div class="scheduler-row">
						<button
							type="button"
							class="scheduler-primary-button"
							data-action="submit"
						>
							Save availability
						</button>
						<p class="scheduler-muted">
							<span data-selected-count>0</span> selected slot(s) -
							<span data-pending-count>0</span> pending
						</p>
					</div>
				</div>
				<p class="scheduler-muted">
					Desktop and mobile: tap/click cells to toggle slots. Times use your
					browser timezone: <strong data-browser-timezone>UTC</strong>
				</p>
				<p class="scheduler-status" data-status aria-live="polite">
					Waiting for share token input.
				</p>
				<div class="scheduler-grid-wrap" data-grid-host>
					<p class="scheduler-muted" style="padding: var(--spacing-md)">
						No schedule loaded yet.
					</p>
				</div>
				<section class="scheduler-slot-details" data-slot-details hidden></section>
			</section>
		</main>

		<script type="module" src="${widgetScriptHref}" crossorigin="anonymous"></script>
	</body>
</html>
`.trim()
}
