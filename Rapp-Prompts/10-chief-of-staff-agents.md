# 10 · Chief-of-staff agents (simulated)

Paste everything below the line into Devin. Requires prompts 01–08.

---

**Goal:** Help my chief-of-staff agent meet other chiefs-of-staff agents. Build all three, simulated: an agent-to-agent network, my own agent roster, and support for human chiefs of staff.

## Pause point 1 · Before building (READ-DO)
1. Confirm the scope: a real external agent, an in-app simulation, or human chiefs of staff. If I say "all, simulated", state clearly that nothing connects to real AI agents. **(must)**

## Pause point 2 · Build (READ-DO)
2. Give every agent an A2A-style card (name, description, url, version, skills, capabilities, plus an `x-r4` block with owner, interests and `simulated: true`).
3. My roster: chief of staff, scheduler, researcher, follow-up writer and connector. Each has a role, capabilities, an on/off toggle and an activity log.
4. "Let my agents network": discover peer agents, swap cards, match on interests and goals, and propose 1:1s in my real free slots. Peers accept, counter-propose or decline.
5. Scheduler rules: free slots only, keep lunch free, no back-to-back meetings, never over the headliner, no conflicts. **(must)**
6. Wait for my approval by default, with an optional auto-book toggle. An approved meeting goes on the agenda and gets a follow-up.
7. Show the conversation. Each message expands to its raw JSON envelope.
8. Share my card by QR code, `#agent=` link and JSON download. Import by opening a link, handling `hashchange` and not only page load, or by pasting it. **(must)**
9. Human chiefs of staff: a chief-of-staff persona, 4 sample chiefs of staff, chief-of-staff matching, and a "chiefs of staff circle" BoF.

## Pause point 3 · Before saying "done" (DO-CONFIRM)
- [ ] Ran the network twice from a clean state with no double-booking or adjacent bookings.
- [ ] Approve and decline both work, and approved meetings appear in the agenda.
- [ ] The QR code renders, the JSON downloads, and opening a link while the app is already open imports the card.
- [ ] Works in all three languages, with zero console errors.
- [ ] Your report says what is simulated.
