# Setup manifest

This document describes the infrastructure and secrets that epic-scheduler
expects.

## Cloudflare resources

Create or provide the following resources (prod + preview):

- D1 database
  - `database_name`: `<app-name>`
  - `database_name` (preview): `<app-name>-<preview>-db`

The post-download script will write the resulting IDs into `wrangler.jsonc` and
replace template `epic-scheduler` branding tokens with your app name across text
files.

## Optional Cloudflare offerings

The starter intentionally keeps the default footprint small. If you want to add
additional Cloudflare offerings (R2, Workers AI, AI Gateway, or a separate KV
namespace for app data), see:

- `docs/cloudflare-offerings.md`

## Rate limiting (Cloudflare dashboard)

Use Cloudflare's built-in rate limiting rules instead of custom Worker logic.

1. Open the Cloudflare dashboard for the zone that routes to your Worker.
2. Go to `Security` → `WAF` → `Rate limiting rules` (or `Rules` →
   `Rate limiting rules`).
3. Create a rule that targets high-write scheduler endpoints, for example:
   - Expression:
     `(http.request.method eq "POST" and (http.request.uri.path eq "/api/schedules" or http.request.uri.path wildcard "/api/schedules/*/availability"))`
   - Threshold: `10` requests per `1 minute` per IP (tune as needed).
   - Action: `Block` or `Managed Challenge`.

## Environment variables

Local development uses `.env`, which Wrangler loads automatically:

- `APP_BASE_URL` (optional; defaults to request origin, example
  `https://app.example.com`). Also used as the canonical MCP widget/API domain
  so sandbox-hosted widget requests target your real app domain.
- `APP_COMMIT_SHA` (optional; set automatically by deploy workflows for
  version-aware `/health` checks)

Tests run with `CLOUDFLARE_ENV=test` (set by Playwright) and still read local
secrets from `.env`.

## GitHub Actions secrets

Configure these secrets for GitHub Actions workflows:

- `CLOUDFLARE_API_TOKEN` (Workers deploy + D1 edit access on the correct
  account)
- `APP_BASE_URL` (optional, used by the production deploy)

Preview deploys for pull requests create a separate Worker per PR named
`<app-name>-pr-<number>` (for epic-scheduler: `epic-scheduler-pr-123`) with an
isolated D1 preview database. The same `CLOUDFLARE_API_TOKEN` must be able to
create/update and delete both.
