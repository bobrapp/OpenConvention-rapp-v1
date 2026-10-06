# 01 · Core conference networking app

Paste everything below the line into Devin. Fill in the [brackets] first.

---

**Goal:** Build a mobile-first networking companion for [Slalom's r4 conference]. It needs a people log with quick capture, my networking goals, a follow-up queue, a session planner and an end-of-day recap.

**I'll give you:** the event name and dates [r4, starting today, 3 days], my name and team [Bob], and my 3 networking goals [meet 10 new clients, find 2 partners, reconnect with my team].

## Pause point 1 · Before building (READ-DO)
1. Restate the app in 3 lines. Ask me only about facts you can't safely guess.
2. Check the toolchain (`node -v`, `python3 -V`). If node is missing, build plain HTML/CSS/JS with no build step. Don't stall waiting for tools. **(must)**
3. Save all data in browser localStorage under one versioned key (e.g. `r4-networking-v1`), with a `migrate()` that fills in new fields for existing users.
4. Seed realistic demo data: about 12 people and a 3-day agenda starting today. Add a "start fresh" button that clears it.

## Pause point 2 · Build (READ-DO)
5. Tabs: **today** (goals, what's next, open follow-ups, who to find next), **people**, **agenda**, **report**.
6. People quick-add takes under 10 seconds: name, company, role, where we met, note, tags.
7. Follow-up queue: each person can have a due follow-up with a message I can copy.
8. End-of-day recap: who I met, follow-ups due, progress on my goals.
9. Profile screen: my name, team, interests, event dates, plus JSON export/import to move data between devices.

## Pause point 3 · Before saying "done" (DO-CONFIRM)
- [ ] Served it (`python3 -m http.server 8080`) and opened it at a phone-sized 420×900 viewport. **(must)**
- [ ] Every tab renders. Added, edited and deleted a person, reloaded, and the data was still there.
- [ ] The browser console shows zero errors, including 404s (add an inline favicon). **(must)**
- [ ] Every file referenced in `index.html` actually exists. **(must)**
- [ ] Sent me a live preview link and a screenshot of each tab, and said the preview only works while the session is awake.
- [ ] Listed what is simulated, a placeholder or unverified.
