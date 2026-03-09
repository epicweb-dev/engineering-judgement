# Discovery Meeting Transcript

This is a transcript of a realistic stakeholder meeting between Kody, Brett, and
Una. This is the basis of the `discovery-brief.md` file.

🐨 Kody: Thanks for meeting. I want to confirm who this MVP is for and what
success looks like.

💼 Brett: I keep hearing "MVP." What does that actually mean here?

🐨 Kody: It means the smallest version that proves real value. We scope down so
we can learn quickly from real usage instead of spending weeks building features
we may not need.

💼 Brett: Okay, so we're optimizing for fast learning, not feature completeness.

🐨 Kody: Exactly. We want the smallest version that proves value and tells us
what to do next.

🐨 Kody: Before we optimize MVP scope, should we build this at all? Could we
buy, adopt, or defer instead?

💼 Brett: Fair challenge. Existing polling and scheduling tools are fine for
simple availability collection, but they break down for our target flow:
cross-organization friend groups coordinating in messy chat threads with no
clear owner and no reliable "final plan" moment.

💼 Brett: Our advantage is not "another poll." It is a completion-first
coordination loop: low-friction participation, explicit finalization, and host
controls that work without forcing everyone into account creation.

🐨 Kody: So the justification for building is that we are targeting a specific
gap existing tools do not solve well, and we can define success against that
gap.

💼 Brett: Exactly. If we cannot outperform the default chat-plus-poll behavior
on finalized plans, we should stop and not keep investing.

🐨 Kody: Where are we going to draw inspiration for the user experience? Which
competitors should we study directly?

💼 Brett: Start with when2meet.com, whenavailable.com, and Doodle. Those are the
closest references for how people already think about sharing availability.

🐨 Kody: Great. Una, what do those experiences feel like in real use?

👤 Una: They are familiar enough to get people started quickly, which is good.
But they also feel clunky when chats are messy and the final plan is still
unclear.

👤 Una: On phones, the biggest issue is interaction friction. If selecting slots
is awkward, people stop midway and go back to chat.

💼 Brett: That is why we should build our own instead of just adopting one tool.
We can keep familiar interaction patterns, but improve completion and integrate
cleanly with AI agents via MCP.

🐨 Kody: What should the design feel like and look like?

💼 Brett: I want it to feel like planning with friends, not filling out a stiff
form. Friendly energy, clear momentum, and no visual intimidation.

💼 Brett: Color-wise, I keep picturing blues and greens because they feel calm,
optimistic, and trustworthy for coordination.

💼 Brett: At the same time, I do not want visual noise. It should stay minimal
and clean so the schedule grid and final decision stand out.

🐨 Kody: Good direction. We can tune the existing design system/theme foundation
to that style instead of inventing a brand-new visual system.

🐨 Kody: Una, from your perspective, what is the most painful part of
coordinating a plan today?

👤 Una: My pain is that group chats get noisy, people miss messages, and nobody
knows if a plan is actually confirmed.

🐨 Kody: What should the MVP optimize for first?

💼 Brett: Honestly, my instinct is we should make it feel complete from day one.
I am thinking polished invites, reminders, some level of calendar connection,
maybe recurring templates, maybe a nicer confirmation flow... basically the
whole thing feeling ready and not like a half-product.

💼 Brett: I know that is probably broad, but I keep coming back to wanting it to
feel real and complete so people take it seriously.

🐨 Kody: Helpful context. If we had to pick one outcome to prove value in the
first release, which one tells us this is working?

🐨 Kody: Quick reminder: for MVP, tighter scope usually increases success
because we can ship faster, reduce risk, and learn from real behavior sooner.

💼 Brett: If I force myself to pick one, it is finalized plans. We can get
excited about poll creation, but if people still do not lock a time, we have not
actually solved anything. So yes, finalized plans first.

🐨 Kody: Who is the first user segment?

💼 Brett: My default answer is everyone, because the coordination pain is
everywhere. Friends, clubs, side projects, and maybe eventually company use
cases too. I keep thinking bigger-market, bigger-impact.

🐨 Kody: For MVP, who should we optimize for first so we can measure success
clearly?

💼 Brett: For first release, friend groups coordinating social plans across
different organizations and schedules. That is probably the cleanest place to
start, and it is where we can learn fastest.

🐨 Kody: Is enterprise workflow support in scope?

💼 Brett: I mean, long term we might sell to companies, and I do not want to
lose that option. I keep thinking ahead to that, so I hesitate to say "no"
immediately.

💼 Brett: But for MVP specifically, out of scope.

🐨 Kody: Are we limiting event types in v1?

💼 Brett: If MVP means smallest useful slice, yes. Start with a narrow set of
common social planning flows and keep the event model flexible.

🐨 Kody: What should count as primary success?

💼 Brett: I care about a lot of things at once: downloads, signups, social
sharing, good brand perception, even whether people talk about it positively. So
my head goes in ten directions when you ask that.

🐨 Kody: Which single metric should be primary for this MVP decision?

💼 Brett: If I narrow it down, finalized-plan rate.

🐨 Kody: Secondary signals?

💼 Brett: Maybe social shares too, because that is a growth signal. But I know
you are asking for workflow signals, not growth signals.

🐨 Kody: Useful later. For this workflow specifically, what secondary signals
help explain finalized-plan rate?

💼 Brett: For workflow, poll response completion and time-to-finalized-plan.

🐨 Kody: What failure pattern should we watch for?

💼 Brett: When you say "failure pattern," what do you mean exactly?

🐨 Kody: I mean what repeated signal would tell us the MVP is not delivering
value, even if activity looks okay. For example, if people keep abandoning the
flow before they submit availability, that is a failure pattern.

