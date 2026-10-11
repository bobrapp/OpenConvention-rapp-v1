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

**Built on AiGovOps Foundation governance-as-code: Beacon receipts in the OVERT evidence format, verifiable offline.** ([About OVERT](https://www.aigovops-foundation.com/overt.html))

- **Beacon receipts.** Every AI call and agent action in this app writes a signed receipt. Each receipt has a ULID id, SHA-256 hashes of the prompt and result (never the text itself), an Ed25519 signature over RFC 8785 canonical JSON, a sequence number, and the hash of the previous receipt. The Receipts screen verifies the whole chain and points to the first receipt that was edited or is missing. It exports NDJSON, a signed bundle and the public key, so anyone can check them offline, without an account and without trusting the app. The exports pass Beacon's reference verifier (`beacon_verify.py`).
- **Plain-browser parsing.** Without `window.claude`, the app uses its local parser; accepting those results does not write an AI-call or AI-acceptance receipt. Copying an agent note, ask or brief writes an `agent.note.copied` receipt.
- **OVERT.** OVERT (Observable Verification Evidence for Runtime Trust) is an open specification for independently verifiable evidence that governance policies, security controls and oversight actions actually ran, including AI agents' tool calls, without exporting protected content. OVERT 1.1 was published on 11 June 2026 under a royalty-free covenant, and Glacis Technologies maintains it. The AiGovOps Foundation and the Coalition for Health AI (CHAI) have signed a co-stewardship agreement, which overt.is lists as not yet in effect. Sources: https://overt.is/ and https://www.aigovops-foundation.com/overt.html.
- **What the mark means.** "Governance-as-code inside" means the app uses the Foundation's open Beacon receipt format and verification approach. It is not a certification. Neither the AiGovOps Foundation nor the OVERT maintainers have certified or tested this app, and no OVERT conformance test has been run.
- **Honest limit.** This log makes edits or missing records detectable on this device. It is not a server-side immutable ledger. Clearing the browser's storage deletes it, so export any receipts you want to keep.

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
