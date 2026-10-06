# Rapp-Prompts

Step-by-step prompts for Devin, one per request from the r4 networking app build. Each one is written in the style of Atul Gawande's *The Checklist Manifesto*:

- **Pause points.** Each checklist is split at natural stops: before building, during the build, and before saying "done".
- **READ-DO** steps are done in order, one at a time, as you read them.
- **DO-CONFIRM** lists come after the work: stop and confirm every box before reporting back.
- **Killer items** are marked **(must)**. They are the steps that are easy to skip and costly to miss; most of them broke at least once in the original build.
- **Short and plain.** Each pause point has about 5–9 items written as plain verbs. The checklist doesn't replace judgment; it catches the misses.

## How to use

1. Open a prompt file and fill in anything in `[brackets]`. The defaults are what Bob used.
2. Copy everything below the `---` line and paste it into a new Devin session.
3. Run them in order: 01 is the base, 02–10 add features to it, and 11–12 publish it. You can paste several into one session; Devin will work through them one after another.

| # | Prompt | Original ask |
|---|--------|--------------|
| 01 | [Core networking app](01-core-app.md) | "an app that makes my conference time really useful for networking" |
| 02 | [Personas + team report](02-personas-and-team-report.md) | "persona based summary for each attendee - give me resources and report back to my team" |
| 03 | [Birds of a feather](03-birds-of-a-feather.md) | "birds of a feather exercise session" |
| 04 | [2-minute Pitch Fest](04-pitch-fest.md) | "pitch fest for 2 minutes to get people to socialize" |
| 05 | [Event time + work blocks](05-time-and-work-blocks.md) | "manage my time at event as well as my work calendar" |
| 06 | [Slalom design language](06-slalom-design.md) | "make it in the Slalom design language" |
| 07 | [Connection web + small groups](07-connection-web.md) | "subject web of connections to match make small groups and individuals" |
| 08 | [Headliner countdown + alerts](08-headliner-countdown.md) | "I am in this R4 event to see Oprah..." |
| 09 | [English, Spanish, Portuguese](09-languages-en-es-pt.md) | "add english, spanish and portuguese" |
| 10 | [Chief-of-staff agents](10-chief-of-staff-agents.md) | "help my c of staff agent meet other c of staff agents" |
| 11 | [GitHub repo + branch](11-github-repo-and-branch.md) | "create a public repo ... OpenConvention-rapp-v1 ... Devin-v1" |
| 12 | [GitHub Pages version picker](12-github-pages-version-picker.md) | "host the app - all three - via github live pages" |
| 13 | [Make Rapp-Prompts](13-make-rapp-prompts.md) | "a step-by-step version of each prompt in the checklist manifesto style" |
