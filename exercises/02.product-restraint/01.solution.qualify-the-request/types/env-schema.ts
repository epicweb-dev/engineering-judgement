import { createSchema, fail, object, type InferOutput } from 'remix/data-schema'

const d1DatabaseSchema = createSchema<unknown, D1Database>((value, context) => {
	if (value) {
		return { value: value as D1Database }
	}
	return fail('Missing APP_DB binding for database access.', context.path)
})

const durableObjectNamespaceSchema = createSchema<
	unknown,
	DurableObjectNamespace
>((value, context) => {
	if (value) {
		return { value: value as DurableObjectNamespace }
	}
	return fail(
		'Missing SCHEDULE_ROOM binding for realtime schedule updates.',
		context.path,
	)
})

const optionalUrlStringSchema = createSchema<unknown, string | undefined>(
	(value, context) => {
		if (value === undefined) return { value: undefined }
		if (typeof value !== 'string') return fail('Expected string', context.path)

		const trimmed = value.trim()
		if (!trimmed) return { value: undefined }

		try {
			new URL(trimmed)
			return { value: trimmed }
		} catch {
			return fail('Expected valid URL', context.path)
		}
	},
)

const optionalCommitShaSchema = createSchema<unknown, string | undefined>(
	(value, context) => {
		if (value === undefined) return { value: undefined }
		if (typeof value !== 'string') return fail('Expected string', context.path)

		const trimmed = value.trim()
		if (!trimmed) return { value: undefined }
		if (!/^[0-9a-f]{7,40}$/i.test(trimmed)) {
			return fail(
				'Expected commit SHA (7-40 hexadecimal characters)',
				context.path,
			)
		}

		return { value: trimmed.toLowerCase() }
	},
)

export const EnvSchema = object({
	APP_DB: d1DatabaseSchema,
	SCHEDULE_ROOM: durableObjectNamespaceSchema,
	APP_BASE_URL: optionalUrlStringSchema,
	APP_COMMIT_SHA: optionalCommitShaSchema,
})

export type AppEnv = InferOutput<typeof EnvSchema>