💼 Brett: The bad pattern is lots of activity that looks healthy on the surface
but no real outcomes. In this case: lots of polls created, very few confirmed
plans.

🐨 Kody: Where does today’s workflow fail most?

👤 Una: In chat threads. People respond late, availability is scattered, and
then we restart planning from scratch.

🐨 Kody: What would make you trust this enough to use it?

👤 Una: Clear final confirmation and timezone-safe times. If times are
ambiguous, people will go back to chat.

🐨 Kody: Any non-negotiables for v1 usability?

👤 Una: Fast response flow, clear status, easy sharing.

👤 Una: Also, most people in my groups will respond on their phones, not
desktop. If the mobile experience is clunky, they simply will not finish
availability.

🐨 Kody: Mobile usage is core for this audience. Before we lock implementation
details, I want to hear the product bar from your side. Brett, what should this
feel like in real use on desktop and mobile?

💼 Brett: Desktop should feel fast and deliberate, like people are working in a
spreadsheet instead of poking at a form. I want slot selection to feel
Excel-like.

💼 Brett: On mobile, I do not expect literal desktop behavior, but I do expect
the same confidence. I want it to feel like Google Docs and Google Sheets on
mobile: tap a cell, get the drag handle, then drag to expand or shrink the
current selection.

👤 Una: That maps to how people in my groups behave. If I can tap a start slot
and use a handle to expand or shrink naturally, I will finish. If selection
feels fiddly, I will stop.

🐨 Kody: That helps. On temporal scope, where do you want the MVP boundary: only
business hours, or full-day support?

💼 Brett: Full-day support. Social plans are not 9-to-5. Also, hosts need
control over precision: 15-minute, 30-minute, or 60-minute increments depending
on the event.

🐨 Kody: Great. What should we treat as non-negotiable for timezone behavior?

💼 Brett: Timezone clarity is a trust issue, not a polish issue. I want
canonical UTC storage under the hood, host timezone metadata persisted with the
schedule, and explicit timezone context in host and attendee views.

👤 Una: Yes. If timezone display is ambiguous, people will blame the product
even if selection was easy.

🐨 Kody: Is a native mobile app on the table for this MVP?

👤 Una: Honestly, no. This is too infrequent for most people to install an app.
They will use a mobile web flow if it is fast and clear, but they will not
download something just to answer availability occasionally.

🐨 Kody: What about accounts for MVP? Do participants need to sign in?

👤 Una: I would avoid that. Most people will only use this occasionally, and a
required account is friction that will kill response rates.

💼 Brett: Agreed. We can add accounts later, but for MVP we need low friction.

🐨 Kody: For ownership and access, what is your preferred MVP behavior?

💼 Brett: Keep it no-account for participation, and issue a private host link on
create. That keeps response friction low while still giving the host control.

👤 Una: That works. As long as the host link is clear and easy to find again.

🐨 Kody: I want to confirm route responsibilities so implementation stays clean.
How do you want each route to behave?

💼 Brett: Home (`/`) is creation: date range, slot selection, create action.
After create, route to `/s/{scheduleKey}/{hostKey}` for host management.

💼 Brett: Host dashboard must support easy copy/share for both links, schedule
editing (including increment and full-day availability controls), and clear
response review.

💼 Brett: Public attendee participation should stay at `/s/{scheduleKey}`.

👤 Una: Perfect. On that page, attendees should enter their name and mark the
time slots they can do. That flow has to be very mobile friendly.

🐨 Kody: Any language/style guardrails we should enforce in the product copy?

💼 Brett: Keep everything in-world and product-real. No internal process
language in the user-facing flow.

🐨 Kody: What constraints should shape scope immediately?

💼 Brett: I want this to feel premium right away. I know that is not a hard
constraint, but it is where my head goes first.

🐨 Kody: Got it. On delivery constraints, what is fixed this sprint?

💼 Brett: Hard constraints are two-week window and no extra headcount. If we
overreach with this release, we will miss the timeline.

🐨 Kody: Given those constraints, how do you want to handle integrations for v1?

💼 Brett: Keep the core loop first and defer heavy integrations. We can still
design for future integration points, but we should not build them now.

🐨 Kody: Which items are the right first deferrals without hurting the learning
goal?

💼 Brett: Calendar sync and advanced recurring events are first to defer. They
are valuable, but they are not required to validate whether people can actually
finalize plans through this flow.

🐨 Kody: From your perspectives, what is the highest-likelihood technical
failure mode in this release?

👤 Una: Poor mobile UX, easily. If participation is clunky on phones, completion
drops immediately. Timezone clarity still matters, but mobile friction is the
first thing that will break adoption.

💼 Brett: From the business side I agree. If mobile completion is weak, the
funnel falls apart before we can learn anything meaningful about finalization
rates.

🐨 Kody: Biggest product risks?

💼 Brett: Biggest risks are poor mobile completion, low invitee response, and
scope creep. Scope creep is also a risk, and that one is probably me.

🐨 Kody: Mitigations we should capture now?

💼 Brett: Keep response flow frictionless, make mobile UX obvious, and limit v1
to a narrow set of planning flows until we validate the core loop. If we can
stay disciplined there, we should learn fast.

👤 Una: Please make sure key actions are thumb-friendly and obvious on mobile.

🐨 Kody: Can I record these as assumptions for validation?

1. people will use this if it beats chat coordination,
2. no-calendar-sync is acceptable in v1,
3. a narrow set of social planning flows is enough to validate viability.

💼 Brett: That aligns with what we need.

👤 Una: Works for me, as long as confirmation is clear and mobile use feels
easy.

🐨 Kody: Great. I’ll update the discovery brief with confirmed scope, metrics,
constraints, risks, and the validation plan.
