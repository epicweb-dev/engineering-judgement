# Implementation Brief

This brief captures technical decisions from the Kody + Kellie implementation
planning conversation.

## Starter primitives to use

- `server/routes.ts` for route definitions and dynamic segment patterns
- `server/handlers/*` for focused per-route server actions
- `client/routes/*` for per-route UI entry points
- `client/app.tsx` for shared app shell/navigation
- `client/styles/tokens.ts` for shared design tokens and consistent styling

## Starter surface to remove for MVP

- Authentication/account flows and related routes/endpoints:
  - `/login`
  - `/signup`
  - `/account`
  - `/auth`
  - `/session`
  - `/logout`
- Password reset flow and related email reset plumbing
- OAuth authorize/callback routes and related worker OAuth handlers
- Chat demo route/handler
- Calculator MCP demo tools/resources/widget host code not required by this MVP

Principle: keep only scheduling + host-link workflow surface to reduce
maintenance noise.

## Reusable implementation pieces

- `form-field` and `primary-button` for repeated form/action controls
- `schedule-grid` + `time-slot-cell` reused by:
  - `/`
  - `/s/{scheduleKey}`
  - `/s/{scheduleKey}/{hostKey}`
- `selection-drag-handle` behavior in the grid for mobile drag expansion +
  edge auto-scroll
- Standard web date inputs (`<input type="date">`) for start/end dates on `/`
  and `/s/{scheduleKey}/{hostKey}` (no custom date picker)

## Route-mode mapping

- Create mode on `/`: date setup + initial slot setup + create action
- Edit mode on `/s/{scheduleKey}/{hostKey}`: schedule edits + link sharing +
  response review
- Respond mode on `/s/{scheduleKey}`: attendee name entry + availability
  selection

## Design system guidance

- Reuse the existing design system implementation in the starter.
- Adjust tokens/theme values to match Brett's visual direction:
  - friendly and colorful
  - blues and greens
  - minimalistic and clean

## Architecture discipline

- Add explicit route entries first, then pair each with dedicated server
  handlers.
- Keep route modules thin by composing shared pieces instead of duplicating
  interaction logic.
