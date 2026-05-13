# Scenario Card: Prototype as Spec

## Use When

You want learners to practice translating messy customer context into a product
direction before asking engineering to formalize it.

## Real Pain Pattern

The customer expresses needs through notes, workflows, and domain language. The
danger is either building their requested solution literally or handing
engineering a vague problem statement that creates multiple product/engineering
iteration loops.

## Scenario Seed

A customer has a deep, messy operational taxonomy. They need a way to move from
high-level allocation categories down to concrete work items and implementation
details. Product has customer notes and a rough schema dump, but no polished
spec.

## Decision to Practice

Should the product engineer write a traditional requirements doc, build a
throwaway prototype, prototype inside production context, or hand the problem to
engineering for discovery?

## Evidence Available

- Customer notes with expressed pains and proposed solutions.
- Internal schema or data model context.
- Design feedback on what makes the workflow understandable.
- Engineering feedback on feasibility, stability, and handoff cost.

## Constraints and Pressure

- The prototype must reveal product shape, not just technical possibility.
- A greenfield prototype may diverge from production realities.
- Engineering time should focus on efficiency, stability, and integration, not
  guessing what product meant.
- The source data and customer language may contain jargon that hides the real
  need.

## Options to Weigh

1. Write a traditional spec from customer notes.
2. Build a greenfield prototype to explore interaction shape.
3. Prototype against production-like context and use the prototype as the spec.
4. Defer until engineering can join discovery directly.

## Participant Artifact

Create a prototype-as-spec brief:

- Customer need in the customer's words.
- The proposed interaction and what it proves.
- Assumptions the prototype intentionally does not prove.
- Engineering handoff notes.
- Revisit trigger after engineering implementation starts.

## Debrief Prompts

- Where did the customer describe a need versus propose a solution?
- What did the prototype make clearer than a document would have?
- What production constraints would a throwaway prototype have missed?
- What should engineering still challenge after receiving the prototype?

## Follow-Up Research Question

"What did you learn the hard way that made you start prototyping this way?"
