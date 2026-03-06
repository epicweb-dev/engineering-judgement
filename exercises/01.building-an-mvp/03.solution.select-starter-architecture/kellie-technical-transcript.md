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

🧝‍♀️ Kellie: The strongest fit is
[epicflare](https://github.com/epicweb-dev/epicflare). It gives us quick
MVP startup, supports mobile-first web iteration, and has architecture patterns
that scale into the subtle long-term requirements Brett raised.

🐨 Kody: So we are not overbuilding now, but we are also not locking ourselves
into a dead-end starter.

🧝‍♀️ Kellie: Right. Epicflare gives us a practical middle path: ship the MVP
quickly, keep technical risk controlled, and preserve future options.
