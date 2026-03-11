import { createMcpHandler } from 'agents/mcp'
import { createSchedulingMcpServer } from './server.ts'

export function createSchedulingMcpHandler(env: Env) {
	const server = createSchedulingMcpServer(env)
	return createMcpHandler(server)
}
