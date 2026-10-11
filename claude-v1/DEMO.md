# r4 Claude persona demo

## Why this app

- **More real connections, less social cost.** Agents do the searching, asking, rejecting and scheduling backstage. People only see short (7/15/25 min) moments that both said yes to. First-timers get a dinner crew, sellers get qualified conversations, researchers get interviews.
- **Respects the agenda.** Keynotes/headliners are protected, there are quiet hours and hourly caps, so networking doesn't pull people out of the sessions the sponsor paid for.
- **Follow-through.** Follow-up drafts, a recap and a report turn hallway conversations into outcomes the attendee (and their team) can act on.
- **Privacy by default.** Data stays on the device. Names are revealed only after mutual consent. Agents share topics, not contact details. There's no attendee tracking dashboard.
- **Claude: the AI notebook for the event.** Paste an agenda, badge list or hallway note and structure people, sessions and follow-ups; a plain browser uses the local parser when Claude is unavailable. Goals by persona, the connection web, pitch fest, summaries and reports complete the workflow. Real AI calls are signed and receipted; only hashes are stored, never prompt or answer text.

## Why it represents the sponsor's brand

- **The whole app wears the sponsor's design system.** The Slalom theme uses Slalom's colours, type scale and pill buttons, light and dark. It's an extension of the brand, not a white-labelled generic event app with a logo in the corner.
- **It acts out the sponsor's values.** Human-centred connection, with technology doing the heavy lifting behind the scenes. Attendees experience "what AI done responsibly feels like" first-hand, which says more than a booth or a slide.
- **Trust is part of the brand.** Consent-first reveals, on-device data, and AI actions you can verify are a visible stance on responsible AI that the sponsor can point to.
- **Outcomes, not surveillance.** Attendees can choose to share their report (moments made, follow-ups) with their team. The sponsor gets a story of value created without collecting attendee data.
- **One toggle to AiGovOps.** The same app switches to the AiGovOps Foundation theme, which shows the co-brand and the governance story side by side.

## Trust: AiGovOps Foundation, Beacon and OVERT

- **Beacon receipts.** Every AI call and agent action writes a receipt in AiGovOps Beacon's receipt format: ULID id, SHA-256 hashes of prompt/result (content-free), Ed25519 signature over RFC 8785 canonical JSON, hash-chained to the previous receipt. The receipts screen lets anyone verify the chain, see tampering or deletion detected, and export NDJSON / bundle / public key for offline verification. Devin's export passes Beacon's own verifier (`beacon_verify.py`).
- **OVERT.** Beacon's receipt envelope follows OVERT (Observable Verification Evidence for Runtime Trust), an open standard for independently verifiable runtime evidence that declared governance controls actually executed, including AI agents' tool calls, without exporting protected content. OVERT 1.1 was published 11 June 2026 with a royalty-free covenant. The AiGovOps Foundation and the Coalition for Health AI (CHAI) signed an agreement to co-steward it (sources: https://www.aigovops-foundation.com/overt.html, https://overt.is/). Say "follows the OVERT envelope via Beacon". Do NOT claim "OVERT certified/conformant" or a registry entry: no conformance test has been run.
- **The seal.** Present it as "Built on AiGovOps Foundation governance-as-code: Beacon receipts, OVERT evidence format, verifiable offline by a stranger." A stranger verifies what happened, offline, without an account and without trusting us. The honest limit is explicit: receipts are tamper-evident on this device, not a server-side immutable ledger.

## Personas

- [Maya Torres](docs/personas.md): social first-timer seeking belonging and a dinner crew.
- [Diego Alvarez](docs/personas.md): sales networker pursuing qualified conversations and co-sells.
- [Dr. Priya Natarajan](docs/personas.md): academic researcher protecting focus while conducting interviews.

## Feature map

| feature | persona | tour step |
|---|---|---|
| Today dashboard, goals and follow-ups | Maya | Progress toward a dinner crew |
| People search, status, persona detail and quick capture | Maya | Quick capture and AI parsing |
| Agenda day picker, sessions, notes, work blocks, clashes and free windows | Priya | Agenda, notes and writing blocks |
| Paste agenda and attendee-list parser | Priya | Parse an agenda or badge list |
| Connection web, subject filters, small groups and introductions | Priya | Connection web and research themes |
| Agent cards, QR sharing and consent-aware agent notes | Diego | Agent card and consent-aware handoffs |
| Pitch queue, live timer and follow-up spark | Diego | Pitch fest queue and timer |
| End-of-day recap, team report, copy and save | Diego | Report outcomes to the team |
| Slalom/AiGovOps design controls and event settings | Maya | Sponsor design switch |
| Beacon receipt list, verification and offline export | Priya | Receipts, verification and offline export |

## Demo scripts

Use `?demo=maya`, `?demo=diego`, or `?demo=priya`. Demo state and receipts are isolated per persona. In the Claude artifact, AI parsing uses Claude; in a plain browser, it uses the local parser. Local parsing does not create AI-call receipts.

### Maya Torres

1. Open quick capture and review the local parser's structured notes. ![Maya quick capture](docs/demo/claude/maya-01.png)
2. Follow shared interests on the connection web. ![Maya connection web](docs/demo/claude/maya-02.png)

### Diego Alvarez

1. Review a prioritized client or partner and its follow-up. ![Diego people](docs/demo/claude/diego-01.png)
2. Rehearse in the pitch timer and queue. ![Diego pitch fest](docs/demo/claude/diego-02.png)

### Dr. Priya Natarajan

1. Review a session note and writing block. ![Priya agenda](docs/demo/claude/priya-01.png)
2. Explore research themes in the connection web. ![Priya connection web](docs/demo/claude/priya-02.png)

source available under PolyForm Noncommercial 1.0.0. © AiGovOps Foundation, Bob Rapp, Ken Johnston.
