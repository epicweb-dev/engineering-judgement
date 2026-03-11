import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
	type CallToolResult,
	type ContentBlock,
} from '@modelcontextprotocol/sdk/types.js'
import getPort from 'get-port'
import { expect, test } from 'vitest'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const defaultTimeoutMs = 60_000
type SpawnedProcess = ReturnType<typeof spawn>

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function captureOutput(stream: NodeJS.ReadableStream | null) {
	let output = ''
	if (!stream) return () => output
	stream.setEncoding('utf8')
	stream.on('data', (chunk: string) => {
		output += chunk
	})
	return () => output
}

function formatOutput(stdout: string, stderr: string) {
	const snippets: Array<string> = []
	if (stdout.trim()) snippets.push(`stdout: ${stdout.trim().slice(-2000)}`)
	if (stderr.trim()) snippets.push(`stderr: ${stderr.trim().slice(-2000)}`)
	return snippets.length > 0 ? ` Output:\n${snippets.join('\n')}` : ''
}

function waitForExit(child: SpawnedProcess) {
	return new Promise<number>((resolve, reject) => {
		if (child.exitCode !== null) {
			resolve(child.exitCode)
			return
		}
		child.once('error', reject)
		child.once('exit', (code) => resolve(code ?? 1))
	})
}

async function runCommand(
	command: string,
	args: Array<string>,
	env?: Record<string, string>,
) {
	const proc = spawn(command, args, {
		cwd: projectRoot,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: {
			...process.env,
			...env,
		},
	})
	const getStdout = captureOutput(proc.stdout)
	const getStderr = captureOutput(proc.stderr)
	const exitCode = await waitForExit(proc)
	const stdout = getStdout()
	const stderr = getStderr()
	if (exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed (${exitCode}). ${stderr || stdout}`,
		)
	}
	return { stdout, stderr }
}

async function createTestDatabase() {
	const persistDir = await mkdtemp(join(tmpdir(), 'epic-scheduler-mcp-e2e-'))
	const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
	await runCommand(
		npmCommand,
		['run', '--silent', 'migrate:local', '--', '--persist-to', persistDir],
		{ CLOUDFLARE_ENV: 'test' },
	)

	return {
		persistDir,
		[Symbol.asyncDispose]: async () => {
			await rm(persistDir, { recursive: true, force: true })
		},
	}
}

async function waitForServer(
	origin: string,
	proc: SpawnedProcess,
	getStdout: () => string,
	getStderr: () => string,
) {
	let exited = false
	let exitCode: number | null = null
	proc.once('exit', (code) => {
		exited = true
		exitCode = code
	})

	const healthUrl = new URL('/health', origin)
	const deadline = Date.now() + 25_000
	while (Date.now() < deadline) {
		if (exited) {
			throw new Error(
				`wrangler dev exited (${exitCode ?? 'unknown'}).${formatOutput(
					getStdout(),
					getStderr(),
				)}`,
			)
		}
		try {
			const response = await fetch(healthUrl)
			if (response.ok) {
				await response.body?.cancel()
				return
			}
		} catch {
			// Retry until ready.
		}
		await delay(250)
	}

	throw new Error(
		`Timed out waiting for dev server at ${origin}.${formatOutput(
			getStdout(),
			getStderr(),
		)}`,
	)
}

async function stopProcess(proc: SpawnedProcess) {
	let exited = false
	proc.once('exit', () => {
		exited = true
	})
	proc.kill('SIGINT')
	await Promise.race([waitForExit(proc), delay(5_000)])
	if (!exited) {
		proc.kill('SIGKILL')
		await waitForExit(proc)
	}
}

function resolveWranglerCommand() {
	const localWranglerPath = resolve(
		projectRoot,
		'node_modules',
		'.bin',
		process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
	)
	if (existsSync(localWranglerPath)) {
		return {
			command: localWranglerPath,
			args: (args: Array<string>) => args,
		}
	}
	return {
		command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
		args: (args: Array<string>) => ['-y', 'wrangler', ...args],
	}
}

async function startDevServer(persistDir: string) {
	const port = await getPort({ host: '127.0.0.1' })
	const inspectorPortBase =
		port + 10_000 <= 65_535 ? port + 10_000 : Math.max(1, port - 10_000)
	const inspectorPort = await getPort({
		host: '127.0.0.1',
		port: Array.from({ length: 10 }, (_, index) => inspectorPortBase + index)
			.filter((candidate) => candidate > 0 && candidate <= 65_535),
	})
	const origin = `http://127.0.0.1:${port}`
	const wranglerCommand = resolveWranglerCommand()
	const proc = spawn(
		wranglerCommand.command,
		wranglerCommand.args([
			'dev',
			'--local',
			'--env',
			'test',
			'--port',
			String(port),
			'--inspector-port',
			String(inspectorPort),
			'--ip',
			'127.0.0.1',
			'--persist-to',
			persistDir,
			'--show-interactive-dev-session=false',
			'--log-level',
			'error',
		]),
		{
			cwd: projectRoot,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				...process.env,
				APP_BASE_URL: origin,
				CLOUDFLARE_ENV: 'test',
			},
		},
	)

	const getStdout = captureOutput(proc.stdout)
	const getStderr = captureOutput(proc.stderr)
	await waitForServer(origin, proc, getStdout, getStderr)

	return {
		origin,
		[Symbol.asyncDispose]: async () => {
			await stopProcess(proc)
		},
	}
}

async function createMcpClient(origin: string) {
	const serverUrl = new URL('/mcp', origin)
	const transport = new StreamableHTTPClientTransport(serverUrl)
	const client = new Client(
		{ name: 'mcp-e2e', version: '1.0.0' },
		{ capabilities: {} },
	)

	await client.connect(transport)
	return {
		client,
		[Symbol.asyncDispose]: async () => {
			await client.close()
		},
	}
}

