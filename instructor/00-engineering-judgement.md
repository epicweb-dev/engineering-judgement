## **Epic Systems — Engineering Judgment Workshop**

### **Working Design Summary (Current State)**

### **1. Core Intent (Reaffirmed)**

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

## **2. Structural Model of Each Exercise**

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

---

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

---

### **C. Evaluation Phase (Key Insight)**

Evaluation is not about:

- Whether you (the stakeholder) are “happy”
- Whether they guessed the hidden requirements

Evaluation is about:

1.  Did they surface and label assumptions?
2.  Did they define success criteria before building?
3.  Did their final solution match the criteria they defined?
4.  Did they anticipate risks and edge cases?
5.  Did they miss constraints they reasonably could have uncovered?

The learning happens in the **gap analysis between:**

- Their declared understanding
- The hidden stakeholder sheet
- The resulting system behavior

Failure is allowed — but must be explained through reasoning.

---

## **3. Stakeholder Design Model**

You will create a **Stakeholder Sheet** containing:

- Business goals
- Market context
- User demographics
- Operational constraints
- Technical dependencies
- Budget/timeline constraints
- Some irrelevant but realistic details
- Unknown unknowns (information they must explicitly ask for)

Important decision:

Stakeholders are not malicious or random.

Information is not withheld arbitrarily.

Gaps arise from:

- Assumptions
- Unasked questions
- Misaligned priorities
- Natural ambiguity

No dice mechanics.

No artificial randomness.

---

## **4. Dungeon Master Analogy (Refined)**

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

## **5. Key Design Decisions Made**

### **Decision 1 — No Implementation Rubric**

You are not evaluating their coding workflow.

### **Decision 2 — Evaluate Judgment Explicitly**

Evaluation focuses on:

- Problem framing
- Assumption labeling
- Tradeoff articulation
- Risk anticipation
- Alignment between intent and outcome

### **Decision 3 — Failure Is Permitted**

If they miss a key constraint:

- Let them implement
- Let it fail
- Then analyze why

But:

The critique centers on reasoning, not disappointment.

---

## **6. Scheduling App MVP Plan (Exercise 1)**

Exercise 1:

Build MVP of a scheduling tool (Doodle-style).

Exercise progression:

1.  MVP
2.  Expanded version with hidden UX regressions
3.  Migration or scaling constraint
4.  Performance tradeoff with UX cost
5.  Dependency constraint scenario (busy API team)

Each exercise builds linearly on the same app.

---

## **7. Dependency Constraint Scenario (Future Exercise)**

You explored a scenario:

Constraint:

Dependency team is too busy to help.

Possible good responses:

- Mock service locally
- Re-scope feature
- Escalate appropriately
- Define risk mitigation plan

Bad response:

- Attempt full replacement service without tradeoff analysis

Conclusion:

This is valid engineering judgment training.

It does not need to become a politics simulator.

Keep it scoped to system constraints.

---

## **8. Open Design Question (Still Unresolved)**

How to formalize evaluation in scalable/self-paced form.

Current manual model:

Facilitated reflection conversation.

Future model:

Possibly AI rubric scoring:

- Constraint completeness
- Assumption explicitness
- Tradeoff articulation
- Risk surface mapping
- Outcome alignment

Not solved yet — intentionally deferred until after first live run.

---

## **9. Philosophy Alignment (Clarified)**

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

## **10. Immediate Next Planning Steps**

Before implementation:

You need to define:

1.  The stakeholder sheet for Scheduling App MVP
2.  The participant role sheet
3.  The explicit evaluation reflection questions
4.  The hidden constraints for Exercise 1

That is the next concrete design task.
