# r4 demo personas

Three attendees, each built to show a different slice of the app. Each persona has the same seed in every app, adapted to that app's data model: Devin (moments, beacons, charter, backstage), Muse (prep, agents, A2A), Claude (quick capture, goals, AI parsing).
The event is "r4", 3 days, starting today, so moments and timers are live during a demo.

Muse scheduling uses free calendar windows, creates 30-minute proposals, and excludes the 12:00–13:00 lunch period. It does not enforce the beacon lengths or charter fields described below; a keynote is unavailable because it is a scheduled agenda item, not because of a separate headliner rule.

---

## 1. Maya Torres — the social first-timer
**Senior consultant, Slalom Denver. Two years in, first r4. Bilingual EN/ES.**

> "I don't want to eat lunch alone, and I want a dinner crew by tonight."

| | |
|---|---|
| Goals | meet 10 new people · find a dinner crew · join one birds-of-a-feather · see the Oprah keynote |
| Interests | cx & design, community & belonging, wellbeing |
| Give / ask | **give:** "design-thinking warmups + the best coffee near the venue" · **ask:** "a dinner crew for tonight" |
| Devin beacon settings | **open** · lengths 7 + 15 min · autonomy **act** (her agent books without asking) |
| Devin charter only | hide name until yes: off · topics only: off · max 3/hour · protect headliner: on · quiet after 22:00 |
| Agenda | Oprah keynote · "design for belonging" BOF · lunch · first-timers social hour · 6:30am run club · karaoke night |
| People (8) | other first-timers, a run-club organiser, a peer from Slalom Austin, a designer at a client, a talent-team host |

**Story she shows:**
1. Onboards with one tap: "let my agent work".
2. Sees "needs you" moments, then turns on act mode so moments just get booked.
3. Mutual reveal + question game.
4. Trio for lunch.
5. "We're here" handshake.
6. Live timer with a polite exit.
7. Spark / fine / no fit.
8. Switches to Spanish.
9. End-of-day recap.

**Features she covers:** onboarding and goals (Muse); Devin's charter sheet, open mode and autonomy=act; moment cards + expiry ring, agent island, mutual reveal, question game, trios, place revealed late, handshake, timer, polite exit, private feedback, ES localisation, BOF, recap, design toggle (Slalom ↔ AiGovOps).

---

## 2. Diego Alvarez — the sales networker
**Client partner, financial services, Slalom Chicago.**

> "Five real client conversations and two partner co-sells, or this trip didn't pay for itself."

| | |
|---|---|
| Goals | 5 qualified client conversations · 2 partner co-sell intros (AWS, Snowflake) · book 3 follow-up meetings · win his pitch fest slot |
| Interests | gtm & sales, cloud, ai & data, financial services |
| Give / ask | **give:** "core-banking modernisation case studies + intros at partner orgs" · **ask:** "CIOs and COOs modernising core banking" |
| Devin beacon settings | **selective** · lengths 15 + 25 min · autonomy **ask** (he approves every proposal) |
| Devin charter only | hide name until yes: on · topics only: **off** (shares role + company) · max 2/hour · protect headliner: on · quiet after 21:00 |
| Agenda | client calls (work blocks) · fintech track sessions · partner expo booth · exec dinner · his pitch fest slot (day 2) |
| People (10) | hot client execs (CIO, COO, head of digital), AWS + Snowflake partner managers, a Slalom peer with a shared pursuit, a lukewarm prospect who declines |

**Story he shows:**
1. Approves proposals in "needs you".
2. Watches the agents negotiate the time in backstage.
3. Sees the declines his agent absorbed for him.
4. Gets a give/ask pairing with the AWS partner.
5. Shares his agent card by QR.
6. Rehearses in the pitch studio, then runs pitch fest with the timer.
7. Has follow-up drafts written for him.
8. Sends the team a report by persona.
9. Shows his manager the signed receipts of what his agent agreed to.

**Features he covers:** selective mode, autonomy=ask, needs-you approvals, backstage graph + A2A thread, negotiation stages, absorbed no's, give/ask pairing, priorities (hot/warm/cold) and personas (client/partner/exec), agent card share/import + QR, pitch studio + pitch fest timer, follow-ups + drafts, connect tab, report by persona, receipts list/verify/export.

---

## 3. Dr. Priya Natarajan — the academic researcher
**Research fellow, University of Washington Information School. Studies how organisations govern AI agents. Invited guest.**

> "I'm here to see where practice is ahead of the papers, and to book four practitioner interviews without wrecking my focus."

| | |
|---|---|
| Goals | attend 6 agentic-AI / governance talks · 4 × 15-min practitioner interviews · capture notes + takeaways per talk · leave with 3 themes |
| Interests | ai governance, agentic ai, data platforms, org change |
| Give / ask | **give:** "early findings from 40 AI-governance interviews" · **ask:** "practitioners running agents in production, for 15-min interviews" |
| Devin beacon settings | **heads-down** · length 15 min only · autonomy **suggest** |
| Devin charter only | hide name until yes: on · topics only: **on** · max **1/hour** · protect headliner: on · quiet after **19:00** |
| Agenda | 6 track talks · a poster session · two "writing" focus blocks (work type) · the keynote |
| People (8) | practitioners across healthcare, banking, retail and public sector, plus a fellow academic and a standards-body member, each tagged by topic |

**Story she shows:**
1. Muse shows Priya's focus blocks on her agenda; its 30-minute proposals use the remaining free windows and skip lunch. Devin separately demonstrates the 1/hour and quiet-time charter.
2. Watches her agent block a prompt-injection attempt from a peer agent.
3. Takes talk notes and takeaways.
4. Uses AI parsing to turn a pasted agenda and a badge list into structured data.
5. Uses quick capture after an interview.
6. Gets AI summaries.
7. Views the connection web by topic to spot themes.
8. Exports signed, chained receipts as an audit trail of every AI call for her methods section.

**Features she covers:** Muse's heads-down mode, agenda-aware 30-minute proposals and lunch exclusion; Devin's hourly cap, quiet time and headliner charter; prompt-injection blocking, session notes/takeaways, AI agenda/people/capture parsing (Claude), AI summaries, connection web, recap, receipts verify + tamper detection + export (NDJSON / bundle / PEM), accessibility (larger text, reduced motion).

---

## Coverage rule
Every user-facing feature in each app must appear in at least one persona's tour. Each app's DEMO.md has a feature → persona → tour-step table. A feature the app doesn't have is left out of that app's tour; it is not faked.
