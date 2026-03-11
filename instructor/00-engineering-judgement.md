## **Epic Systems — Engineering Judgment Workshop**

### **Working Design Summary (Current State)**

---

## **1. Core Thesis**

> As AI increasingly performs implementation, the scarce engineering skill becomes judgment — defining problems clearly, surfacing constraints, articulating tradeoffs, protecting user experience, and evaluating systems under ambiguity.

**Design principle:** Avoid teaching tools, frameworks, or AI workflows. Focus entirely on durable reasoning skills.

---

## **2. Core Intent**

- The workshop trains **engineering judgment**, not implementation workflow.
- Implementation mechanics are intentionally de-emphasized because they are volatile and tool-dependent.
- The durable skill is:
  - Extracting constraints
  - Clarifying ambiguity
  - Defining success criteria
  - Surfacing assumptions
  - Anticipating risk
  - Evaluating outcomes against intent

Implementation still matters — but as an **artifact to evaluate**, not as the primary learning focus.

---

## **3. Structural Model: The Critique Cycle**

Each exercise follows the same loop. The exercises should **not** feel like repeated stakeholder interviews. Each exercise targets a **different dimension** of engineering judgment.

| Step | Description |
|------|-------------|
| 1 | Ambiguous scenario |
| 2 | Participant clarification questions |
| 3 | Written problem definition + plan |
| 4 | AI implementation |
| 5 | Structured critique |
| 6 | Gap analysis |
| 7 | Extracted heuristics |

---

## **4. Exercise Progression: Five Judgment Muscles**

| Exercise | Skill | Purpose |
|----------|-------|---------|
| 1 | Problem definition | Convert vague goals into concrete system definition |
| 2 | Protecting UX invariants | Identify what must not degrade when a system evolves |
| 3 | Feature framing and product thinking | Decide whether a feature is worth building and define why before implementation starts |
| 4 | Articulating tradeoffs | Make competing constraints legible and justify decisions |
| 5 | Risk modeling & system continuity | Manage large change while preserving user trust |

The workshop should feel like **layers of engineering judgment**, not repeated planning exercises.

---

## **5. Exercise 1 — Ambiguous Product: Build the MVP**

**Purpose:** Teach engineers to convert vague goals into a concrete system definition.

**Scenario:** Participants design and ship the first version of a scheduling tool (similar to When2Meet / Doodle).

**Key practices:**
- Stakeholder clarification questions
- Extracting hidden constraints
- Defining success criteria
- Writing a discovery brief
- Defining a minimal viable capability set
- Proposing an implementation plan
- AI performs the implementation

**Learning outcome:** Participants learn that implementation quality is determined before code is written.

---

## **6. Exercise 2 — Protect the User Experience**

**Purpose:** Teach engineers to identify what must not degrade when a system evolves.

**Context:** The MVP exists and works. Participants are asked to introduce a new feature or improvement.

**Before implementing anything**, participants must define:

### Critical User Flows
Identify the most important user journeys:
- Creating a poll
- Voting availability
- Selecting the final time

### Invariants
Define what must not degrade:
- Time to create a poll
- Cognitive load in voting UI
- Number of steps in the core workflow
- Clarity of the availability grid

### Degradation Signals
Define how regression would be detected:
- Extra steps in workflow
- UI complexity increase
- Ambiguous states
- Slower completion time
- Confusion introduced by new UI elements

**Important constraint:** Assume low usage / no large-scale metrics. Participants must rely on qualitative checks, UX reasoning, and workflow analysis.

Implementation occurs after these protections are defined.

**Learning outcome:** Senior engineers proactively define what cannot break before they ship changes.

---

## **7. Exercise 3 — Feature Framing and Product Thinking**

**Purpose:** Train engineers to slow down and determine whether a feature is worth shipping before they move into implementation mode.

**Scenario:** The MVP exists and a plausible new feature request arrives, but the request is underdefined and the team is at risk of shipping motion instead of value.

