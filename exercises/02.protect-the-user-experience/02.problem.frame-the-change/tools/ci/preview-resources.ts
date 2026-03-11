import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Command = 'ensure' | 'cleanup'

type CliOptions = {
	workerName: string
	wranglerConfigPath: string
	outConfigPath: string
	dryRun: boolean
	d1Location?: string
}

type D1DatabaseListEntry = {
	uuid: string
	name: string
}

function fail(message: string): never {
	console.error(message)
	process.exit(1)
}

function parseArgs(argv: Array<string>): {
	command: Command
	options: CliOptions
} {
	const command = argv[0]
	if (command !== 'ensure' && command !== 'cleanup') {
		fail(
			`Missing or invalid command. Usage: node tools/ci/preview-resources.ts <ensure|cleanup> --worker-name <name>`,
		)
	}

	const options: CliOptions = {
		workerName: '',
		wranglerConfigPath: 'wrangler.jsonc',
		outConfigPath: 'wrangler-preview.generated.json',
		dryRun: false,
		d1Location: undefined,
	}

	for (let index = 1; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue
		switch (arg) {
			case '--worker-name': {
				options.workerName = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--wrangler-config': {
				options.wranglerConfigPath = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--out-config': {
				options.outConfigPath = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--d1-location': {
				options.d1Location = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--dry-run': {
				options.dryRun = true
				break
			}
			default: {
				if (arg.startsWith('-')) {
					fail(`Unknown flag: ${arg}`)
				}
			}
		}
	}

	if (!options.workerName) {
		fail('Missing required flag: --worker-name <name>')
	}

	if (command === 'ensure' && !options.outConfigPath) {
		fail('Missing required flag: --out-config <path>')
	}

	return { command, options }
}

function runWrangler(
	args: Array<string>,
	options?: { input?: string; quiet?: boolean },
) {
	const result = spawnSync(
		resolveWranglerCommand(),
		resolveWranglerArgs(args),
		{
		encoding: 'utf8',
		stdio: 'pipe',
		input: options?.input,
		env: process.env,
		},
	)

	const status = result.status ?? 1
	const stdout = result.stdout ?? ''
	const stderr = result.stderr ?? ''

	if (!options?.quiet) {
		const rendered = args.map(renderArg).join(' ')
		console.error(`wrangler: ${renderWranglerInvocation(rendered)}`)
	}

	if (status !== 0) {
		if (options?.quiet) {
			const rendered = args.map(renderArg).join(' ')
			console.error(`wrangler (failed): ${renderWranglerInvocation(rendered)}`)
		}
		const output = `${stdout}${stderr}`.trim()
		if (output) {
			console.error(output)
		}
	}

	return { status, stdout, stderr }
}

function resolveWranglerCommand() {
	const localWranglerPath = path.join(
		process.cwd(),
		'node_modules',
		'.bin',
		process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
	)
	if (existsSync(localWranglerPath)) {
		return localWranglerPath
	}
	return process.platform === 'win32' ? 'npx.cmd' : 'npx'
}

function resolveWranglerArgs(args: Array<string>) {
	return existsSync(
		path.join(
			process.cwd(),
			'node_modules',
			'.bin',
			process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
		),
	)
		? args
		: ['-y', 'wrangler', ...args]
}

function renderWranglerInvocation(renderedArgs: string) {
	const prefix = existsSync(
		path.join(
			process.cwd(),
			'node_modules',
			'.bin',
			process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
		),
	)
		? 'wrangler'
		: 'npx -y wrangler'
	return renderedArgs ? `${prefix} ${renderedArgs}` : prefix
}

function renderArg(value: string) {
	if (!value) return '""'
	if (/^[a-zA-Z0-9_./:-]+$/.test(value)) return value
	return JSON.stringify(value)
}

function buildPreviewResourceNames(workerName: string) {
	const maxLen = 63
	const d1Suffix = '-db'
	return {
		d1DatabaseName: truncateWithSuffix(workerName, d1Suffix, maxLen),
	}
}

