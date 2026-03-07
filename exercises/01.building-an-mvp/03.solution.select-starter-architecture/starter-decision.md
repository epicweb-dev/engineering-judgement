# Starter Decision

## Decision

Use [epicflare](https://github.com/epicweb-dev/epicflare) as the project
starter.

## Alternatives considered

We evaluated other plausible starters against the same rubric (MVP speed,
host-link support, auth evolution path, and long-term flexibility).

Conclusion: multiple options could satisfy the requirements at a similar level.

## Why this starter

- It provides a simple path to start MVP implementation quickly.
- It supports the no-account MVP model with private host-link management.
- It supports a sound architecture that can evolve with product needs.
- It reduces risk of painting the team into a corner as requirements expand.
- Kellie is already familiar with it, which lowers execution risk in this
  context.
- Standardizing on one starter across the workshop improves consistency for
  instruction, discussion, and support.

## How this addresses current and future needs

- **MVP now:** quick setup, clear structure, low ceremony.
- **MVP now:** supports host dashboard link workflows without mandatory
  accounts.
- **Near-term evolution:** architecture can absorb richer workflow and data
  needs.
- **Near-term evolution:** clean path to add account-based ownership when
  needed.
- **Long-term flexibility:** supports growth toward the subtle future goals
  Brett surfaced without forcing a full rewrite.

## Explicit risk callout

Avoiding "painted into a corner" means choosing a starter that is not just easy
today, but extensible tomorrow. Epicflare gives a practical balance between
shipping fast and preserving strategic options.
