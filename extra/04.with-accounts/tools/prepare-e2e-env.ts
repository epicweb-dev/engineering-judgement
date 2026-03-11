import {
	appendFileSync,
	copyFileSync,
	existsSync,
	readFileSync,
} from 'node:fs'
import { join } from 'node:path'

const envPath = join(process.cwd(), '.env')
const examplePath = join(process.cwd(), '.env.example')

if (!existsSync(envPath) && !existsSync(examplePath)) {
	console.error(
		'Missing .env and .env.example; cannot prepare E2E environment.',
	)
	process.exit(1)
}

if (!existsSync(envPath)) {
	copyFileSync(examplePath, envPath)
	console.log('Created .env from .env.example for E2E tests.')
}

const envContents = readFileSync(envPath, 'utf8')
if (!/^COOKIE_SECRET=/m.test(envContents)) {
	const fallbackSecret = 'e2e-cookie-secret'
	appendFileSync(
		envPath,
		`${envContents.endsWith('\n') || envContents.length === 0 ? '' : '\n'}COOKIE_SECRET=${fallbackSecret}\n`,
	)
	console.log('Added COOKIE_SECRET to .env for E2E tests.')
}
