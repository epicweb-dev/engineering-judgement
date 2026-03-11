# Data storage

The scheduler uses D1 as the durable store and Durable Objects for realtime
coordination.

## D1 (`APP_DB`)

Scheduler data lives in D1:

- `schedules`: link token, interval, range, metadata
- `attendees`: names and optional browser time zones per schedule
- `availability`: slot selections per attendee

Shared persistence logic is centralized in `shared/schedule-store.ts`.

## Durable Objects (`MCP_OBJECT`, `SCHEDULE_ROOM`)

- `MCP_OBJECT` hosts MCP runtime state (`mcp/index.ts`).
- `SCHEDULE_ROOM` handles websocket fanout and serialized availability writes
  (`worker/schedule-room.ts`).

The Worker forwards:

- `/mcp` to `MCP_OBJECT`
- `/ws/:shareToken` to `SCHEDULE_ROOM`

## Configuration reference

Bindings are configured per environment in `wrangler.jsonc`:

- `APP_DB` (D1)
- `MCP_OBJECT` (Durable Objects)
- `SCHEDULE_ROOM` (Durable Objects)
- `ASSETS` (static assets bucket)
