# First-Pass Follow-Up Contact List

Source: Kody stash notes from Kent's product-decision X prompt and follow-ups.
Prioritize examples with real pain around making, explaining, defending, or
revisiting product judgment calls.

## Priority Follow-Ups

| Priority | Contact/example | Why this matters                                                                                                           | Ask next                                                                                                                                     | Likely use                                                          |
| -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1        | Manoj Thokala   | Direct pain signal: explicitly lacks confidence making and defending product decisions.                                    | "Can you describe the last product-shaped decision you struggled to defend? What was at stake, who pushed back, and what would have helped?" | Target-learner interview and confidence-gap scenario.               |
| 2        | Stevie P        | Strong MVP/GA triage loop: patch vs right-way fix, feature flags, evidence weighting, alpha exposure, disagree-and-commit. | "How did you estimate impact, who owned the call, and what evidence would have changed patch-now/refactor-later?"                            | MVP triage card, evidence weighting card, decision-rights practice. |
| 3        | Ronan Berder    | Expert practice model: small sticky decisions, written process, AI as debate partner, deliberate revisit loops.            | "Can we walk through one decision record for attachments/comments/API shape, including options rejected and revisit trigger?"                | Small sticky decisions card and decision-record exemplar.           |
| 4        | Max Andrews     | Prototype-as-spec loop with customer notes, production-context prototyping, design feedback, and engineering handoff.      | "What painful earlier experience taught you to prototype this way, and where can this approach fail?"                                        | Prototype-as-spec card and product/engineering handoff exercise.    |
| 5        | Headmaster Duck | Organizational uncertainty loop: reversing a best practice, RFC resistance, delayed outcomes, enough feedback threshold.   | "What objections uncovered new risks versus repeated known tradeoffs, and who had authority to proceed?"                                     | RFC/feedback sufficiency card and delayed-outcome decision record.  |
| 6        | Kirill Goldin   | Enterprise pressure loop: loud customers, competitor parity, prioritization math, and unavailable "no."                    | "How did the team distinguish broader segment need from one-account pressure, and who could protect product coherence?"                      | Enterprise pressure card and decision-rights/governance practice.   |
| 7        | Sean Manzano    | Feature value versus feature framing: AI-aversion, backlash, paid-tier behavior, timing of public response.                | "What would you do differently next time, and what evidence is enough to keep investing despite sentiment risk?"                             | Feature framing card and audience-worldview research.               |
| 8        | Marc Beinder    | Launch performance bar: taste, target customer expectations, caching as quick win, longer-term cleanup.                    | "What exact threshold makes the product feel launch-ready, and what signal would force deeper refactor before launch?"                       | Launch-quality card and perceived-quality exercise.                 |

## Secondary Follow-Ups

| Contact/example | Why                                                                                   | Ask next                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Nik (@neke989)  | Temporary pain versus final product form during migration.                            | "What signal would turn known interim pain into new risk that requires optimization?"                    |
| Alem Tuzlak     | API/DX taste as product judgment, simplifying AI-generated proposals before feedback. | "Which primitive did you drop, and what made it feel bloated or hard to follow?"                         |
| Cosmin Pruteanu | Churn/business milestone pressure justifying a long fix.                              | "How did you measure churn impact, what alternatives were considered, and why was the delay acceptable?" |
| Ryan Allred     | Fog-of-war loop: ship known next step, run experiments, delete as uncertainty clears. | "Can you share a concrete example where you deleted or redirected work after the fog cleared?"           |

## Confidential Permission Queue

| Source                                  | Status                    | Safe use now                                                                                                                            | Ask before using                                                          |
| --------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Confidential buy-versus-build DM source | Private. Generalize only. | Use the anonymized pattern: AI changes build thresholds only where domain expertise plus internal capability creates asymmetric upside. | Any name, employer, industry, direct quote, or specific platform example. |

## Outreach Sequencing

1. Start with Manoj to validate direct learner pain.
2. Pair one expert-practice interview (Ronan or Max) with one messy authority
   interview (Stevie P, Headmaster Duck, or Kirill).
3. Use Sean, Marc, Nik, and Alem to diversify beyond classic feature
   prioritization into framing, launch quality, migration, and DX judgment.
4. Keep the confidential buy-versus-build source out of public examples unless
   Kent confirms permission.
