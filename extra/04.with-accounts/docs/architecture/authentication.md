# Access model

`epic-scheduler` keeps the core scheduling flows lightweight while adding a
narrow host-only return path.

## Browser users

- Hosts still create schedules at `/` with no required account.
- A share link (`/s/:shareToken`) is still sent to participants.
- Participants still enter a display name and paint availability directly with
  no login.
- Private host links (`/s/:shareToken/:hostAccessToken`) remain valid and are
  still the fallback management path.
- Returning hosts can also use `/login` plus `/account/schedules` to reopen
  schedules they have claimed.
- Browser sessions are signed with the `epic-scheduler_session` cookie.

## Host login

- Login is passwordless and host-only.
- `POST /api/login` creates a one-time sign-in link for an email address.
- `GET /login/verify` consumes that one-time token, sets the session cookie, and
  redirects back into the host flow.
- `POST /api/schedules/:shareToken/claim` lets a signed-in host claim a schedule
  while proving access with the existing private host link.
- Claimed schedules appear at `/account/schedules`.

## MCP clients

- MCP endpoint: `/mcp`
- The MCP surface stays public and focuses on scheduler operations:
  - create schedule
  - submit attendee availability
  - read schedule snapshot
  - open the scheduler MCP app UI

Because there is no OAuth gate in v1, apply platform-level rate limiting in
Cloudflare where needed.

## Where to read next

- `server/auth-session.ts` for browser session cookies
- `shared/host-account-store.ts` for host login tokens
- `worker/index.ts` for MCP and websocket route handling
- `server/routes.ts` and `server/router.ts` for API route mapping
- `shared/schedule-store.ts` for schedule persistence and snapshot logic
- `worker/schedule-room.ts` for realtime update fanout
