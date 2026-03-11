# Tradeoff Review

This review pressure-tests the chosen tradeoff and defines how the team would
respond if the decision starts failing in practice.

## Failure modes

- How could the chosen path still hurt schedule creation:
  - Even a host-only continuity prompt could slow the post-create moment if it
    competes with the more important "share this schedule" success state.
- How could the chosen path still hurt attendee participation:
  - Identity language could leak into `/s/{scheduleKey}` through copy, chrome,
    or navigation and make the flow feel less obviously guest-friendly.
- How could the chosen path still hurt host return or finalization:
  - Hosts could become confused about whether they should use the host link, the
    claimed schedule path, or both, which would weaken the reliability gains the
    change was meant to create.

## Signals to watch

- What would tell us we picked the wrong side of the tradeoff:
  - Host return still underperforms while complexity and support cost rise
    anyway.
- Which behavioral or product signals matter most:
  - Create completion rate
  - Attendee submission completion
  - Host-return success
  - Finalized-plan rate
  - Support questions about host-link versus login confusion
- Which signal would make you worry first:
  - Any sign that attendee completion drops or that public responders start
    asking whether they need accounts.

## Required protections

- Which mitigations are non-negotiable for the chosen path:
  - Login remains optional and host-only.
  - Host-link fallback stays valid.
  - `/s/{scheduleKey}` remains free of ownership and account language.
  - Route purpose stays crisp across `/`, `/s/{scheduleKey}`, and
    `/s/{scheduleKey}/{hostKey}`.
- What rollout conditions or guardrails must be present:
  - Instrumentation must be in place before exposure grows.
  - The post-create continuity prompt must be secondary and dismissible.
  - Failed auth must preserve context rather than trapping the host in generic
    account flows.
- What must stay unchanged to protect user trust:
  - Fast schedule creation
  - Lightweight guest participation
  - Trustworthy finalization and timezone clarity

## Revision and rollback

- What would you narrow or change first if things go badly:
  - Remove or hide the post-create prompt first, then simplify the login entry
    point if hosts still get lost.
- What is the rollback boundary:
  - If the rollout causes a meaningful decline in create completion, attendee
    completion, or finalized-plan rate, revert back to the host-link-first
    access model while preserving any safely claimed ownership data.
- What would stay worth keeping even if the rollout underperforms:
  - Clearer host-link language and any product copy improvements that help hosts
    understand return access without adding friction elsewhere.

## Revisit triggers

- What future evidence would justify reopening the deferred path:
  - A strong repeat-user pattern emerges where cross-schedule history or account
    recovery materially improves product outcomes.
  - The narrow host path proves too limited despite strong execution.
- What would have to become true for the bigger option to be the better
  tradeoff:
  - Identity continuity would need to become central to product value rather
    than a secondary trust or convenience improvement, and the team would need a
    credible way to add it without degrading guest participation.
