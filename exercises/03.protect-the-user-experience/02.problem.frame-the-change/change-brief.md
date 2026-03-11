# Change Brief

This brief frames the already-justified login change against the UX invariants
before implementation details are finalized.

## Change request

- Requested change:
  - Add narrow host-only login so returning hosts can re-find and manage their
    schedules more reliably.
- User problem:
  - Hosts who return after schedule creation should not have to depend only on
    saved private links when that behavior is now proving unreliable enough to
    hurt follow-through.

## Affected flows and routes

- Which host-return and host-management flows does this change touch most?
- Which routes are involved now, and which authenticated host route might need
  to be added?
- Which flows must remain unchanged:
  - `/` create flow
  - `/s/{scheduleKey}` attendee response flow

## UX invariants at risk

- Which existing invariants matter most for adding login?
- What parts of the experience must stay fast, simple, and clear even if return
  access improves?
- Where could login accidentally introduce ambiguity between host-link access,
  account access, and attendee participation?

## Narrow first release

- What is the smallest host-login release worth shipping first?
- What should the first release help returning hosts do faster or more
  confidently?
- What should it avoid adding right now?

## Explicitly out of scope

- What related account ideas should be deferred?
- What would make this login rollout too heavy for a first release?

## Review and degradation signals

- What signs would tell you the change improved host return reliability?
- What signs would tell you it made the product worse for create, respond, or
  finalize flows?
- What should reviewers check before approving the implementation plan?
