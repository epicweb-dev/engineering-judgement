# Change Brief

This brief frames a proposed product change against the UX invariants before
implementation begins.

## Change request

- Requested change: help hosts identify the strongest candidate meeting times
  faster on the host dashboard.
- User problem: hosts currently have to scan the response grid manually to find
  the best overlap, which increases comparison effort and slows down final time
  selection.

## Affected flows and routes

- Primary flow touched: selecting the final time.
- Primary route touched: `/s/{scheduleKey}/{hostKey}`.
- Supporting flows that should remain effectively unchanged:
  - `/` create flow should not gain extra setup or new concepts for hosts.
  - `/s/{scheduleKey}` attendee response flow should stay focused on submitting
    availability, not interpreting results.

## UX invariants at risk

- The host dashboard must stay focused rather than cluttered.
- Best candidate times should become easier to compare without forcing the host
  to trust opaque logic.
- Host-only information must remain clearly separated from the public attendee
  experience.
- Time and timezone context must stay explicit anywhere candidate times are
  summarized.
- The change must not add friction to create or respond flows just to support a
  host-side improvement.

## Narrow first release

- Add a lightweight "best candidate times" summary to the host dashboard only.
- Show a short ranked list of the top candidate slots based on attendee overlap.
- For each candidate, show:
  - the exact time
  - explicit timezone context
  - how many attendees are available
- Keep the grid as the source of detail so hosts can verify the recommendation
  quickly instead of replacing the grid with a new decision surface.
- Keep finalization as a separate deliberate action rather than auto-selecting a
  winner.

## Explicitly out of scope

- Showing ranked candidate times to attendees.
- Automatic final-time selection.
- AI-generated recommendations or explanatory copy that adds new ambiguity.
- New preference systems such as "maybe," weighting, or confidence scoring.
- Notifications, reminders, or follow-up workflow changes tied to the summary.

## Review and degradation signals

- Positive signs:
  - hosts can identify likely final times faster with less manual scanning
  - the summary helps orientation without replacing confidence in the grid
  - timezone context remains easy to trust at a glance
- Degradation signals:
  - hosts cannot tell whether a candidate is only suggested or already finalized
  - the dashboard feels busier or harder to parse than before
  - reviewers need dense explanation to understand how rankings were derived
  - attendees start expecting visibility into host-only decision data
  - the change leaks into `/` or `/s/{scheduleKey}` and adds unnecessary
    concepts to those routes
- Review checklist:
  - confirm the summary appears only on the host route
  - confirm ranked times are easy to cross-check against the grid
  - confirm no new ambiguity is introduced around timezone or finalization state
  - confirm create and respond flows stay unchanged in scope and complexity