function getTextContent(result: CallToolResult) {
	return (
		result.content.find(
			(item): item is Extract<ContentBlock, { type: 'text' }> =>
				item.type === 'text',
		)?.text ?? ''
	)
}

function parseToolJson(result: CallToolResult) {
	return JSON.parse(getTextContent(result)) as Record<string, unknown>
}

test(
	'mcp server lists scheduling tools',
	async () => {
		await using database = await createTestDatabase()
		await using server = await startDevServer(database.persistDir)
		await using mcpClient = await createMcpClient(server.origin)

		const result = await mcpClient.client.listTools()
		const toolNames = result.tools.map((tool) => tool.name).sort()

		expect(toolNames).toEqual([
			'create_schedule',
			'generate_schedule_slots',
			'get_host_schedule',
			'get_schedule',
			'save_attendee_availability',
			'update_host_schedule',
		])
	},
	defaultTimeoutMs,
)

test(
	'mcp server creates and updates a schedule',
	async () => {
		await using database = await createTestDatabase()
		await using server = await startDevServer(database.persistDir)
		await using mcpClient = await createMcpClient(server.origin)

		const slotsResult = await mcpClient.client.callTool({
			name: 'generate_schedule_slots',
			arguments: {
				startDate: '2026-03-10',
				endDate: '2026-03-10',
				slotMinutes: 60,
				timezone: 'UTC',
			},
		})
		const slotPayload = parseToolJson(slotsResult as CallToolResult)
		const slots = Array.isArray(slotPayload.slots)
			? slotPayload.slots
			: []
		expect(slots.length).toBe(24)

		const selectedSlotsUtc = slots
			.slice(0, 2)
			.map((slot) =>
				typeof slot === 'object' &&
				slot &&
				'utcIso' in slot &&
				typeof slot.utcIso === 'string'
					? slot.utcIso
					: '',
			)
			.filter((slot) => slot.length > 0)
		expect(selectedSlotsUtc).toHaveLength(2)

		const createResult = await mcpClient.client.callTool({
			name: 'create_schedule',
			arguments: {
				title: 'MCP test schedule',
				startDate: '2026-03-10',
				endDate: '2026-03-10',
				slotMinutes: 60,
				timezone: 'UTC',
				selectedSlotsUtc,
			},
		})
		const createPayload = parseToolJson(createResult as CallToolResult)
		const scheduleKey =
			typeof createPayload.scheduleKey === 'string' ? createPayload.scheduleKey : ''
		const hostKey =
			typeof createPayload.hostKey === 'string' ? createPayload.hostKey : ''
		expect(scheduleKey.length).toBeGreaterThan(4)
		expect(hostKey.length).toBeGreaterThan(8)

		const attendeeResult = await mcpClient.client.callTool({
			name: 'get_schedule',
			arguments: { scheduleKey },
		})
		const attendeePayload = parseToolJson(attendeeResult as CallToolResult)
		expect(attendeePayload.ok).toBe(true)
		const attendeeSchedule =
			typeof attendeePayload.schedule === 'object' && attendeePayload.schedule
				? (attendeePayload.schedule as Record<string, unknown>)
				: {}
		expect(attendeeSchedule.title).toBe('MCP test schedule')

		const saveAvailabilityResult = await mcpClient.client.callTool({
			name: 'save_attendee_availability',
			arguments: {
				scheduleKey,
				attendeeName: 'Alex',
				selectedSlotsUtc: [selectedSlotsUtc[0]],
			},
		})
		const saveAvailabilityPayload = parseToolJson(
			saveAvailabilityResult as CallToolResult,
		)
		expect(saveAvailabilityPayload.ok).toBe(true)

		const hostResult = await mcpClient.client.callTool({
			name: 'get_host_schedule',
			arguments: { scheduleKey, hostKey },
		})
		const hostPayload = parseToolJson(hostResult as CallToolResult)
		expect(hostPayload.ok).toBe(true)
		const attendeeSummary = Array.isArray(hostPayload.attendeeSummary)
			? hostPayload.attendeeSummary
			: []
		expect(attendeeSummary).toHaveLength(1)

		const updatedSlotsUtc = [selectedSlotsUtc[1]]
		const updateResult = await mcpClient.client.callTool({
			name: 'update_host_schedule',
			arguments: {
				scheduleKey,
				hostKey,
				title: 'Updated MCP schedule',
				startDate: '2026-03-10',
				endDate: '2026-03-10',
				slotMinutes: 60,
				timezone: 'UTC',
				selectedSlotsUtc: updatedSlotsUtc,
			},
		})
		const updatePayload = parseToolJson(updateResult as CallToolResult)
		expect(updatePayload.ok).toBe(true)
		const updatedSchedule =
			typeof updatePayload.schedule === 'object' && updatePayload.schedule
				? (updatePayload.schedule as Record<string, unknown>)
				: {}
		expect(updatedSchedule.title).toBe('Updated MCP schedule')

		const postUpdateAttendeeResult = await mcpClient.client.callTool({
			name: 'get_schedule',
			arguments: { scheduleKey, attendeeName: 'Alex' },
		})
		const postUpdateAttendeePayload = parseToolJson(
			postUpdateAttendeeResult as CallToolResult,
		)
		const postUpdateSelection = Array.isArray(
			postUpdateAttendeePayload.attendeeSelection,
		)
			? postUpdateAttendeePayload.attendeeSelection
			: []
		expect(postUpdateSelection).toEqual([])
	},
	defaultTimeoutMs,
)
