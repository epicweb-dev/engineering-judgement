# End-to-end testing principles

Use Playwright for a small set of high-signal user journeys that exercise the
worker and client together.

## Scope

- Keep e2e focused on happy paths.
- Prefer a few durable tests over many fragile regressions.
- Move edge cases to unit tests or browser-level tests.

## What belongs in e2e

- Home flow: create a schedule and land on the host dashboard.
- Collaboration flow: attendee availability changes appear for the host.
- Host flow: key host actions persist (for example host profile edits).
- MCP app flow: widget can load a schedule and save availability.

## What does not belong in e2e

- Narrow layout or CSS overflow regressions.
- Device/input edge behavior (complex drag, keyboard, touch, DST quirks).
- Pure utility behavior, copy-only checks, or component-level mechanics.

## Structure and style

- Keep tests flat (`test(...)` at top level).
- Inline setup per test unless shared setup clearly improves readability.
- Assert user-visible outcomes first (URL, headings, persisted values).
- Prefer accessible locators (`getByRole`, `getByLabel`, `getByText`).
- When a locator needs special scoping, explain it with a short inline comment
  in the test file instead of expanding global docs.

## Locators

Prefer stable, user-facing selectors:

- `getByRole` for buttons, links, headings, and inputs.
- `getByLabel` for form fields.
- `getByText` only for brief, stable copy.

Avoid `page.locator('css')` unless no accessible alternative exists.

## Running tests

- `npm run test:e2e`
- `npx playwright test e2e/home.spec.ts`
- If `.env` is missing, `test:e2e` copies `.env.example` to `.env` before
  Playwright starts.

## Documentation policy

- Keep this doc cross-cutting and stable.
- Put file-specific testing nuance in nearby inline comments or helper names.
