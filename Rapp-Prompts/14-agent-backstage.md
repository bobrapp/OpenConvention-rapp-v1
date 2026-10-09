# 14 · Agent backstage

> “think about this project as a mobile convention app that will innovate on how humans make short-term connections for networking and make agent-to-agent behavior behind the scenes the story.”
>
> “look at mobbin and stuff to see good ux”

Paste everything below the line into Devin.

---

**Goal:** Make the attendee’s human moments the story and simulated agent-to-agent negotiation the backstage work. UX references: mutual-reveal and both-answer prompts, consent-first onboarding, private rejection reasons, a Live Activity island, and a calm floating moment bar.

## Pause point 1 · Before building (READ-DO)
1. Confirm every peer agent is simulated and local-only. **(must)**
2. Keep the existing Slalom blue tokens and the current static app stack.
3. Use the existing UX references before changing the surface.
4. Store v2 state under `r4-networking-v2`; migrate v1 without deleting it.

## Pause point 2 · Build the backstage engine (READ-DO)
1. Advance threads through discover, overlap, propose, negotiate, needs-you, confirmed, live and done; support declined and blocked.
2. Use free agenda gaps, protect the headliner, respect quiet hours and cap simultaneous and hourly meetings. **(must)**
3. Keep names and contact details private until both people say yes.
4. Let the attendee’s charter control sharing, autonomy and heads-down behavior.
5. Block exactly one simulated prompt injection per state and record the refusal.
6. Add a mutually revealed agenda moment, a timed handshake and private spark feedback.

## Pause point 3 · Build the human surface (READ-DO)
1. Add the consent charter, backstage island, Now needs-you cards and Backstage ledger.
2. Show the A2A transcript and expandable JSON without exposing private identity early.
3. Include graph, thread progress, statistics, charter editor and story of the day.
4. Keep the legacy agent tools available in a collapsed section.
5. Translate every new UI string into Spanish and Portuguese.
6. Keep all tabs readable in light and dark mode at 390px with no horizontal overflow.

## Pause point 4 · Before saying “done” (DO-CONFIRM)
- [ ] v1 migration preserves v1 and seeds backstage defaults from profile give/ask fields.
- [ ] A simulated no stays private; mutual yes reveals both people and creates an agenda item.
- [ ] A live moment supports handshake, countdown, exit nudge and private rating.
- [ ] An injection is refused and counted once; no simulated peer data leaves local storage.
- [ ] i18n checks, browser smoke flow and Spanish/Portuguese tabs pass with no console errors.
- [ ] Save screenshots of the specified mobile surfaces and report the commit and any deviations.
