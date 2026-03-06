# Starter Requirements

Document the technical requirements and risks that should drive starter choice.

## MVP delivery requirements

- 
- No mandatory account creation for participants in v1.
- Ability for a host to create an event and receive a private management link.
- Host link flow must support editing event details and viewing responses.

## Likely near-term requirements

- 
- Upgrade path from link-based host access to optional/required account-based ownership.

## Architecture risks

- 
- Designing access control in a way that cannot evolve from host-link to account auth.
- Treating host links as an afterthought and creating security/usability issues.

## "Painted into a corner" risk check

- What future change would be painful if we choose the wrong starter?
- 

## Starter selection criteria

- 
- Supports capability-style private links cleanly in MVP.
- Can evolve to stronger auth/identity without a full access-model rewrite.
