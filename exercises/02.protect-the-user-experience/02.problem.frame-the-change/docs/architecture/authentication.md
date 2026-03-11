# Access model

`epic-scheduler` is intentionally link-based and account-free for v1.

## Browser users

- Hosts create schedules at `/`.
- A share link (`/s/:shareToken`) is sent to participants.
- Participants enter a display name and paint availability directly.
- No login, signup, password reset, or session cookies are required.

## MCP clients

- MCP endpoint: `/mcp`
- The MCP surface is public in v1 and focuses on scheduler operations:
  - create schedule
  - submit attendee availability
  - read schedule snapshot
  - open the scheduler MCP app UI

Because there is no OAuth gate in v1, apply platform-level rate limiting in
Cloudflare where needed.

## Where to read next

- `worker/index.ts` for MCP and websocket route handling
- `server/routes.ts` and `server/router.ts` for API route mapping
- `shared/schedule-store.ts` for schedule persistence and snapshot logic
- `worker/schedule-room.ts` for realtime update fanout
