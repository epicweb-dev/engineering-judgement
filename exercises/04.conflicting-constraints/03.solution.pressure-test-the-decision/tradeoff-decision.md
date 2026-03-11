# Tradeoff Decision

This brief turns the tradeoff map into a clear recommendation the team can act
on.

## Decision

- Which path should ship now:
  - Ship the narrow host-focused continuity path now and keep broader
    repeat-user accounts deferred.
- Why this is the right tradeoff at the current product stage:
  - The product still wins on low-friction scheduling. The most credible problem
    we have is host return reliability, not universal identity. A broader
    account move would charge complexity across all major flows before the
    product has earned that cost.
- Which constraint are we prioritizing most:
  - Protect create-flow speed and attendee completion while improving host
    return reliability enough to help finalized-plan rate.
- Which constraint are we knowingly not maximizing:
  - We are not maximizing long-term identity optionality or the polish signal of
    a full account model yet.

## Success criteria

- What must improve if this decision is right:
  - Returning hosts re-find and manage schedules more reliably than before.
- What must not regress while we pursue it:
  - Schedule creation remains lightweight and skippable past any login prompts.
  - Attendee participation on `/s/{scheduleKey}` remains obviously
    guest-friendly and fast to complete.
  - Finalized-plan rate does not fall because the access model becomes more
    confusing.
- Which indicators or behaviors would give us confidence:
  - Host-return success rises.
  - Claim or login completion for hosts is healthy without displacing host-link
    fallback usage.
  - Create abandonment and attendee drop-off remain flat.

## Accepted downside

- What cost are we deliberately accepting:
  - Some repeat users may still feel the product lacks the permanence and
    convenience of a broader account system.
- Why that cost is preferable to the alternative right now:
  - It is safer to under-build identity than to over-build it into the create
    and attendee flows that currently make the product work.
- Which users or workflows are least well served by this decision:
  - Power users who want cross-schedule history or universal schedule recovery.

## Mitigations

- How we reduce the main downside of the chosen path:
  - Improve host-link clarity, make claiming easy, and ensure returning hosts
    can get back to the right schedule without generic account chrome.
- Which guardrails or rollout choices are required:
  - Keep login optional and host-only.
  - Preserve host-link fallback.
  - Keep account concepts out of `/s/{scheduleKey}`.
  - Make any post-create continuity prompt secondary and easy to dismiss.
- What fallback or rollback boundary we need:
  - If create completion, attendee completion, or finalized-plan rate worsens
    after rollout, remove the host-login prompt first and fall back to the
    host-link model while keeping any claimed ownership data intact.

## Deferred path

- What remains deferred for now:
  - Participant accounts
  - Cross-schedule history for all users
  - Broader account-management surfaces
  - Identity-based product expansion justified mainly by future optionality
- What evidence would reopen that path later:
  - The narrow host path fails to solve return reliability.
  - Repeat-user continuity becomes a demonstrated product need across a
    meaningful share of usage.
  - Broader identity can be introduced without materially harming guest
    participation.
- What would make us regret this decision:
  - Discovering that the product's next stage depends far more on repeat-user
    continuity than on frictionless first-time participation.
