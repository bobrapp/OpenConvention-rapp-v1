# r4 Muse persona demo

## Why this app

- **More real connections, less social cost.** Agents do the searching, asking, rejecting and scheduling backstage. They propose 30-minute meetings that fit free agenda windows. First-timers get a dinner crew, sellers get qualified conversations, researchers get interviews.
- **Respects the agenda.** Scheduling uses the attendee's calendar window, treats existing agenda items as busy, and skips the 12:00–13:00 lunch period. There is no separate hourly cap, quiet-hours rule or headliner charter; the keynote remains unavailable because it is on the agenda.
- **Follow-through.** Follow-up drafts, a recap and a report turn hallway conversations into outcomes the attendee (and their team) can act on.
- **Privacy by default.** Data stays on the device. Names are revealed only after mutual consent. Agents share topics, not contact details. There's no attendee tracking dashboard.
- **Muse: prep-to-recap with an agent network.** Prep tab for before the event, today view, agents that message each other to propose meetings, pitch fest, report. EN/ES/PT. Signed receipts for every agent message, proposal and meeting change.

## Why it represents the sponsor's brand

- **The whole app wears the sponsor's design system.** The Slalom theme uses Slalom's colours, type scale and pill buttons, light and dark. It's an extension of the brand, not a white-labelled generic event app with a logo in the corner.
- **It acts out the sponsor's values.** Human-centred connection, with technology doing the heavy lifting behind the scenes. Attendees experience "what AI done responsibly feels like" first-hand, which says more than a booth or a slide.
- **Trust is part of the brand.** Consent-first reveals, on-device data, and AI actions you can verify are a visible stance on responsible AI that the sponsor can point to.
- **Outcomes, not surveillance.** Attendees can choose to share their report (moments made, follow-ups) with their team. The sponsor gets a story of value created without collecting attendee data.
- **One toggle to AiGovOps.** The same app switches to the AiGovOps Foundation theme, which shows the co-brand and the governance story side by side.

## Trust: AiGovOps Foundation, Beacon and OVERT

