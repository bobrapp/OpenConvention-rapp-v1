# 08 · Headliner countdown + alerts

Paste everything below the line into Devin. Requires prompts 01 and 05.

---

**Goal:** I'm at this event to see [Oprah Winfrey's keynote]. Highlight it, add a countdown timer, and add alerts that get me excited.

**I'll give you:** the day, time and room [tomorrow, 9:00am, main hall].

## Pause point 1 · Before building (READ-DO)
1. Use my time and room. If I didn't give them, use a placeholder, label it "placeholder" both in the app and in your report, and make it a one-tap edit. **(must)**

## Pause point 2 · Build (READ-DO)
2. A featured card on today with a live days/hours/minutes/seconds countdown and "tomorrow" / "today" / "starting now" messages.
3. A thin countdown strip on every other tab.
4. Alerts at 24h, 1h, 30m and 10m before. Use browser notifications if allowed and in-app alerts if not. Each alert fires once: store fired flags. **(must)**
5. "Add to calendar" downloads an `.ics` with 4 VALARMs (`-P1D`, `-PT1H`, `-PT30M`, `-PT10M`). This is what alerts me when the app is closed.
6. A prep checklist: arrive early, charge phone, questions to ask, who to sit near.
7. Nothing else, including the scheduler and agents, can book over the headliner.

## Pause point 3 · Before saying "done" (DO-CONFIRM)
- [ ] The countdown changes between two readings taken 2 seconds apart.
- [ ] The `.ics` has exactly 4 `BEGIN:VALARM` blocks.
- [ ] Each alert fires once and doesn't fire again after a reload.
- [ ] Editing the time updates the countdown, the strip and the `.ics`.
- [ ] Repeated the placeholder warning in your report if the time is unconfirmed.
