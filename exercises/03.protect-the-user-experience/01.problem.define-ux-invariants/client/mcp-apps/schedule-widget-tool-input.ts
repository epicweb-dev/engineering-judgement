type ScheduleToolInput = {
	shareToken: string | null
	attendeeName: string | null
	hostAccessToken: string | null
}

const nestedToolInputKeys: Array<string> = [
	'renderData',
	'arguments',
	'structuredContent',
	'toolInput',
	'toolOutput',
	'toolResult',
	'result',
	'output',
	'params',
	'payload',
	'context',
]

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function readNonEmptyString(value: unknown) {
	if (typeof value !== 'string') return null
	const normalized = value.trim()
	return normalized.length > 0 ? normalized : null
}

function findNestedStringByKey(params: {
	source: unknown
	key: string
	depth?: number
}): string | null {
	const depth = params.depth ?? 0
	if (depth > 5 || !isRecord(params.source)) return null

	const directValue = readNonEmptyString(params.source[params.key])
	if (directValue) {
		return directValue
	}

	for (const nestedKey of nestedToolInputKeys) {
		const nestedValue = params.source[nestedKey]
		const resolved = findNestedStringByKey({
			source: nestedValue,
			key: params.key,
			depth: depth + 1,
		})
		if (resolved) {
			return resolved
		}
	}

	return null
}

export function extractScheduleToolInput(source: unknown): ScheduleToolInput {
	return {
		shareToken:
			findNestedStringByKey({ source, key: 'shareToken' }) ??
			findNestedStringByKey({ source, key: 'share_token' }),
		attendeeName:
			findNestedStringByKey({ source, key: 'attendeeName' }) ??
			findNestedStringByKey({ source, key: 'attendee_name' }) ??
			findNestedStringByKey({ source, key: 'name' }),
		hostAccessToken:
			findNestedStringByKey({ source, key: 'hostAccessToken' }) ??
			findNestedStringByKey({ source, key: 'host_access_token' }),
	}
}
