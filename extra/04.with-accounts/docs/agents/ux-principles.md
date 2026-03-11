# UX principles

Cross-cutting UX expectations for interactive surfaces in this codebase.

## Avoid layout shift by default

- Reserve space for async feedback, validation, and errors instead of mounting
  and unmounting message containers.
- Keep control footprints stable between idle and pending states (for example,
  fixed button widths while labels change from `Update` to `Saving...`).
- Prefer in-place mode changes that preserve nearby geometry with stable grid
  columns and minimum row heights.
- Validate interaction-heavy changes on both desktop and mobile breakpoints.
