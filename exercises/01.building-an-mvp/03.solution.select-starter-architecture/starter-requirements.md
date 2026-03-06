# Starter Requirements

Document the technical requirements and risks that should drive starter choice.

## MVP delivery requirements

- Ship the first usable version quickly with small team capacity.
- Keep complexity low so the team can iterate based on real feedback.
- Support a mobile-first web experience for availability response.
- Support no-account participation and no-account host onboarding for MVP.
- Issue a private host management link on event creation.
- Enable straightforward instrumentation for core funnel metrics.

## Likely near-term requirements

- Authentication and user identity refinement as usage grows.
- Smooth migration from private host links to optional/required account ownership.
- More robust scheduling workflows and notifications.
- Better data modeling for growth in event and participant volume.
- Incremental integration needs without rewriting core architecture.

## Architecture risks

- Choosing a starter that is quick now but rigid when features expand.
- Over-optimizing for enterprise concerns before product fit is proven.
- Introducing too many dependencies before core loop validation.
- Implementing host-link access in a way that makes future auth migration painful.

## "Painted into a corner" risk check

- What future change would be painful if we choose the wrong starter?
- Reworking access control from private host links to account-based ownership.
- Reworking the app structure, data flow, and deployment model when advanced
  features arrive.
- Replacing foundational patterns instead of extending them can slow delivery
  and increase migration risk.

## Starter selection criteria

- Easy to begin with MVP scope.
- Scales to likely next requirements without full rewrites.
- Supports sound full-stack architecture patterns from the start.
- Supports link-based host management now, with clean auth evolution later.
- Fits team skills and workshop teaching goals.
