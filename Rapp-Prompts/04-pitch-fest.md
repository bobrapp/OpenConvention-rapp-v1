# 04 · 2-minute Pitch Fest

Paste everything below the line into Devin. Requires prompt 01.

---

**Goal:** Run a Pitch Fest mode with 2-minute pitches that get people talking, and capture the connections it sparks.

## Pause point 1 · Build (READ-DO)
1. A full-screen 2:00 countdown with digits readable at arm's length, plus start, pause and reset.
2. Compute the time from timestamps, not by counting ticks, so it stays accurate when the tab is in the background. **(must)**
3. Beep at 0:30, 0:10 and 0:00 using the Web Audio API (no audio files). Create or resume the AudioContext on the user's tap, or iPhones stay silent. **(must)**
4. Pitcher queue: add names, and "next pitcher" resets the timer.
5. A "sparked a connection" button that logs the pitcher as a person and adds a follow-up in one tap.
6. Keep the screen awake with the Wake Lock API when available, and fail silently otherwise.

## Pause point 2 · Before saying "done" (DO-CONFIRM)
- [ ] Ran a full 2:00 pitch: the timer ends within 1 second of real time.
- [ ] Beeps play after the first tap.
- [ ] "Sparked" creates the person and a follow-up, and both are visible in their tabs.
- [ ] Screenshot of the countdown mid-pitch.
