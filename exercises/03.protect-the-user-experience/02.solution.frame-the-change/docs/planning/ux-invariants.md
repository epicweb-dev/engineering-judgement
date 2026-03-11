# UX Invariants

This document captures the critical user flows, the experience constraints that
must not degrade, and the signals we should watch as the product evolves.

## Critical user flows

### Create a schedule

- Key steps:
  - Host lands on `/` and quickly understands they are creating a new schedule.
  - Host chooses the date range and slot increment without hunting for controls.
  - Host marks initial availability in the grid and can tell which slots are
    selected at a glance.
  - Host creates the schedule and immediately receives both the attendee link
    and the private host link.
- What must stay fast, simple, and clear:
  - The first meaningful action should be obvious within a few seconds.
  - Date range, slot increment, and selected slots should be visible together so
    the host does not have to mentally reconstruct the schedule they are
    creating.
  - The create action should feel lightweight and should not require an account.
  - After creation, it should be obvious which link the host shares publicly and
    which link stays private.
- Degradation signals to watch:
  - Hosts hesitate before taking the first action or backtrack repeatedly while
    setting up a schedule.
  - Users create schedules with the wrong date range or slot increment because
    those settings are easy to miss.
  - Hosts are unsure whether the schedule was created successfully or which link
    they should send to attendees.

### Submit availability

- Key steps:
  - Attendee opens `/s/{scheduleKey}` and immediately understands that this is
    the response flow.
  - Attendee enters a name with minimal friction.
  - Attendee selects availability in the grid, primarily on mobile, with
    interactions that feel predictable and forgiving.
  - Attendee can clearly tell when availability has been saved or submitted.
- What must stay fast, simple, and clear:
  - Participation must remain no-account and low-ceremony.
  - The mobile interaction model must stay thumb-friendly, with obvious selected
    state and low accidental-input risk.
  - Timezone context must be explicit enough that attendees trust the times they
    are selecting.
  - The route should stay focused on one job: record availability quickly.
- Degradation signals to watch:
  - Attendees zoom, pan, or retry interactions because the grid is hard to
    operate on a phone.
  - People ask whether their availability was saved or which timezone they are
    looking at.
  - Drop-off increases between opening the schedule link and submitting
    availability.

### Select the final time

- Key steps:
  - Host opens `/s/{scheduleKey}/{hostKey}` and can quickly review attendee
    responses.
  - The host can scan overlap patterns and identify the strongest candidate
    times without excessive comparison work.
  - The host chooses a final time with confidence and can communicate that
    choice clearly.
  - The finalized plan is shown with unambiguous time and timezone context.
- What must stay fast, simple, and clear:
  - The host dashboard should make response review and decision-making feel
    focused rather than cluttered.
  - The best candidate times should be easy to compare without reading dense
    supporting detail first.
  - Host-only actions must stay clearly separated from the attendee experience.
  - Finalization should increase confidence, not introduce ambiguity.
- Degradation signals to watch:
  - Hosts have to inspect too many cells manually to decide on a final time.
  - Overlap patterns are difficult to interpret quickly.
  - Users still need an out-of-band conversation to confirm the "real" final
    time.
  - Hosts accidentally use the public flow when trying to review or finalize a
    plan.

## Cross-flow UX constraints

- Route purpose must stay obvious:
  - `/` is for creating a schedule.
  - `/s/{scheduleKey}` is for attendee participation.
  - `/s/{scheduleKey}/{hostKey}` is for host management and finalization.
- The product must remain fast to first meaningful action on both desktop and
  mobile.
- Time displays must remain trustworthy and unambiguous across host and attendee
  views.
- The experience should stay lightweight, focused, and free of unnecessary
  choices for an infrequent-use planning tool.
