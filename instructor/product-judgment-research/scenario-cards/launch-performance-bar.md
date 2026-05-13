# Scenario Card: Launch Performance Bar

## Use When

You want learners to practice deciding what "fast enough" means when performance
is tied to perceived product quality, not just engineering preference.

## Real Pain Pattern

The product still uses MVP-era rendering. A deeper refactor would be cleaner,
but launch is approaching and the first impression needs to feel credible. The
team must decide whether a tactical cache or partial refactor is enough.

## Scenario Seed

A CMS product powers its own marketing site. The page load feels slow and janky
during launch prep. The founder worries customers will not believe in the CMS if
the CMS cannot make its own site feel good.

## Decision to Practice

Should the team ship a quick caching improvement, delay launch for deeper
architecture cleanup, narrow the launch audience, or accept the current
performance for now?

## Evidence Available

- First response time ranges.
- Target customer expectations.
- Qualitative "wow factor" and perceived quality.
- Knowledge that pages do not change constantly.
- Known longer-term simplification opportunities.

## Constraints and Pressure

- Launch perception matters.
- Taste may be the strongest current signal.
- Predictability may matter more than theoretical speed.
- A short-term patch should not erase the need for future cleanup.

## Options to Weigh

1. Add caching now and keep the launch date.
2. Delay launch for deeper rendering refactor.
3. Launch to a smaller audience with known limitations.
4. Keep current performance and monitor complaints.

## Participant Artifact

Create a launch-quality bar:

- Target user and expectation.
- Current performance and perceived quality problem.
- "Good enough for launch" threshold.
- Tactical fix and why it is acceptable.
- Cleanup debt intentionally carried forward.
- Revisit trigger after launch.

## Debrief Prompts

- What made this a product decision rather than pure tech debt?
- Which evidence was measurable versus taste-based?
- What would make the caching patch irresponsible?
- What customer expectation did the bar optimize for?

## Follow-Up Research Question

"How are you deciding when it is fast enough: target metric, target customer
expectation, test usage, or taste?"
