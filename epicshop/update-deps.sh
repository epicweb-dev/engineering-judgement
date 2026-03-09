#!/usr/bin/env bash
set -euo pipefail

npx npm-check-updates --dep prod,dev --upgrade --workspaces --root
cd epicshop && npx npm-check-updates --dep prod,dev --upgrade --root
cd ..

latest_agents_version="$(npm view agents version)"
mcp_sdk_version="$(npm view "agents@${latest_agents_version}" dependencies.@modelcontextprotocol/sdk)"

if [ -z "${mcp_sdk_version}" ] || [ "${mcp_sdk_version}" = "undefined" ]; then
	echo "Could not determine @modelcontextprotocol/sdk version for agents@${latest_agents_version}" >&2
	exit 1
fi

echo "Using @modelcontextprotocol/sdk@${mcp_sdk_version} from agents@${latest_agents_version}"

node - "${mcp_sdk_version}" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const sdkVersion = process.argv[2]
const rootDir = process.cwd()
const packageJsonPaths = []

function collectPackageJsonPaths(dirPath) {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true })
	for (const entry of entries) {
		if (entry.name === 'node_modules' || entry.name === '.git') continue
		const entryPath = path.join(dirPath, entry.name)
		if (entry.isDirectory()) {
			collectPackageJsonPaths(entryPath)
			continue
		}
		if (entry.isFile() && entry.name === 'package.json') {
			packageJsonPaths.push(entryPath)
		}
	}
}

collectPackageJsonPaths(rootDir)

for (const packageJsonPath of packageJsonPaths) {
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
	const hasAgentsDependency =
		Boolean(packageJson.dependencies?.agents) ||
		Boolean(packageJson.devDependencies?.agents) ||
		Boolean(packageJson.optionalDependencies?.agents) ||
		Boolean(packageJson.peerDependencies?.agents)

	if (!hasAgentsDependency) continue

	packageJson.dependencies = {
		...(packageJson.dependencies ?? {}),
		'@modelcontextprotocol/sdk': sdkVersion,
	}
	packageJson.overrides = {
		...(packageJson.overrides ?? {}),
		'@modelcontextprotocol/sdk': sdkVersion,
	}

	fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
	console.log(`Updated ${path.relative(rootDir, packageJsonPath)}`)
}
NODE

rm -rf node_modules package-lock.json ./epicshop/package-lock.json ./epicshop/node_modules ./exercises/**/node_modules
npm install
npm run setup
npm run typecheck
npm run lint -- --fix
