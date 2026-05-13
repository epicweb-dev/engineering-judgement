# Scenario Card: Enough Feedback to Reverse a Best Practice

## Use When

You want learners to practice organizational product judgment where the outcome
will not be known quickly and technical "best practice" is not enough.

## Real Pain Pattern

A long-standing internal best practice creates complexity outside the team's
direct control. Reversing it triggers resistance, but waiting for perfect proof
means continuing to export complexity to customers, partners, or other systems.

## Scenario Seed

A company has modeled product identity around a legacy compound concept for
years. Modern commerce, portals, invoices, integrations, and future syndication
need stable single identifiers. The proposed change moves complexity back into
internal systems the team controls.

## Decision to Practice

When do objections stop revealing new risks and start repeating known tradeoffs?
Should the team proceed, gather more feedback, narrow the change, or preserve
the existing practice?

## Evidence Available

- RFC feedback from impacted teams.
- External integration requirements.
- Known failure modes from the current model.
- No clean near-term win and a long feedback loop before success is obvious.

## Constraints and Pressure

- Outcomes may take many months to validate.
- Multiple teams own parts of the current workflow.
- External ecosystems punish unstable or compound identity.
- Internal systems can absorb complexity more safely than public-facing systems.

## Options to Weigh

1. Keep the existing best practice and document workarounds.
2. Reverse the practice broadly after RFC review.
3. Pilot the new identity model in one bounded surface.
4. Delay until a clearer business incident creates urgency.

## Participant Artifact

Create an RFC decision addendum:

- Why the old best practice is wrong for this context.
- Which risks are bounded internally versus unbounded externally.
- Objections received and whether each uncovered new risk.
- Decision owner and escalation path.
- Revisit trigger and expected evidence.

## Debrief Prompts

- Which arguments were technical preferences versus product/business signals?
- What made the risk surface bounded or unbounded?
- Who had authority to decide that enough feedback had been gathered?
- How would you explain the delayed outcome to a skeptical executive?

## Follow-Up Research Question

"How did you know you had enough feedback to move forward instead of running one
more alignment cycle?"
