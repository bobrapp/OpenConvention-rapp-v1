# r4 networking companion — Claude v1

A second build of the r4 networking app, kept in its own folder so it sits beside the app at the repo root without changing it.

One page, no build step needed to run it. It is a personal planner and is not an official Slalom app.

## Run it

```
cd claude-v1
python3 -m http.server 8080
```

Open http://localhost:8080 for an empty app, or http://localhost:8080/examples/load.html to start with example data. Every example is labelled and one tap inside the app clears them all.

## What it does

- **Today**: what is next, free time left, goals, who to find next, follow-ups due, end-of-day recap.
- **People**: ten-second capture, a persona summary per attendee, questions to ask, resources to offer, a follow-up note written for their persona.
- **Agenda**: sessions and work blocks on one timeline, with clash flags, free windows, break warnings and an "add to Google Calendar" link.
- **Birds of a feather**: a session type with linked attendees, notes, takeaways and proposed topics.
- **Web**: people linked by subject, a small-group builder, ranked "who you should meet", and introductions you can make.
- **Pitch**: a two-minute countdown with a pitcher queue.
- **Agents**: a card for your own agent, a log of other people's agents, and notes for agent-to-agent hand-offs.
- **Report**: a team report by persona to copy or save.

## Where notes are stored

- Opened from this folder, notes stay in that browser's local storage.
- Published as a Claude artifact with the `db`, `user` and `downloads` capabilities, notes are saved to the viewer's own private store and follow them across devices.

## Files

| File | What it is |
|---|---|
| `app.html` | The source: the page body exactly as published to a Claude artifact. Edit this one. |
| `index.html` | The standalone page, generated from `app.html`. |
| `build.py` | Regenerates `index.html` after an edit: `python3 build.py`. |
| `examples/examples.json` | Invented people, sessions, goals and pitches. None of it is real. |
| `examples/load.html` | Loads the examples into the browser and opens the app. |
| `tests/smoke.mjs` | Walks every tab and the main flows in a headless browser. |
| `Rapp-Prompts-for-Claude.md` | The prompts that built this, rewritten as step-by-step checklists. |

## Test

```
cd claude-v1/tests
npm install
npm test
```

Set `CHROMIUM_PATH` to reuse a Chromium you already have.

## Known limits

- No real r4 agenda is preloaded; the event's dates and sessions could not be confirmed from public sources.
- The look approximates Slalom's colours and tone. It uses no Slalom logo or wordmark.
- Persona summaries and matching are rule-based, built from what you enter.
- The scannable code on the agent card loads a small library from cdnjs, so it needs a connection. Fonts come from Google Fonts and fall back to system fonts offline.
