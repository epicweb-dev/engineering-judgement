# Feature Framing Brief

This brief qualifies a proposed feature request before implementation begins.

## Request to evaluate

- Proposed request: add participant accounts and login so returning users can
  find their schedules again without relying on saved links.
- Why it sounds attractive:
  - It sounds like a path to better continuity for returning users.
  - It could reduce frustration for people who come back to schedules often.
  - It appears to unlock future identity-based features.
- What part of the product this would change:
  - The create flow on `/`
  - The host dashboard on `/s/{scheduleKey}/{hostKey}`
  - The attendee response flow on `/s/{scheduleKey}`
  - Authentication, session, recovery, and support flows

## Current product state to protect

- Current product goal to protect:
  - Finalized-plan rate without making the core scheduling flows meaningfully
    heavier
- Primary user segment:
  - Friends coordinating social plans across different organizations and
    schedules
- Existing decision or scope boundary this request pressures:
  - No-account participation and link-based access are deliberate product
    decisions that keep the workflow fast and easy to complete
- What active usage seems to be revealing:
  - Some returning users want an easier way to re-find schedules and manage
    repeat usage without depending on copied links

## User problem behind the request

- Claimed user problem:
  - Returning users have to depend on saved links, which may make it harder to
    re-find schedules and manage repeat usage
- Who experiences it:
  - Primarily hosts who may revisit schedules
  - Possibly repeat users who create or join multiple schedules over time
- Evidence we have right now:
  - We have direct evidence that low-friction participation matters, especially
    on mobile
  - We have direct evidence that low-friction participation is part of the
    current product strategy
  - We do not yet have direct evidence that accounts are blocking finalized
    plans
- Assumptions or momentum language to challenge:
  - Accounts are assumed to increase trust even though they also introduce
    friction
  - A full account system is assumed to be the right response to a narrower
    return-access problem
  - Future identity needs are assumed urgent before lighter-weight continuity
    improvements are explored

## Worth-shipping test

- Why this might matter now:
  - If hosts are losing access to schedules or distrusting link-based management,
    that could hurt follow-through
  - If repeat usage depends on saved identity, accounts could eventually improve
    continuity
- Why this might not be worth shipping now:
  - It adds complexity across every core flow before we know whether the
    underlying problem requires full authentication
  - It risks reducing response completion by adding new onboarding steps
  - It may over-solve a return-access problem that could be addressed more
    narrowly
- What would need to be true for this to deserve implementation:
  - Host-link return or trust problems are frequent enough to hurt finalized-plan
    rate
  - The benefit clearly outweighs any added friction in create or response flows
  - Lighter alternatives cannot solve the underlying continuity or trust problem
- Missing evidence or open questions:
  - How often do hosts lose or mistrust the private host link?
  - Do repeat users in this social planning use case actually want full accounts?
  - Would any sign-in expectation reduce attendee completion?
  - Can continuity and trust be improved without introducing authentication?

## Smaller alternatives

- Smallest change that could address the same problem:
  - Make host-link ownership and return access clearer in the UI
  - Improve copy around saving and reusing the private host link
  - Add product polish and trust cues without introducing login
- What could be deferred without losing the learning:
  - Full participant identity, persistent account ownership, and account-based
    schedule history
- What cleanup or refactoring should happen first, if any:
  - Strengthen measurement around host return behavior and link confusion
  - Reduce any ambiguity between public and host-only links
  - Validate the current host-link model before layering a broader auth system on
    top

## Recommendation

- Decision: narrow
- Rationale:
  - There is a plausible user problem here, but the current request jumps too
    quickly to a large solution
  - The current product strategy still depends on low-friction participation
  - Full accounts would expand product and technical surface area before a
    lighter-weight continuity problem has been properly framed
- Risks of saying yes too early:
  - Lower response completion
  - More complexity across routes, sessions, and support cases
  - Slower iteration on the core scheduling loop
- Risks of waiting or saying no:
  - Returning users may keep experiencing avoidable friction when trying to
    re-find schedules
  - A real host-return problem could remain partially unaddressed until we gather
    better evidence

## Minimal success definition if it proceeds

- Minimum scope worth shipping:
  - A narrow continuity improvement first, such as better return-access for
    hosts or repeat users, with no required attendee accounts
- Success criteria:
  - Finalized-plan rate does not decrease
  - Host return/access reliability improves meaningfully
  - Attendee completion remains fast and low-friction
- Failure signals:
  - Account steps appear in the attendee response flow
  - Login friction creates abandonment or support burden
  - Authentication work delays more important improvements to the core loop
- What should stay explicitly out of scope:
  - Mandatory attendee accounts
  - Social profiles or team features
  - Broad account settings and notification systems
