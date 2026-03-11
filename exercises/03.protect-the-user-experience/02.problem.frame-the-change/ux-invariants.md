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
  - If login is offered at all, it appears only after schedule creation as a
    clearly secondary way to make future return access easier.
- What must stay fast, simple, and clear:
  - The first meaningful action should be obvious within a few seconds.
  - Date range, slot increment, and selected slots should be visible together so
    the host does not have to mentally reconstruct the schedule they are
    creating.
  - The create action should feel lightweight and should not require an account
    before the schedule is created.
  - Any "save this to your account" or login prompt must be skippable and must
    not compete with the main success state.
  - After creation, it should be obvious which link the host shares publicly and
    which link stays private.
- Degradation signals to watch:
  - Hosts hesitate before taking the first action or backtrack repeatedly while
    setting up a schedule.
  - Users create schedules with the wrong date range or slot increment because
    those settings are easy to miss.
  - Hosts are unsure whether the schedule was created successfully or which link
    they should send to attendees.
  - Create completion drops when login language or claim-account prompts are
    introduced.

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
  - Attendees should never have to think about host login, account ownership, or
    schedule claiming.
- Degradation signals to watch:
  - Attendees zoom, pan, or retry interactions because the grid is hard to
    operate on a phone.
  - People ask whether their availability was saved or which timezone they are
    looking at.
  - Drop-off increases between opening the schedule link and submitting
    availability.
  - Account expectations or sign-in confusion leak into `/s/{scheduleKey}`.

### Return to manage and finalize

- Key steps:
  - A returning host can get back to the right schedule reliably, whether they
    arrive from a saved host link or a narrow host-login entry point.
  - If the host authenticates, they stay anchored to the schedule they were
    trying to manage instead of being dropped into generic account chrome.
  - Host opens the management experience and can quickly review attendee
    responses.
  - The host chooses a final time with confidence and can communicate that
    choice clearly.
  - The finalized plan is shown with unambiguous time and timezone context.
- What must stay fast, simple, and clear:
  - Returning-host access should feel more reliable without becoming a mandatory
    gate for creation or participation.
  - Login, claimed ownership, and host-link access must be explained in plain
    language so hosts understand how they are getting back in.
  - Host-only actions must stay clearly separated from the attendee experience.
  - Finalization should still feel focused and trustworthy after login is added.
- Degradation signals to watch:
  - Hosts are bounced into sign-in before they can understand why it is needed.
  - Hosts lose context after authenticating and cannot tell how to reach the
    schedule they meant to manage.
  - Hosts are unsure whether to use a host link, a logged-in dashboard, or both.
  - Finalized-plan rate drops because return access got more complicated instead
    of more reliable.

## Cross-flow UX constraints

- Route purpose must stay obvious:
  - `/` is for creating a schedule.
  - `/s/{scheduleKey}` is for attendee participation.
  - Host-only authenticated surfaces, if added, are for returning hosts and must
    not blur the meaning of `/s/{scheduleKey}`.
  - `/s/{scheduleKey}/{hostKey}` remains a host-only management surface unless a
    future migration intentionally replaces it.
- The product must remain fast to first meaningful action on both desktop and
  mobile.
- Create and attendee flows must remain account-free in the first narrow login
  release.
- Time displays must remain trustworthy and unambiguous across host and attendee
  views.
- The experience should stay lightweight, focused, and free of unnecessary
  choices for an infrequent-use planning tool.
- The key indicators to protect are finalized-plan rate, create-flow completion,
  and attendee submission completion.