**Built on AiGovOps Foundation governance-as-code: Beacon receipts in the OVERT evidence format, verifiable offline.** ([About OVERT](https://www.aigovops-foundation.com/overt.html))

- **Beacon receipts.** Every AI call and agent action in this app writes a signed receipt. Each receipt has a ULID id, SHA-256 hashes of the prompt and result (never the text itself), an Ed25519 signature over RFC 8785 canonical JSON, a sequence number, and the hash of the previous receipt. The Receipts screen verifies the whole chain and points to the first receipt that was edited or is missing. It exports NDJSON, a signed bundle and the public key, so anyone can check them offline, without an account and without trusting the app. The exports pass Beacon's reference verifier (`beacon_verify.py`).
- **OVERT.** OVERT (Observable Verification Evidence for Runtime Trust) is an open specification for independently verifiable evidence that governance policies, security controls and oversight actions actually ran, including AI agents' tool calls, without exporting protected content. OVERT 1.1 was published on 11 June 2026 under a royalty-free covenant, and Glacis Technologies maintains it. The AiGovOps Foundation and the Coalition for Health AI (CHAI) have signed a co-stewardship agreement, which overt.is lists as not yet in effect. Sources: https://overt.is/ and https://www.aigovops-foundation.com/overt.html.
- **What the mark means.** "Governance-as-code inside" means the app uses the Foundation's open Beacon receipt format and verification approach. It is not a certification. Neither the AiGovOps Foundation nor the OVERT maintainers have certified or tested this app, and no OVERT conformance test has been run.
- **Honest limit.** This log makes edits or missing records detectable on this device. It is not a server-side immutable ledger. Clearing the browser's storage deletes it, so export any receipts you want to keep.

## Personas

The exact stories, settings, and seed specifications are in [docs/personas.md](docs/personas.md). Maya Torres is a casual social attendee, Diego Alvarez is a business networker, and Dr. Priya Natarajan is an academic researcher.

## Feature map

| feature | persona | tour step |
|---|---|---|
| Prep checklist and session preparation | Priya | Prepare and capture a useful question |
| Profile and persona-specific goals | Maya | Prepare around a personal goal |
| Today view, priorities and backstage entry | Maya | Today view and the backstage agent |
| People, priorities, status filters and follow-ups | Diego | Qualified client and partner priorities |
| Person details, notes, promises and meeting booking | Maya | People, mutual connection and follow-up |
| Agenda, keynote and session details | Priya | Focus blocks and the keynote on her agenda |
| Session notes and takeaways | Priya | Session notes and takeaways |
| Connect web and topic relationships | Priya | Connection web by topic |
| Matching, groups and birds-of-a-feather | Maya | Connection web and community groups |
| Backstage agents, needs-you approvals and bookings | Diego | Needs-you approvals and confirmed meetings |
| Agent negotiation, conversation and absorbed declines | Diego | Agent negotiation and absorbed declines |
| Prompt-injection blocking | Priya | Heads-down agent proposals and blocked instructions |
| Agent card QR, link, import and JSON export | Diego | Share the agent card by QR and link |
| Pitch studio, timer, length and pitch queue | Diego | Pitch rehearsal, timer and pitch length |
| Icebreakers and rapid-fire timer | Maya | Pitch fest and the live timer |
| Follow-up drafts and sequences | Diego | Follow-up drafts and sequences |
| End-of-day recap and persona-aware team report | Diego | Report by persona and export |
| Receipt list, verify and offline export | Priya | Verify and export the evidence trail |
| Slalom / AiGovOps design, language and accessible controls | Maya | Slalom / AiGovOps design and language |

## Demo scripts

Open `?demo=maya`, `?demo=diego`, or `?demo=priya`; demo state, receipt database and receipt head are isolated per persona.

### Maya Torres

Full tour: 12 steps. Quick steps, in order: 2, 3, 6, 7, 11.
1. Prepare around a personal goal.
2. **Quick (a):** Today view and the backstage agent.
3. **Quick (b):** Agent negotiation and absorbed declines.
4. People, mutual connection and follow-up. Screenshot: [Maya connection](docs/demo/muse/maya-01.png).
5. Agenda and the Oprah keynote.
6. **Quick (c):** Join the belonging birds-of-a-feather.
7. **Quick (d):** Agents and a needs-you proposal. Screenshot: [Maya backstage](docs/demo/muse/maya-02.png).
8. Connection web and community groups.
9. Pitch fest and the live timer.
10. End-of-day recap and team report.
11. **Quick (e):** Signed receipts and offline trust.
12. Slalom / AiGovOps design and language.

### Diego Alvarez

Full tour: 11 steps. Quick steps, in order: 1, 5, 7, 4, 10.
1. **Quick (a):** Today: pipeline goals and next move.
2. Qualified client and partner priorities.
3. Give/ask matching and warm introductions.
4. **Quick (d):** Needs-you approvals and confirmed meetings. Screenshot: [Diego matches](docs/demo/muse/diego-01.png).
5. **Quick (b):** Agent negotiation and absorbed declines.
6. Share the agent card by QR and link.
7. **Quick (c):** Pitch fest and the live timer. Screenshot: [Diego pitch](docs/demo/muse/diego-02.png).
8. Follow-up drafts and sequences.
9. Report outcomes to the team.
10. **Quick (e):** Verify and export signed receipts.
11. Sales profile and goals.

### Dr. Priya Natarajan

Full tour: 11 steps. Quick steps, in order: 1, 4, 7, 5, 10.
1. **Quick (a):** Today: protected focus and next session.
2. Focus blocks and the keynote on her agenda. Screenshot: [Priya agenda](docs/demo/muse/priya-01.png).
3. Session notes and takeaways.
4. **Quick (b):** Heads-down agent proposals and blocked instructions.
5. **Quick (d):** Needs-you approval: decide on a promising connection.
6. Practitioner people and research interests.
7. **Quick (c):** Connection web by topic.
8. Prepare and capture a useful question.
9. Research recap and report.
10. **Quick (e):** Verify and export the evidence trail. Screenshot: [Priya receipts](docs/demo/muse/priya-02.png).
11. Language, brand and profile settings.

source available under PolyForm Noncommercial 1.0.0. © AiGovOps Foundation, Bob Rapp, Ken Johnston.
