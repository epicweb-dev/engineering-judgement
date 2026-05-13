# Scenario Card: API Design as Product Judgment

## Use When

You want learners to practice applying product judgment to developer experience,
especially when AI-generated options are plausible but bloated.

## Real Pain Pattern

The maintainer is close to the user and has strong taste, but the API still
needs external feedback before release. AI can generate many abstractions; the
judgment is choosing what primitives to expose, what to drop, and how much
control users should keep.

## Scenario Seed

An OSS maintainer is designing an API for agent orchestration. AI-generated
proposals contain useful concepts but feel hard to follow. The maintainer keeps
useful ideas, simplifies toward plain JavaScript, shifts control to users, drops
unhelpful primitives, and plans feedback before shipping.

## Decision to Practice

Should the API expose powerful abstractions, keep the surface close to the
language, split advanced primitives into later releases, or seek more external
feedback before deciding?

## Evidence Available

- Maintainer taste from being a likely user.
- Prototype ergonomics.
- Feedback from other potential users.
- Complexity of generated proposals.
- Risk that an early public API becomes sticky.

## Constraints and Pressure

- API design creates long-lived commitments.
- DX frustration is product pain.
- Personal taste is a useful hypothesis, not a complete validation loop.
- AI can inflate the primitive set.

## Options to Weigh

1. Ship the richer abstraction set.
2. Simplify to plain-language primitives.
3. Keep advanced primitives experimental.
4. Delay public release for external feedback.

## Participant Artifact

Create a DX judgment note:

- Target developer job.
- Proposed primitives and user control model.
- Concepts dropped and why.
- Taste-based assumptions.
- Feedback required before shipping.
- Revisit trigger after adoption.

## Debrief Prompts

- What did "simple" mean for the target developer?
- Which generated concepts were useful but not worth exposing?
- Where did personal taste help, and where could it mislead?
- What would make the API hard to change later?

## Follow-Up Research Question

"Can you name a specific API primitive you dropped and what signal made it feel
wrong?"