function truncateWithSuffix(base: string, suffix: string, maxLen: number) {
	if (base.length + suffix.length <= maxLen) {
		return `${base}${suffix}`
	}
	const cut = Math.max(1, maxLen - suffix.length)
	const trimmed = base.slice(0, cut).replace(/-+$/g, '')
	return `${trimmed}${suffix}`
}

function listD1Databases(): Array<D1DatabaseListEntry> {
	const result = runWrangler(['d1', 'list', '--json'], { quiet: true })
	if (result.status !== 0) {
		fail('Failed to list D1 databases (wrangler d1 list --json).')
	}
	try {
		return JSON.parse(result.stdout) as Array<D1DatabaseListEntry>
	} catch {
		fail('Could not parse JSON output from wrangler d1 list --json.')
	}
}

function ensureD1Database({
	name,
	location,
	dryRun,
}: {
	name: string
	location?: string
	dryRun: boolean
}) {
	if (dryRun) {
		console.error(`[dry-run] ensure D1 database: ${name}`)
		return { name, id: `dry-run-${name}` }
	}

	const existing = listD1Databases().find((db) => db.name === name)
	if (existing) {
		console.error(`D1 database exists: ${name} (${existing.uuid})`)
		return { name, id: existing.uuid }
	}

	const args = ['d1', 'create', name]
	if (location && location.length > 0) {
		args.push('--location', location)
	}
	const createResult = runWrangler(args, { input: 'n\n', quiet: true })
	if (createResult.status !== 0) {
		fail(`Failed to create D1 database: ${name}`)
	}

	const created = listD1Databases().find((db) => db.name === name)
	if (!created) {
		fail(`Created D1 database "${name}" but could not find it via list.`)
	}
	console.error(`Created D1 database: ${name} (${created.uuid})`)
	return { name, id: created.uuid }
}

function deleteD1Database({ name, dryRun }: { name: string; dryRun: boolean }) {
	if (dryRun) {
		console.error(`[dry-run] delete D1 database: ${name}`)
		return
	}

	const existing = listD1Databases().some((db) => db.name === name)
	if (!existing) {
		console.error(`D1 database already deleted: ${name}`)
		return
	}

	const result = runWrangler(['d1', 'delete', name, '--skip-confirmation'], {
		quiet: true,
	})
	if (result.status !== 0) {
		fail(`Failed to delete D1 database: ${name}`)
	}
	console.error(`Deleted D1 database: ${name}`)
}

function stripJsonc(source: string) {
	let output = ''
	let inString = false
	let stringQuote = ''
	let isEscaped = false
	let inLineComment = false
	let inBlockComment = false

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index] ?? ''
		const next = source[index + 1] ?? ''

		if (inLineComment) {
			if (char === '\n') {
				inLineComment = false
				output += char
			}
			continue
		}

		if (inBlockComment) {
			if (char === '*' && next === '/') {
				inBlockComment = false
				index += 1
			}
			continue
		}

		if (inString) {
			output += char
			if (isEscaped) {
				isEscaped = false
				continue
			}
			if (char === '\\') {
				isEscaped = true
				continue
			}
			if (char === stringQuote) {
				inString = false
				stringQuote = ''
			}
			continue
		}

		if (char === '"' || char === "'") {
			inString = true
			stringQuote = char
			output += char
			continue
		}

		if (char === '/' && next === '/') {
			inLineComment = true
			index += 1
			continue
		}

		if (char === '/' && next === '*') {
			inBlockComment = true
			index += 1
			continue
		}

		output += char
	}

	return output
}

function stripTrailingCommas(source: string) {
	let output = ''
	let inString = false
	let stringQuote = ''
	let isEscaped = false

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index] ?? ''

		if (inString) {
			output += char
			if (isEscaped) {
				isEscaped = false
				continue
			}
			if (char === '\\') {
				isEscaped = true
				continue
			}
			if (char === stringQuote) {
				inString = false
				stringQuote = ''
			}
			continue
		}

		if (char === '"' || char === "'") {
			inString = true
			stringQuote = char
			output += char
			continue
		}

		if (char === ',') {
			let lookahead = index + 1
			while (lookahead < source.length) {
				const next = source[lookahead] ?? ''
				if (next === ' ' || next === '\t' || next === '\n' || next === '\r') {
					lookahead += 1
					continue
				}
				if (next === '}' || next === ']') {
					break
				}
				break
			}
			const nextNonWhitespace = source[lookahead] ?? ''
			if (nextNonWhitespace === '}' || nextNonWhitespace === ']') {
				continue
			}
		}

		output += char
	}

	return output
}

