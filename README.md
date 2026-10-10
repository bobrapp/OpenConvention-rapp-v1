# r4 networking

Mobile-first networking companion for Slalom r4. Static HTML/CSS/JS, no build step; data lives in browser localStorage.

Run: `python3 -m http.server 8080` in this folder, open http://localhost:8080.

## meet tab and community backend

The **meet** tab has your shareable card (LinkedIn QR, contact card .vcf, app card, lock-screen wallpaper, printable badge, Web Share), tap-to-connect (Web NFC on Android Chrome, sticker guide for iPhone), a QR scanner (camera, photo or pasted link), a networking passport, and temporary micro-communities: pop-up pods, session back-channels, Oprah line buddies, coffee roulette, a give/ask board, a reunion clock and agent-built pods.

Without configuration it runs in **demo mode**: simulated attendees, stored on this device only. To share pods and rooms between real attendees, connect a free Supabase project:

1. Create a project at https://supabase.com/dashboard.
2. In **SQL Editor**, run `supabase/migrations/20261006000000_community.sql` (tables, row level security, realtime, auto-expiry).
3. In **Authentication → Sign In / Providers**, turn on **Allow anonymous sign-ins**.
4. Put the **Project URL** and **anon / publishable key** in `config.js`, or paste them under profile → community backend on each device.

Only the anon key belongs in the app; row level security limits each attendee to their own rows and the pods they joined. Your people log and private notes never leave the device. Pods close after their chosen window, stay readable for a day, reopen for a week at the reunion date, and are then deleted by `purge_expired()` (scheduled hourly with pg_cron when available).

## Devin v2: agent backstage

Devin v2 makes short-term convention connections the visible outcome and simulated agent-to-agent negotiation the backstage story. Threads move through discover, overlap, propose, negotiate and human approval before a mutually accepted moment is revealed and added to the agenda. A personal charter controls name privacy, topic sharing, hourly limits, headliner protection, quiet hours and agent autonomy. Every peer agent is simulated locally; backstage state uses `r4-networking-v2` in browser localStorage and does not change Supabase.

## Tests
- Install dependencies: `cd tests && npm install`
- Run syntax, localization and browser checks: `node --check app.js i18n.js && node tests/i18n-check.mjs && cd tests && node smoke.mjs`
- Set `CHROME_PATH` to use a Chrome binary other than the default macOS path.

## Credits and license

Built for the [AiGovOps Foundation](https://www.aigovops-foundation.com) by Bob Rapp (bob.rapp@aigovops.community) and Ken Johnston (ken.johnston@aigovops.community).

Copyright 2026 AiGovOps Foundation, Bob Rapp and Ken Johnston. All rights reserved, except as licensed for noncommercial purposes under the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0); see [LICENSE](LICENSE) and [NOTICE](NOTICE). This is source-available, not OSI open source: personal, research, educational, charitable and government use is permitted, and commercial use needs permission from the AiGovOps Foundation. Third-party code under `vendor/` keeps its own license.
