# Response Constraint Brief

This brief turns a qualified feature request into the narrowest product
response worth considering before implementation begins.

## Starting point

- Qualified request:
  - Add participant accounts and login so returning users can find their
    schedules again without relying on saved links.
- Decision from the feature-framing brief:
  - Narrow.
- Narrow problem we are actually responding to:
  - Returning hosts may need a more trustworthy and discoverable way to get
    back to schedule-management access without turning the whole product into an
    account system.

## Constrained response

- Smallest response worth exploring first:
  - Improve host return-access clarity and trust before introducing any account
    model.
  - Make the host-only access path easier to understand, save, and re-use.
- Who it helps first:
  - Hosts who revisit schedules after creation.
- What it intentionally avoids adding:
  - Mandatory sign-in
  - Participant accounts
  - Cross-schedule history
  - Broader identity, profile, or team features

## Product boundaries to protect

- What must stay low friction:
  - Creating a schedule should remain fast and lightweight.
  - Submitting availability should stay account-free and easy to complete,
    especially on mobile.
- Which flows should remain unchanged:
  - The attendee response flow on `/s/{scheduleKey}` should not gain login,
    ownership, or identity concepts.
  - The create flow on `/` should not add setup burden just to support a
    continuity improvement for returning hosts.
- What complexity we are explicitly refusing for now:
  - Authentication and session management
  - Password recovery and support workflows
  - Persistent participant identity across schedules
  - New settings, notifications, or account-management surfaces

## Prerequisites and evidence

- What cleanup or clarity work should happen first:
  - Clarify the distinction between public and host-only links.
  - Improve product cues around saving and reusing the private host link.
  - Validate that the current host-link model is understandable before layering
    broader product concepts on top.
- What evidence would justify expanding scope later:
  - Repeated host-return failures materially hurt finalized-plan rate or trust.
  - Narrower continuity improvements do not solve the problem well enough.
  - A broader solution can be added without degrading attendee completion or
    create-flow simplicity.
- What open questions still remain:
  - How often do hosts actually lose access versus just feeling uncertain?
  - Would repeat users in this product category truly expect accounts?
  - Can continuity be improved enough without introducing authentication?

## Recommendation

- What the team should do next:
  - Pursue only a narrow host-return continuity improvement, or defer entirely
    until better evidence exists.
- Why this is the right level of response now:
  - It responds to the plausible problem without expanding every core flow.
  - It preserves the current product's low-friction advantage.
  - It keeps the team focused on trust and continuity instead of prematurely
    adopting a much broader product model.
- What should stay deferred or rejected:
  - Full participant accounts for now
  - Mandatory identity in the attendee flow
  - Broad account systems justified mainly by "professionalism" or future
    optionality

## Success and failure boundaries

- Minimum success definition:
  - Hosts can return to schedule-management access more reliably and with less
    confusion, while create and attendee flows remain just as lightweight as
    they are now.
- Failure signals:
  - Account expectations leak into the attendee response flow.
  - New setup or sign-in burden appears in schedule creation.
  - The narrow response still requires broad auth or support complexity to be
    viable.
- Triggers to revisit a broader solution later:
  - Evidence shows continuity problems are frequent, materially harmful, and not
    solvable through lighter-weight product responses.
