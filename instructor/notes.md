# Engineering Judgment Workshop Plan

## Goal

Build and run a workshop that trains engineering judgment under ambiguity: clarifying requirements, surfacing assumptions, defining success criteria, anticipating risks, and evaluating outcomes against intent.

## Success Criteria

- Learners explicitly document assumptions before implementation.
- Learners define measurable success criteria before writing code.
- Learners can explain tradeoffs and risk mitigation decisions.
- Final implementations are evaluated against declared criteria (not "did PM like it").
- Each exercise creates a clear reflection loop from intent -> execution -> outcome.

## Audience and Format

- Primary format: live facilitated workshop.
- Secondary format: self-paced adaptation after first live run.
- Estimated live duration: 3.5-4.5 hours including debriefs.
- Team shape: 1 facilitator + learners in pairs or small groups.

## Workshop Structure

### Exercise Flow (repeated per exercise)

1. **Problem framing**
   - Learners get starter app context, role sheet, and stakeholder objective.
   - They ask clarifying questions and extract constraints.
2. **Planning**
   - Learners document assumptions, success criteria, and implementation plan.
3. **Implementation**
   - Learners build using any workflow (manual coding, AI, etc.).
4. **Evaluation**
   - Compare what they declared vs what they built.
   - Analyze misses, tradeoffs, and hidden constraints.

### Proposed Exercise Arc

1. **Scheduling app MVP**
   - Baseline ambiguity and criteria-setting practice.
2. **Expanded features with hidden UX regressions**
   - Forces prioritization and explicit tradeoff language.
3. **Migration or scaling constraint**
   - Introduces architectural pressure and risk planning.
4. **Performance tradeoff with UX cost**
   - Makes latency/cost/experience tensions visible.
5. **Dependency-team constraint scenario**
   - Trains re-scoping, mitigation, and escalation judgment.

## What to Build First (Implementation Priority)

1. Exercise 1 stakeholder sheet (business goals, constraints, unknown unknowns).
2. Exercise 1 participant role sheet.
3. Exercise 1 reflection rubric/questions.
4. Hidden constraints map for Exercise 1.
5. Problem/solution files for Exercise 1 in workshop structure.
6. Facilitator debrief notes and expected misconception list.

## Exercise 1 Detailed Plan (Scheduling App MVP)

### Learner Inputs

- Short product objective with intentional ambiguity.
- Starter app with enough scaffolding to build quickly.
- Role identity and responsibility constraints.

### Required Learner Artifacts

- Clarifying questions asked (and why).
- Assumptions list (labeled and testable).
- Success criteria (observable/measurable).
- Plan with known risks and mitigations.
- Final implementation summary mapped to criteria.

### Evaluation Questions

- Which assumptions were explicit vs implicit?
- Which constraints were discoverable but missed?
- Did implementation satisfy stated success criteria?
- Which tradeoffs were intentional vs accidental?
- What would change in a second iteration?

## Facilitation Plan (Live Run)

1. **Intro (15 min)**
   - Set expectations: judging reasoning quality, not coding speed.
2. **Exercise cycle x 3-5 (35-45 min each)**
   - Framing + questions + build + evaluation.
3. **Debrief after each cycle (10-15 min)**
   - Capture decision patterns and failure modes.
4. **Final synthesis (20 min)**
   - Shared rubric language and transferable heuristics.

## Risks and Mitigations

- **Risk:** Learners optimize for implementation speed.
  - **Mitigation:** Gate implementation on written assumptions + criteria.
- **Risk:** Stakeholder feels "gotcha"-driven.
  - **Mitigation:** Keep hidden info realistic and reveal when asked directly.
- **Risk:** Reflection becomes subjective.
  - **Mitigation:** Tie critique to declared criteria and observable outcomes.
- **Risk:** Scope creep in first run.
  - **Mitigation:** Finish Exercise 1 fully before polishing Exercises 2-5.

## Definition of Done for V1

- Exercise 1 has complete problem/solution pair with README guidance.
- Stakeholder sheet and role sheet are usable without facilitator improvisation.
- Reflection rubric works consistently across at least 2 trial runs.
- Diff between problem and solution is focused and teachable.
- Instructor notes include timing, prompts, and debrief cues.

## Next Actions

1. Author Exercise 1 stakeholder sheet.
2. Draft Exercise 1 role sheet.
3. Write Exercise 1 problem and solution `README.mdx` files.
4. Build Exercise 1 problem app and minimal solution app.
5. Run one dry-run and revise rubric before adding Exercise 2.
