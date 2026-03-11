const appName = 'Epic Scheduler'

export function toAppTitle(pageTitle: string) {
	const normalizedPageTitle = pageTitle.trim()
	if (!normalizedPageTitle) return appName
	return `${normalizedPageTitle} | ${appName}`
}

export function setDocumentTitle(title: string) {
	if (typeof document === 'undefined') return
	if (document.title === title) return
	document.title = title
}
