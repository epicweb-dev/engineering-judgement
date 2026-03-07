# Discovery Brief

Updated from the stakeholder meeting.
This document now captures clarified answers and decisions before implementation begins.

## Objective to validate

- Confirm the MVP outcome this release should optimize for
  - Confirmed: optimize for finalized plans, not just polls created
- Confirm the user workflow this MVP should improve first
  - Confirmed: reduce coordination friction for friends across different organizations

## Stakeholders consulted

- 💼 Brett the Business Owner (business goals, viability, scope pressure)
  - Meeting input: prioritize fast learning and completed-plan outcomes
- 👤 Una the User (workflow pain, trust, usability expectations)
  - Meeting input: group chat coordination is fragmented, and most availability responses happen on phones

## Clarity resolved before implementation

### Problem clarity

- Who is the primary user segment for v1?
  - Friend groups coordinating social plans across different organizations/schedules
- What scheduling pain are we solving first?
  - Scattered coordination across chats, missed replies, and unclear final decisions
- What is explicitly out of scope for MVP?
  - Enterprise admin controls, deep integrations, and complex recurring scheduling
- What is the MVP access model for participation and hosting?
  - No required accounts in MVP; anyone can create a schedule and receive a private host link to manage details and view results

### Success clarity

- What primary metric defines MVP viability?
  - Finalized-plan rate
- What secondary signals help interpret progress?
  - Poll response completion rate
  - Median time from poll creation to finalized time
- What failure signal indicates the MVP is not working?
  - Many polls created, but few result in a confirmed plan

### Constraint clarity

- Timeline and staffing constraints this sprint
  - Two-week release window, no additional headcount
- Dependency constraints (teams, APIs, integrations)
  - No dedicated native mobile app work in v1
- Data/privacy constraints that affect release scope
  - Keep participant data minimal and avoid exposing private contact details
- Technical constraints that could force tradeoffs
  - Use the existing web stack with lightweight sharing links and a mobile-first web experience

### Risk clarity

- Top risks most likely to cause MVP failure
  - Poor mobile UX leading to incomplete availability submissions
  - Low invitee response rate
  - Scope creep from adding too many features in v1
- What evidence would indicate each risk is becoming real?
  - Polls with low completion
  - Low response rates despite poll creation
  - Growing backlog of out-of-scope requests
- What mitigation options are available if a risk materializes?
  - Mobile-first UX for response completion (thumb-friendly controls, clear primary actions)
  - Frictionless response flow with clearer status tracking
  - Avoid mandatory account creation in MVP; use private host link access for management
  - Limit v1 to a narrow set of social planning flows

## Questions asked in the meeting

### For 💼 Brett the Business Owner

- What single business outcome should this MVP improve first?
  - Finalized-plan rate for social coordination
- Which user segment is in scope now, and which is out?
  - In scope: friends coordinating social plans; out: enterprise workflows
- What tradeoff are we willing to accept to ship faster?
  - Defer deep integrations to protect learning speed
- Should MVP include a full account system?
  - Not in v1. Defer accounts and prioritize participation completion
- How should hosts manage events in MVP without accounts?
  - Issue a private host dashboard link on event creation

### For 👤 Una the User

- Where does the current scheduling process break down most?
  - In group chats where people miss messages or respond late
- What would make this MVP trustworthy enough to adopt?
  - Clear final plan confirmation and timezone-safe time display
- Which workflow details are non-negotiable for v1 usability?
  - Fast response flow, clear status, easy shareability, and strong mobile usability
- Is a native mobile app necessary for MVP adoption?
  - No. The use case is too infrequent for most users to install an app; mobile web is sufficient
- Should participants be required to create accounts?
  - No. Account creation adds too much friction for an infrequent-use flow

## Assumptions to test

- Assumption:
  - Why we believe this:
    - Friends will use a dedicated planner if it is easier than chat coordination
  - How we will validate it:
    - Compare finalized-plan rate vs baseline chat-only planning

- Assumption:
  - Why we believe this:
    - Users will accept no-account, link-based management in v1 if participation is fast
  - How we will validate it:
    - Track completion rate and host return behavior with private host links

- Assumption:
  - Why we believe this:
    - A narrow set of social planning use cases is enough to validate viability
  - How we will validate it:
    - Measure completion and repeat usage across the initial social planning cohorts
