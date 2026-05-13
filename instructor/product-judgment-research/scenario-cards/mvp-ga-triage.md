# Scenario Card: MVP/GA Triage

## Use When

You want learners to practice edge-case sizing, patch-versus-refactor sequencing,
and risk containment right before a general availability milestone.

## Real Pain Pattern

The team finds a bug or confusing UX before GA. The "right way" fix is larger
than the launch window allows. The small fix feels incomplete, but the MVP's job
is to prove the model, not solve every future scaling concern.

## Scenario Seed

An analysis workflow has an edge-case bug. The team can patch the specific case,
feature-flag a risky path, add targeted explanatory UI, or do a holistic
refactor after launch. Alpha users have seen the issue, but usage is still too
thin for clean quantitative certainty.

## Decision to Practice

Should the team patch now and refactor later, delay GA for the right-way fix,
feature-flag the path, or accept the risk because the edge case is small?

## Evidence Available

- Rough estimate of affected edge-case percentage.
- Alpha user exposure.
- Qualitative user conversations.
- Analytics that exist but may be too thin or noisy.
- Product or executive pressure to prove the model.

## Constraints and Pressure

- MVP margins are thin.
- Product, executives, and engineering may disagree about the bar.
- A targeted UX fix may produce more user value than a deeper engineering fix.
- The engineering roadmap may absorb debt later, but not if GA fails.

## Options to Weigh

1. Patch the specific bug and schedule the broader refactor.
2. Delay GA for a holistic fix.
3. Feature-flag or disable risky behavior with explanatory text.
4. Accept the bug and monitor after launch.

## Participant Artifact

Create a GA triage note:

- What is affected and estimated impact.
- Why now versus later.
- Recommended containment path.
- Authority and disagreement record.
- Tech debt paid now versus intentionally deferred.
- Revisit date or trigger.

## Debrief Prompts

- What signal made patch-now/refactor-later acceptable?
- Who should own the call when evidence is mixed?
- Did the team optimize for proof-of-model or scale-the-model?
- How would you disagree-and-commit without hiding risk?

## Follow-Up Research Question

"How did you estimate the edge-case impact, and what would have changed your
recommendation?"
