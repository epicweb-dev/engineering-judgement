# Kellie Technical Transcript

🐨 Kody: We have discovery clarity now. Before naming a framework, I want to
align on technical requirements and risk.

🧝‍♀️ Kellie: Good. If we pick by preference first, we can miss constraints and
pay for it later.

🐨 Kody: For MVP delivery, we need low setup overhead, mobile-friendly UX, and
room to iterate quickly with a small team.

🧝‍♀️ Kellie: Agreed. Also, we should treat "avoid painting ourselves into a
corner" as a first-class risk.

🐨 Kody: Say more about that risk.

🧝‍♀️ Kellie: Teams often pick a starter that is fast for the first demo but hard
to extend. Then when real requirements show up, they end up rewriting app
structure, data boundaries, and deployment assumptions.

🐨 Kody: So we need a starter that stays simple now, but scales into likely next
requirements without forcing a rewrite.

🧝‍♀️ Kellie: Exactly. We should walk through requirements in layers:
1) MVP delivery,
2) near-term expansion,
3) architecture risks.

🐨 Kody: For MVP delivery, I have:
- fast setup and low ceremony
- mobile-first web UX for response completion
- no-account flow for participants
- private host dashboard link for event management
- clear server/client boundaries
- easy instrumentation for funnel metrics

🧝‍♀️ Kellie: Good list. I would add one more: developer ergonomics. If local dev
is clunky, iteration speed drops and MVP learning slows down.

🐨 Kody: Great. Near-term expansion probably includes:
- authentication maturity
- migration from host-link ownership to account ownership
- richer scheduling workflows and notifications
- growth in event/participant data complexity
- incremental integrations

🧝‍♀️ Kellie: Yes, and that is where "painted into a corner" usually appears.
Teams optimize for current simplicity but accidentally lock in brittle patterns
for data flow and routing.

🐨 Kody: What are concrete warning signs we picked the wrong starter?

🧝‍♀️ Kellie: Three common ones:
- Adding auth requires large structural changes.
- Moving from host-link access to account ownership requires a full rewrite.
- Introducing integrations forces major refactors.
- Deployment assumptions break when traffic or workflows grow.

🐨 Kody: So starter criteria should include:
- easy to begin with MVP scope
- scales to likely next requirements
- sound full-stack architecture patterns
- fit with team skills and workshop goals

🧝‍♀️ Kellie: Exactly. Also, we should avoid over-optimizing for enterprise
requirements before product fit. Brett mentioned long-term goals, but we should
treat those as direction, not immediate build scope.

🐨 Kody: Right. We want compatibility with that direction, without implementing
it now.

🧝‍♀️ Kellie: Perfect framing. We are not choosing "future-complete." We are
choosing "future-capable."

🐨 Kody: If we compare candidate starters against this rubric, what wins?

🧝‍♀️ Kellie: A few starters score similarly on paper. We can satisfy the core
requirements with more than one option.

🧝‍♀️ Kellie: I still recommend
[epicflare](https://github.com/epicweb-dev/epicflare). It gives us quick MVP
startup, supports mobile-first web iteration, and has architecture patterns
that scale into the subtle long-term requirements Brett raised.

🐨 Kody: Given this scaffold, what implementation details should we lock in now so
we do not duplicate UI work across pages?

🧝‍♀️ Kellie: Great question. The starter already gives us good primitives:
- route mapping in `server/routes.ts`
- server handlers under `server/handlers/*`
- client route components under `client/routes/*`
- shared design tokens in `client/styles/tokens.ts`
- app-level shell/navigation in `client/app.tsx`

🐨 Kody: The starter also has a lot we do not need for this MVP. Should we remove
that now instead of carrying dead weight?

🧝‍♀️ Kellie: Yes. We should explicitly strip unused starter features:
- authentication/account flows (`/login`, `/signup`, `/account`, `/auth`, `/session`, `/logout`)
- password reset flow and related email/reset plumbing
- OAuth authorize/callback route flow and related worker OAuth handlers
- chat demo route/handler
- calculator MCP demo tools/resources/widget host code

🧝‍♀️ Kellie: Keep only what supports the scheduling loop and host-link workflow.
Everything else adds maintenance cost and noise for this implementation.

🐨 Kody: So we stay no-account for now, and if we later need auth, we reintroduce
it deliberately instead of dragging unused auth code through MVP.

🧝‍♀️ Kellie: Exactly. Deleting unused starter surface is risk reduction, not
throwaway work.

🧝‍♀️ Kellie: So instead of building each page in isolation, we should add
reusable UI components early in `client/components/*`.

🧝‍♀️ Kellie: Components I would create first:
- `form-field` (label + input wrapper) and `primary-button` so form/button styling is not duplicated
- `schedule-grid` plus `time-slot-cell` used across `/`, `/s/{scheduleKey}`, and `/s/{scheduleKey}/{hostKey}`
- `selection-drag-handle` behavior in the grid for mobile expansion + edge auto-scroll
- Standard web date inputs (`<input type="date">`) for start/end date fields on `/` and `/s/{scheduleKey}/{hostKey}` instead of a custom date picker

🧝‍♀️ Kellie: Make the grid feel spreadsheet-like on desktop: dense slots, clear
selection state, and drag interactions that feel close to Excel behavior.

🧝‍♀️ Kellie: And to reflect Brett's product direction, mobile selection should
explicitly match the Google Docs/Google Sheets mobile pattern: selecting a cell
reveals a drag handle that can expand or shrink the active range.

🧝‍♀️ Kellie: Also avoid business-hour-only assumptions. The host should be able to
select from any time in the day and choose 15-minute, 30-minute, or 60-minute
slot increments.

🧝‍♀️ Kellie: Timezone correctness is non-negotiable. Store canonical slot times in
UTC, store host timezone metadata, and always render with explicit timezone
context so attendee and host views stay trustworthy.

🧝‍♀️ Kellie: And we should use the existing design system foundation instead of
rebuilding styling from scratch. Adjust its tokens/theme values to match Brett's
direction (friendly, colorful, blue/green, minimal, clean).

🐨 Kody: That should also reduce risk when we change interaction details, because
the grid logic lives in one place.

🧝‍♀️ Kellie: Exactly. We get one interaction model with route-specific modes:
- create mode on `/` (host sets initial range/slots)
- edit mode on `/s/{scheduleKey}/{hostKey}` (host updates range/slots + reviews responses)
- respond mode on `/s/{scheduleKey}` (attendee enters name + marks availability)

🐨 Kody: Should we also reflect those routes explicitly in starter wiring?

🧝‍♀️ Kellie: Yes. Add route entries in `server/routes.ts`, pair each with focused
handlers in `server/handlers/*`, and keep client route modules thin by composing
these reusable components.

🧝‍♀️ Kellie: I am also already familiar with it, which reduces execution risk for
this project. And if everyone uses the same starter, collaboration and support
stay much cleaner.

🧝‍♀️ Kellie: Final implementation note: keep the product experience in-world. Do
not ship meta language that sounds like internal training material.

🐨 Kody: So we are not overbuilding now, but we are also not locking ourselves
into a dead-end starter.

🧝‍♀️ Kellie: Right. Epicflare gives us a practical middle path: ship the MVP
quickly, keep technical risk controlled, and preserve future options.
