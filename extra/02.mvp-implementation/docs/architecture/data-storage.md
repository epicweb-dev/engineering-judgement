# Data storage

This project uses D1 for scheduling data and the Worker asset binding for the
client bundle.

## D1 (`APP_DB`)

Relational app data lives in D1.

Current schema is defined by migrations in `migrations/`:

- `schedules`: schedule metadata plus host access keys
- `schedule_slots`: canonical UTC slots for each schedule
- `attendee_availability`: attendee selections for each slot

App access pattern:

- `server/scheduling-repository.ts` is the main persistence layer for schedule
  creation, reads, and updates
- Database row validation and API payload parsing use `remix/data-schema`
- Schedule handlers call D1 directly for the core MVP workflows

## Configuration reference

Bindings are configured per environment in `wrangler.jsonc`:

- `APP_DB` (D1)
- `ASSETS` (static assets bucket)
