import { html, type SafeHtml } from 'remix/html-template'

const defaultEntryScripts: Array<string> = ['/client-entry.js']
const defaultDescription =
	'Create one schedule link, paint availability in minutes, and see timezone overlap live.'
const defaultRobotsPolicy = 'index,follow,max-image-preview:large'
const defaultOgType = 'website'
const defaultShell = html`<div class="app-shell">
	<div
		class="loading-spinner"
		role="status"
		aria-live="polite"
		aria-label="Loading"
	></div>
</div>`

export function Layout({
	children,
	title = 'Epic Scheduler',
	description = defaultDescription,
	canonicalUrl,
	robots = defaultRobotsPolicy,
	ogImageUrl,
	ogType = defaultOgType,
	structuredData,
	entryScripts = defaultEntryScripts,
}: {
	children?: SafeHtml
	title?: string
	description?: string
	canonicalUrl?: string
	robots?: string
	ogImageUrl?: string
	ogType?: string
	structuredData?: Record<string, unknown> | Array<Record<string, unknown>>
	entryScripts?: Array<string> | false
}) {
	const scripts = entryScripts === false ? [] : entryScripts
	const shell = children ?? defaultShell
	const socialImage = ogImageUrl ?? '/epic-scheduler-social.svg'
	const normalizedStructuredData = structuredData
		? Array.isArray(structuredData)
			? structuredData
			: [structuredData]
		: []
	return html`<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="description" content="${description}" />
			<meta name="robots" content="${robots}" />
			<link
				rel="icon"
				type="image/svg+xml"
				sizes="any"
				href="/epic-scheduler-favicon.svg"
			/>
			<link rel="icon" href="/favicon.ico" sizes="any" />
			<link
				rel="icon"
				type="image/png"
				sizes="32x32"
				href="/favicon-32x32.png"
			/>
			<link
				rel="icon"
				type="image/png"
				sizes="16x16"
				href="/favicon-16x16.png"
			/>
			<link
				rel="apple-touch-icon"
				sizes="180x180"
				href="/apple-touch-icon.png"
			/>
			<link rel="manifest" href="/site.webmanifest" />
			<meta name="theme-color" content="#5b3df5" />
			<meta property="og:title" content="${title}" />
			<meta property="og:description" content="${description}" />
			<meta property="og:type" content="${ogType}" />
			<meta property="og:image" content="${socialImage}" />
			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:title" content="${title}" />
			<meta name="twitter:description" content="${description}" />
			<meta name="twitter:image" content="${socialImage}" />
			${canonicalUrl
				? html`<link rel="canonical" href="${canonicalUrl}" />
						<meta property="og:url" content="${canonicalUrl}" />`
				: ''}
			<title>${title}</title>
			<link rel="stylesheet" href="/styles.css" />
			${normalizedStructuredData.map((item) => {
				// Protect against accidental script tag breaks in structured data.
				const structuredDataJson = JSON.stringify(item).replaceAll(
					'<',
					'\\u003c',
				)
				return html.raw`<script type="application/ld+json">${structuredDataJson}</script>`
			})}
		</head>
		<body>
			<div id="root">${shell}</div>
			${scripts.map(
				(script) => html`<script type="module" src="${script}"></script>`,
			)}
		</body>
	</html>`
}