**Reference inspiration:** [@thdxr on delaying gratification in product development](https://x.com/thdxr/status/2031377117007454421)

**Summary of the post:** LLMs make it too easy to ship features into existence, which lowers the bar for what deserves to ship, encourages hacky iteration instead of thoughtful design, and crowds out cleanup/refactoring work that would improve the product more.

**Example scenarios** for the scheduling app:
- Add recurring meetings because "power users will want it"
- Add participant accounts because "it feels more professional"
- Add AI-generated meeting suggestions because "we should have something intelligent"

**Participants must:**
1. Clarify the user problem behind the request
2. Separate real evidence from assumption and momentum
3. Define what would make the feature worth shipping
4. Consider smaller alternatives or deferral paths
5. Identify cleanup/refactoring that should happen before adding new complexity
6. Recommend: ship, narrow, defer, or reject

**Key concept:** Engineering judgment is not only about executing features well. It is also about deciding whether the feature should exist in its current form at all.

**Learning outcome:** Participants practice raising the quality bar before implementation begins.

---

## **8. Exercise 4 — Conflicting Constraints**

**Purpose:** Train engineers to articulate and justify tradeoffs.

**Scenario:** A new feature introduces tension between competing goals.

**Example scenarios** for the scheduling app:
- Automatic timezone detection (accuracy vs UI complexity)
- Recurring meeting scheduling (power vs simplicity)
- Participant identity/login (trust vs friction)

**Participants must:**
1. Identify competing priorities
2. Define success criteria for each
3. Forecast likely negative effects
4. Propose mitigation strategies
5. Explicitly justify the chosen tradeoff

**Key concept:** Engineering judgment requires making tradeoffs legible, not pretending they do not exist.

**Learning outcome:** Participants practice defending decisions under competing constraints.

---

## **9. Exercise 5 — System Migration Risk**

**Purpose:** Teach engineers to manage large system change while preserving user trust.

**Scenario:** The scheduling app must migrate to a new platform or architecture.

**Examples** (technology-neutral framing):
- New rendering architecture
- New backend storage model
- Infrastructure migration
- Framework change

**Participants must define:**

### Migration Invariants
What must remain unchanged:
- Feature parity
- User trust
- Performance thresholds
- Data integrity
- Link stability

### Risk Surface
What could silently degrade:
- Poll availability grid behavior
- Timezone correctness
- Sharing links
- Mobile usability
- Load performance

### Safety Strategy
Participants must propose:
- Rollout plan
- Monitoring signals
- Rollback boundary
- Migration stages

**Learning outcome:** Participants practice reasoning about system continuity during large-scale change.

---

## **10. Consistent Vocabulary**

Use throughout the workshop:

| Term | Use |
|------|-----|
| constraint | Limits that shape decisions |
| invariant | What must not change |
| degradation signal | How regression is detected |
| risk surface | What could silently degrade |
| tradeoff articulation | Making competing priorities explicit |
| rollback boundary | When to revert |
| success criteria | Measurable definition of done |
| assumption labeling | Surfacing what is taken for granted |

**Avoid:** Tool-specific discussion, framework comparisons, prompt engineering, coding tutorials.

The workshop trains thinking, not implementation.

---

## **11. Design Goals: Participant Capabilities**

Participants should leave with the ability to:

- Define problems clearly
- Identify hidden constraints
- Decide whether a proposed feature is worth building
- Articulate tradeoffs before implementation
- Detect silent UX degradation
- Model system risk
- Define safe rollout boundaries

This capability should remain valuable even as implementation becomes increasingly automated.

---

## **12. Structural Model of Each Exercise (Detail)**

### **A. Problem Phase**

Participants receive:
- A **starter application** (e.g., scheduling app scaffold)
- A lightweight **role sheet (their character sheet)**
- A defined **stakeholder (NPC)**
- A vague business objective

They must:
- Ask clarifying questions
- Extract constraints
- Define assumptions
- Define explicit success criteria
- Produce a plan (no required workflow)

No detailed instructions. The ambiguity is intentional.

### **B. Implementation Phase**

Participants:
- Use any workflow (AI agents, manual coding, etc.)
- Produce a working implementation
- The workflow itself is not evaluated

For self-paced future versions:
- Participants define a plan
- An agent implements the plan
- Implementation process is skipped in video
- Only clarity phase + final outcome are shown

### **C. Evaluation Phase (Key Insight)**

Evaluation is not about:
- Whether you (the stakeholder) are "happy"
- Whether they guessed the hidden requirements

Evaluation is about:
1. Did they surface and label assumptions?
2. Did they define success criteria before building?
3. Did their final solution match the criteria they defined?
4. Did they anticipate risks and edge cases?
5. Did they miss constraints they reasonably could have uncovered?

The learning happens in the **gap analysis between:**
- Their declared understanding
- The hidden stakeholder sheet
- The resulting system behavior

Failure is allowed — but must be explained through reasoning.

---

## **13. Stakeholder Design Model**

Create a **Stakeholder Sheet** containing:
- Business goals
- Market context
- User demographics
- Operational constraints
- Technical dependencies
- Budget/timeline constraints
- Some irrelevant but realistic details
- Unknown unknowns (information they must explicitly ask for)

**Important:** Stakeholders are not malicious or random. Information is not withheld arbitrarily. Gaps arise from assumptions, unasked questions, misaligned priorities, and natural ambiguity. No dice mechanics. No artificial randomness.

---

## **14. Dungeon Master Analogy (Refined)**

Useful metaphor:
- You have hidden system knowledge.
- They must probe to reveal it.

But:
- No gamification mechanics.
- No artificial secrecy.
- No chance-based extraction.

You reveal information when:
- They ask directly
- They demonstrate awareness of a risk area
- Their assumptions fail during implementation

---

## **15. Key Design Decisions**

### **Decision 1 — No Implementation Rubric**
You are not evaluating their coding workflow.

### **Decision 2 — Evaluate Judgment Explicitly**
Evaluation focuses on: problem framing, assumption labeling, tradeoff articulation, risk anticipation, alignment between intent and outcome.

### **Decision 3 — Failure Is Permitted**
If they miss a key constraint: let them implement, let it fail, then analyze why. The critique centers on reasoning, not disappointment.

---

## **16. Philosophy Alignment**

The workshop is valuable because:
- It compresses ambiguity into a controlled learning loop.
- It makes judgment visible and inspectable.
- It surfaces failure patterns deliberately.
- It trains critique vocabulary.

It is not valuable because:
- It simulates a workday.
- It teaches AI workflow tricks.
- It shows coding patterns.

---

## **17. Open Design Question (Still Unresolved)**

How to formalize evaluation in scalable/self-paced form.

**Current manual model:** Facilitated reflection conversation.

**Future model:** Possibly AI rubric scoring (constraint completeness, assumption explicitness, tradeoff articulation, risk surface mapping, outcome alignment).

Not solved yet — intentionally deferred until after first live run.

---

## **18. Immediate Next Planning Steps**

Before implementation, define:
1. The stakeholder sheet for each exercise
2. The participant role sheet
3. The explicit evaluation reflection questions
4. The hidden constraints for each exercise
5. Exercise 2–5 content (currently only Exercise 1 is implemented)
