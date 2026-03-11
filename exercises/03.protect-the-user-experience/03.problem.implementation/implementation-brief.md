# Implementation Brief

This brief turns the UX invariants into a concrete implementation plan for a
narrow host-login rollout.

## Goal and boundaries

- Requested implementation:
  - Add host-only login so returning hosts can re-find and manage schedules more
    reliably.
- Why the team now believes this is justified:
  - Enough time has passed since the exercise 2 decision that we now have
    evidence host return/access friction is materially harming follow-through.
  - The problem is still narrow: this is about returning-host continuity, not a
    broad product move to full participant accounts.
- Key indicators this plan must protect:
  - Finalized-plan rate
  - Create-flow completion rate
  - Attendee submission completion rate

## UX guardrails driving the plan

- Which invariants matter most for this implementation:
  - Creating a schedule must remain fast and account-free at the point of
    creation.
  - Attendee participation on `/s/{scheduleKey}` must remain no-account and
    low-ceremony.
  - Returning hosts must be able to get back to the right schedule without being
    dropped into generic auth confusion.
  - Host-only access paths and public participation paths must stay clearly
    separated.
- Which flows must remain effectively unchanged:
  - `/` should still behave like a lightweight schedule-creation flow.
  - `/s/{scheduleKey}` should still behave like a focused attendee submission
    flow.
  - Timezone clarity and finalization trust should remain intact once hosts are
    back in the product.
- What regressions are unacceptable:
  - Mandatory login before a schedule can be created
  - Any sign-in requirement for attendees
  - Losing host-link access before the logged-in path proves reliable
  - A measurable drop in finalized-plan rate because host return becomes more
    complicated

## Narrow first release

- What is the smallest host-login release worth shipping first:
  - Add optional host-only passwordless login plus a "claim this schedule"
    action for hosts who already have the private host link.
- Who can log in in this first version:
  - Hosts only
- What should still work without login:
  - Schedule creation
  - Attendee participation
  - Existing host-link-based management for both old and newly created schedules
- What remains explicitly out of scope:
  - Attendee accounts
  - Mandatory account creation during schedule setup
  - Cross-user collaboration, team ownership, or social profile features
  - Broad notification, settings, or account-management surfaces

## Flow and route design

- Which existing routes are touched:
  - `/` to optionally offer "save this schedule to your account" after creation
  - `/s/{scheduleKey}/{hostKey}` to let a host claim or associate the schedule
    with a logged-in identity
- What new authenticated host entry points, if any, are needed:
  - `/login` for passwordless host sign-in
  - `/account/schedules` or similar host-only route that lists claimed schedules
- How a returning host gets back to a schedule:
  - A returning host can sign in from a host-only entry point and land on a
    simple schedule list showing schedules they have already claimed.
  - Selecting a schedule takes them directly into the management experience.
- How host-link access and authenticated access coexist:
  - Host links remain valid in the first rollout and act as both a fallback
    access path and the proof needed to claim a schedule.
  - Claimed schedules can still be opened with the host link while the logged-in
    path proves itself in production.
- What the host sees after successful login:
  - A focused "your schedules" destination with direct links back to active host
    management surfaces, not a broad account dashboard.
- What happens when auth fails, expires, or is skipped:
  - The host is returned to a clear retry state with context preserved.
  - If they still have a valid host link, they can continue using it instead of
    being hard-blocked.

## Technical approach

- Authentication/session approach:
  - Use the starter's existing auth/session primitives, but limit the first
    rollout to passwordless email login for hosts to minimize support burden and
    password-recovery complexity.
- Data model or ownership changes:
  - Add a user record for hosts.
  - Add nullable schedule ownership fields such as `ownerUserId` and
    `claimedAt`, while preserving the existing host-key model.
  - Track whether a schedule is unclaimed, claimed, or later accessed through a
    fallback host link.
- Migration or backward-compatibility strategy:
  - Do not migrate or invalidate existing host links.
  - Make schedule claiming opt-in and incremental.
  - Preserve old behavior for any schedule that has not been claimed.
- Instrumentation needed before or during rollout:
  - Track create completion before/after login prompts are introduced.
  - Track host-link reuse, claim completion, login completion, and successful
    host-return rate.
  - Track finalized-plan rate for claimed vs unclaimed schedules.

## Delivery plan

- Recommended implementation sequence:
  - Re-enable the minimal auth primitives needed for passwordless host login.
  - Add host user + schedule ownership schema support.
  - Add schedule-claiming from the existing host route.
  - Add the returning-host schedule list.
  - Add instrumentation and review hooks before broader rollout.
- Risk-reduction steps before broad rollout:
  - Keep host links fully functional during the first release.
  - Gate post-create login prompts so they remain secondary and easy to dismiss.
  - Review every auth touchpoint against the UX invariants before shipping.
- Review checklist for protecting UX:
  - Confirm `/` still works without login and still centers schedule creation.
  - Confirm `/s/{scheduleKey}` has no account or ownership concepts.
  - Confirm a logged-in host can return to the intended schedule without losing
    context.
  - Confirm fallback host-link access still works when login is skipped or fails.

## Validation and rollback

- Positive signals to watch:
  - More hosts successfully return to manage/finalize schedules
  - Finalized-plan rate holds steady or improves
  - Create and attendee completion remain stable
- Regression signals to watch:
  - Create abandonment rises after login prompts are added
  - Attendees show confusion about whether they need accounts
  - Hosts fail to claim schedules or end up in dead-end auth states
  - Support burden increases around host-link vs login confusion
- What the team should do if the first rollout harms key indicators:
  - Hide or remove the post-create login prompt first.
  - Fall back to host-link-only management while preserving any claimed-account
    data already created.
  - Revisit the login entry points rather than forcing broader auth adoption.
