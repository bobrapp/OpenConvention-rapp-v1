# r4 networking

Mobile-first networking companion for Slalom r4. Static HTML/CSS/JS, no build step; data lives in browser localStorage.

Run: `python3 -m http.server 8080` in this folder, open http://localhost:8080.

## Backups

Root-app JSON imports accept version 1 backups up to 20 MiB. Identifiers, member
types, dates, times and nested collections are validated before migration or
storage replacement. Older version-1 backups without the headliner/chief-of-staff
flags, language or agent state are migrated on a detached copy; other versions
are rejected rather than guessed. A storage failure leaves the current project
unchanged. Before a successful import, the prior project is retained under
Settings → **export previous backup**.

If persisted data is invalid, startup uses the previous valid snapshot when
available, otherwise demo data, and warns without overwriting the original.
Export before editing a recovered project; browser storage is not a durable backup.

## Versions

The same app, built by three AI builders. Each version lives on its own branch:

| Builder | Branch | Live app |
| --- | --- | --- |
| Devin | [`Devin-v1`](https://github.com/bobrapp/OpenConvention-rapp-v1/tree/Devin-v1) | https://bobrapp.github.io/OpenConvention-rapp-v1/devin/ |
| Claude | [`Claude-v1`](https://github.com/bobrapp/OpenConvention-rapp-v1/tree/Claude-v1) | https://bobrapp.github.io/OpenConvention-rapp-v1/claude/ |
| Muse | [`muse-v1`](https://github.com/bobrapp/OpenConvention-rapp-v1/tree/muse-v1) | https://bobrapp.github.io/OpenConvention-rapp-v1/muse/ |

Pick a version at https://bobrapp.github.io/OpenConvention-rapp-v1/. The site is the `gh-pages` branch, built by `pages/build-pages.sh` on `Devin-v1`.

## Credits and license

Built for the [AiGovOps Foundation](https://www.aigovops-foundation.com) by Bob Rapp (bob.rapp@aigovops.community) and Ken Johnston (ken.johnston@aigovops.community).

Copyright 2026 AiGovOps Foundation, Bob Rapp and Ken Johnston. All rights reserved, except as licensed for noncommercial purposes under the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0); see [LICENSE](LICENSE) and [NOTICE](NOTICE). This is source-available, not OSI open source: personal, research, educational, charitable and government use is permitted, and commercial use needs permission from the AiGovOps Foundation. Third-party code under `vendor/` keeps its own license.
