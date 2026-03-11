# Implementation Brief

This brief captures technical decisions from the Kody + Kellie implementation
planning conversation.

## Starter requirements and risks

### MVP delivery requirements

- Ship the first usable version quickly with small team capacity.
- Keep complexity low so the team can iterate based on real feedback.
- Support a mobile-first web experience for availability response.
- Support no-account participation and no-account host onboarding for MVP.
- Issue a private host management link on event creation.
- Enable straightforward instrumentation for core funnel metrics.

### Likely near-term requirements

- Authentication and user identity refinement as usage grows.
- Smooth migration from private host links to optional/required account
  ownership.
- More robust scheduling workflows and notifications.
- Better data modeling for growth in event and participant volume.
- Incremental integration needs without rewriting core architecture.

### Architecture risks

- Choosing a starter that is quick now but rigid when features expand.
- Over-optimizing for enterprise concerns before product fit is proven.
- Introducing too many dependencies before core loop validation.
- Implementing host-link access in a way that makes future auth migration
  painful.

## Starter decision

### Decision

Use [epicflare](https://github.com/epicweb-dev/epicflare) as the project
starter.

### Alternatives considered

We evaluated other plausible starters against the same rubric (MVP speed,
host-link support, auth evolution path, and long-term flexibility).

Conclusion: multiple options could satisfy the requirements at a similar level.

### Why this starter

- It provides a simple path to start MVP implementation quickly.
- It supports the no-account MVP model with private host-link management.
- It supports a sound architecture that can evolve with product needs.
- It reduces risk of painting the team into a corner as requirements expand.
- Kellie is already familiar with it, which lowers execution risk in this
  context.
- Standardizing on one starter across the workshop improves consistency for
  instruction, discussion, and support.

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

## Interaction and scheduling requirements

- Grid interaction should feel spreadsheet-like (Excel-like on desktop):
  - dense, table-like slot layout
  - drag-to-select / drag-to-expand interactions
  - strong selected-state visibility
- Brett's mobile interaction requirement: mimic Google Docs/Google Sheets mobile
  behavior where selecting a cell reveals a drag handle that can expand or
  shrink the current selection.
- Host must be able to choose availability from any time in the day (full-day
  coverage), not only business hours.
- Host must be able to set slot increment to one of:
  - 15 minutes
  - 30 minutes
  - 60 minutes
- Slot increment is part of schedule configuration and can be updated from the
  host route.
- Respond route should honor host-selected slot increment and availability
  window.

## Timezone and temporal correctness requirements

- Timezone handling is a release-critical behavior.
- Persist canonical slot times in UTC, and persist the host IANA timezone as
  schedule metadata.
- Display times using clear timezone context:
  - host sees schedule in host timezone
  - attendee sees schedule in attendee local timezone with explicit timezone
    label/indicator
- Maintain deterministic conversion behavior across DST boundaries and date
  transitions.
- Ensure final confirmed-plan outputs include unambiguous timezone information.

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

## Simulation realism requirements

- Treat this step as an in-world product implementation scenario.
- Keep UI copy, logs, and route-facing behavior product-realistic and
  user-facing.
- Do not introduce workshop/training/meta language inside the in-app
  experience for this step.