function parseJsonc<T>(source: string): T {
	const withoutBom = source.replace(/^\uFEFF/, '')
	const noComments = stripJsonc(withoutBom)
	const json = stripTrailingCommas(noComments)
	return JSON.parse(json) as T
}

async function writeGeneratedWranglerConfig({
	baseConfigPath,
	outConfigPath,
	d1DatabaseName,
	d1DatabaseId,
}: {
	baseConfigPath: string
	outConfigPath: string
	d1DatabaseName: string
	d1DatabaseId: string
}) {
	const baseText = await readFile(baseConfigPath, 'utf8')
	const config = parseJsonc<Record<string, unknown>>(baseText)
	const env = config.env
	if (!env || typeof env !== 'object') {
		fail(`wrangler config "${baseConfigPath}" is missing "env".`)
	}

	const previewEnv = (env as Record<string, unknown>).preview
	if (!previewEnv || typeof previewEnv !== 'object') {
		fail(`wrangler config "${baseConfigPath}" is missing "env.preview".`)
	}

	const d1Databases = (previewEnv as Record<string, unknown>).d1_databases
	if (!Array.isArray(d1Databases)) {
		fail(
			`wrangler config "${baseConfigPath}" is missing "env.preview.d1_databases".`,
		)
	}

	const d1EntryIndex = d1Databases.findIndex((entry) => {
		if (!entry || typeof entry !== 'object') return false
		return (entry as Record<string, unknown>).binding === 'APP_DB'
	})
	if (d1EntryIndex < 0) {
		fail(
			`wrangler config "${baseConfigPath}" has no preview D1 binding for "APP_DB".`,
		)
	}

	const d1Entry = d1Databases[d1EntryIndex] as Record<string, unknown>
	d1Databases[d1EntryIndex] = {
		...d1Entry,
		database_name: d1DatabaseName,
		database_id: d1DatabaseId,
	}

	const resolvedOut = path.resolve(outConfigPath)
	await writeFile(
		resolvedOut,
		`${JSON.stringify(config, null, '\t')}\n`,
		'utf8',
	)
	console.error(`Wrote generated Wrangler config: ${resolvedOut}`)
	return resolvedOut
}

async function ensurePreviewResources(options: CliOptions) {
	const { d1DatabaseName } = buildPreviewResourceNames(options.workerName)
	const d1 = ensureD1Database({
		name: d1DatabaseName,
		location: options.d1Location,
		dryRun: options.dryRun,
	})

	const generatedConfigPath = await writeGeneratedWranglerConfig({
		baseConfigPath: options.wranglerConfigPath,
		outConfigPath: options.outConfigPath,
		d1DatabaseName: d1.name,
		d1DatabaseId: d1.id,
	})

	console.log(`wrangler_config=${generatedConfigPath}`)
	console.log(`d1_database_name=${d1.name}`)
	console.log(`d1_database_id=${d1.id}`)
}

async function cleanupPreviewResources(options: CliOptions) {
	const { d1DatabaseName } = buildPreviewResourceNames(options.workerName)
	deleteD1Database({ name: d1DatabaseName, dryRun: options.dryRun })
}

async function main() {
	const { command, options } = parseArgs(process.argv.slice(2))

	if (!process.env.CLOUDFLARE_API_TOKEN && !options.dryRun) {
		fail(
			'Missing CLOUDFLARE_API_TOKEN (required for Wrangler resource operations).',
		)
	}

	if (command === 'ensure') {
		await ensurePreviewResources(options)
		return
	}

	await cleanupPreviewResources(options)
}

await main()
