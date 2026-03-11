export { isRecordValue } from '#shared/record-utils.ts'

export function getShareToken(pathname: string) {
	const segments = pathname.split('/').filter(Boolean)
	if (segments.length < 3) return ''
	return segments[2] ?? ''
}
