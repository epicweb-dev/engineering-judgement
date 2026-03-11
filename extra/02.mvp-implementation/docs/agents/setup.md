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
- `npm run dev`
- If you only need the client bundle or worker, use:
  - `npm run dev:client`
  - `npm run dev:worker`
- Set `CLOUDFLARE_ENV` to switch Wrangler environments (defaults to
  `production`). Playwright sets this to `test`.

## Checks

- `npm run validate` runs format check, lint fix, build, typecheck, Playwright
  tests.
- `npm run format` applies formatting updates.
- `npm run test:e2e:install` to install Playwright browsers.
- `npm run test:e2e` to run Playwright specs.

## Documentation maintenance

- Update `docs/agents` when behavior, workflows, architecture notes, or
  verification guidance change.
- Treat docs updates as part of done work.
- Keep `AGENTS.md` concise and index-like; put details in focused docs.
- When failures repeat, promote lessons from docs into tests, lint rules, or
  scripts.

## Reset local state

For a full local reset:

1. Delete local Wrangler state if you want a completely fresh database.
2. Re-apply migrations:
   - `npm run migrate:local`

For preview environments, we do a full resource reset:

1. Delete preview resources:
   - `node ./tools/ci/preview-resources.ts cleanup --worker-name <preview-worker-name>`
2. Recreate preview resources and config:
   - `node ./tools/ci/preview-resources.ts ensure --worker-name <preview-worker-name> --out-config wrangler-preview.generated.json`
3. Re-apply remote migrations:
   - `CLOUDFLARE_ENV=preview node ./wrangler-env.ts d1 migrations apply APP_DB --remote --config wrangler-preview.generated.json`

## PR preview deployments

The GitHub Actions preview workflow creates per-preview Cloudflare resources so
each PR preview is isolated:

- D1 database: `<preview-worker-name>-db`

When a PR is closed, the cleanup job deletes the preview Worker(s) and these
resources as well.

Cloudflare Workers supports version `preview_urls`, but this project continues
to use per-PR Worker names for predictable preview environments.

Production deploys also ensure required Cloudflare resources exist before
migrations/deploy:

- D1 database: from `env.production.d1_databases` binding `APP_DB`

Both the preview and production deploy workflows run a post-deploy healthcheck
against `<deploy-url>/health` and fail the job if it does not return
`{ ok: true, commitSha }` with `commitSha` matching the commit SHA deployed by
that workflow.

If you ever need to do the same operations manually, use:

- `node ./tools/ci/preview-resources.ts ensure --worker-name <name> --out-config <path>`
- `node ./tools/ci/preview-resources.ts cleanup --worker-name <name>`
- `node ./tools/ci/production-resources.ts ensure --out-config <path>`

## Remix package docs

Use the Remix package index for quick navigation:

- `docs/agents/remix/index.md`
