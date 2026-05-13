# Scenario Card: Small Sticky Product Decisions

## Use When

You want learners to feel how apparently small implementation choices become
durable product commitments.

## Real Pain Pattern

The decision sounds small: syntax, storage path, comment behavior, permissions,
agent API shape, or hosting cost. But changing it later may break user habits,
cross-platform compatibility, data migrations, pricing assumptions, or ecosystem
expectations.

## Scenario Seed

A Markdown collaboration product must choose attachment syntax, attachment
storage paths, comment behavior across desktop/mobile, workspace permissions,
agent APIs, and static asset hosting strategy before launch.

## Decision to Practice

How should the team decide what "right" means before real usage proves the
choice, and how should they record the decision so it can be revisited without
pretending it was obvious?

## Evidence Available

- Existing tool conventions from products users already know.
- Prototype feedback.
- Code smells or brittle API shapes found during implementation.
- Security, cost, and migration concerns.
- Personal product taste from being close to the user.

## Constraints and Pressure

- Launch decisions may be expensive to migrate.
- Mobile and desktop needs may conflict.
- Compatibility with adjacent tools may matter more than local elegance.
- AI can generate many plausible APIs, but cannot own the judgment.

## Options to Weigh

1. Follow the dominant convention from comparable tools.
2. Choose a custom behavior that better fits this product's model.
3. Hide the decision behind a migration-friendly abstraction.
4. Defer the surface until more usage exists.

## Participant Artifact

Create a small-decision record:

- Decision and scope.
- User expectation being honored or intentionally broken.
- Options rejected.
- Reversibility and migration cost.
- Signals that would force a revisit.
- Commit/tag or artifact that locks the decision for now.

## Debrief Prompts

- Which part of the decision was product judgment, not implementation detail?
- Did the team benchmark tools or just copy them?
- What would make the decision feel wrong after launch?
- How did AI help generate options without replacing judgment?

## Follow-Up Research Question

"Have you regretted one of these small sticky decisions before, and what would a
better record have changed?"
