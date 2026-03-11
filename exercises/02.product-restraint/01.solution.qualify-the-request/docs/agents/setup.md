# Setup

Quick notes for getting a local epic-scheduler environment running.

## Prerequisites

- Node.js v24+.
- npm.

## Install

- `npm install`

## Local development

- Copy `.env.example` to `.env` before starting any work, then update secrets as
  needed.
- `npm run dev`.
- If you only need the client bundle or worker, use:
  - `npm run dev:client`
  - `npm run dev:worker`
- Set `CLOUDFLARE_ENV` to switch Wrangler environments (defaults to
  `production`). Playwright sets this to `test`.

## Checks

- `npm run validate` runs format check, lint fix, build, typecheck, Playwright
  tests, and MCP E2E tests.
- `npm run test:e2e:install` to install Playwright browsers.
- `npm run test:e2e` to run Playwright specs.
- `npm run test:mcp` to run MCP server E2E tests.

## MCP diagnostics logs

Production and local Worker logs now include structured MCP diagnostics for
`/mcp` requests:

- `mcp request received` with request metadata and decoded RPC summary
  (`rpcMethod`, `rpcToolName`, `rpcArgumentKeys`, `isWriteToolCall`) when
  available from `cf-mcp-message` headers or JSON request bodies.
- `mcp request handled` with response status and duration.
- `mcp request failed` with error name/message and the same request/RPC
  metadata.

Write tool handlers also emit safe invocation logs:

- `create_schedule tool invoked|succeeded|returned error`
- `submit_schedule_availability tool invoked|succeeded|returned error response|threw`

These logs intentionally avoid full token/body dumps and only include safe shape
metadata.

## MCP create tool contract notes

- `create_schedule` returns a generated `hostAccessToken`.
- `create_schedule` supports `disabledDays` on creation (weekday names or 0-6)
  and maps those days to blocked slots across the requested date range.

## PR preview deployments

The GitHub Actions preview workflow creates per-preview Cloudflare resources so
each PR preview is isolated:

- D1 database: `<preview-worker-name>-db`

When a PR is closed, the cleanup job deletes the preview Worker and database.

Cloudflare Workers supports version `preview_urls`, but those preview URLs are
not currently available for Workers that use Durable Objects. The app binds DOs,
so previews continue to use per-PR Worker names.

Both the preview and production deploy workflows run a post-deploy healthcheck
against `<deploy-url>/health` and fail the job if it does not return
`{ ok: true, commitSha }` with `commitSha` matching the commit SHA deployed by
that workflow.

If you ever need to do the same operations manually, use:

- `node ./tools/ci/preview-resources.ts ensure --worker-name <name> --out-config <path>`
- `node ./tools/ci/preview-resources.ts cleanup --worker-name <name>`

## Remix package docs

Use the Remix package index for quick navigation:

- `docs/agents/remix/index.md`
