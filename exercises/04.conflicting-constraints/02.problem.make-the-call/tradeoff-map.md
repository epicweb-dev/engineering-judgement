# Tradeoff Map

This document makes the competing constraints visible before the team pretends
the decision is obvious.

## Decision context

- What new pressure or request is creating this conflict:
  - The team can now justify a narrow host-login improvement, but stakeholders
    are pushing to go further and add broader accounts for repeat users.
- Which earlier decision or scope boundary is now under pressure:
  - The exercise 2 decision to avoid a full account system and the exercise 3
    plan to keep login narrowly host-focused.
- Which user outcomes are most at risk if the team gets this wrong:
  - Finalized-plan rate
  - Create-flow completion speed
  - Attendee submission completion
  - Host trust that they can reliably get back to the right schedule

## Option A

- Path name:
  - Stay narrow: host-focused continuity improvement only
- What this path is trying to optimize:
  - Better return access for hosts
  - Lower risk to the create and attendee flows
  - Smaller implementation and support surface area
- Success criteria this path would claim:
  - Returning hosts recover schedules more reliably
  - Finalized-plan rate holds steady or improves
  - Create and attendee completion remain effectively unchanged
- Which flows or routes it touches most:
  - `/s/{scheduleKey}/{hostKey}` for host management and claiming
  - A host-only login entry point
  - Optional post-create continuity prompts on `/`
- Likely harms or regressions it introduces:
  - Some repeat users may still feel the product lacks the polish or permanence
    of a full account system
  - Hosts may still need to understand both host-link and account-based access
  - The narrower move may not fully solve long-term repeat-usage expectations
- Key assumptions or missing evidence:
  - The real pain is primarily host return access, not universal identity
  - Most attendee value still comes from fast, no-account participation
  - The product does not yet need cross-schedule history badly enough to justify
    broader scope
- Mitigations if this path is chosen:
  - Make host-link purpose and claiming behavior clearer in the UI
  - Keep login optional and host-only
  - Measure host-return success and revisit if the narrow path proves
    insufficient

## Option B

- Path name:
  - Expand to broader repeat-user accounts
- What this path is trying to optimize:
  - Stronger sense of trust and permanence
  - Easier schedule recovery across multiple visits
  - Future optionality for identity-based features
- Success criteria this path would claim:
  - More returning users can find schedules without saved links
  - Repeat usage feels more durable and professional
  - The product gains a clearer long-term identity model
- Which flows or routes it touches most:
  - `/` because account creation or login prompts tend to leak into creation
  - `/s/{scheduleKey}` because attendee identity expectations become harder to
    avoid
  - `/s/{scheduleKey}/{hostKey}` because host-link access now competes with
    authenticated ownership
  - New auth, recovery, and account-management routes
- Likely harms or regressions it introduces:
  - Create-flow friction rises as account concepts compete with quick schedule
    setup
  - Attendee completion may drop if the public flow feels more account-shaped or
    less obviously guest-friendly
  - Support and implementation cost grow materially because the team now owns
    auth, recovery, identity state, and confusion between access paths
  - Route purpose becomes easier to blur across public, host-only, and account
    surfaces
- Key assumptions or missing evidence:
  - More identity always equals more trust in this product category
  - Repeat users actually want accounts enough to offset the added friction
  - The team can add broader auth without harming mobile-friendly participation
  - Future optionality is valuable enough right now to justify present cost
- Mitigations if this path is chosen:
  - Keep attendee participation explicitly guest-friendly
  - Preserve host-link fallback during rollout
  - Gate account prompts away from the first-create and first-respond moments
  - Add instrumentation and rollback triggers before broad exposure

## Constraint collisions

- Which priorities are directly in tension:
  - Host-return reliability and future trust signals versus low-friction create
    and attendee completion
  - Product permanence versus route clarity and workflow simplicity
  - Future optionality versus current implementation and support cost
- Which route or workflow feels most fragile under this decision:
  - `/s/{scheduleKey}` is the most fragile because its value comes from being
    obviously lightweight and guest-oriented
- Which costs are immediate versus delayed:
  - Immediate costs: auth complexity, support burden, route confusion, create
    friction
  - Delayed benefits: stronger repeat-user continuity and future identity-based
    product expansion
- Which downside is easiest for a team to underestimate:
  - Leakage of account expectations into flows that currently succeed precisely
    because they are simple and no-account

## Open questions

- What evidence would most reduce uncertainty:
  - How often hosts fail to return without the private host link
  - Whether attendee completion drops when identity language is introduced
  - Whether repeat users in this social-planning context actually expect account
    persistence
- What would make the broader path clearly worth it:
  - Repeated evidence that host-return problems materially hurt finalized-plan
    rate and cannot be solved by a host-only path
  - Clear demand for cross-schedule history or identity-based recovery from a
    meaningful share of active users
- What would make the narrower path clearly insufficient:
  - Hosts still fail to re-find schedules even after a careful host-only
    continuity improvement
  - The product proves that repeat-user continuity matters more than
    ultra-lightweight first-use participation
