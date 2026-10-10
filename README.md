# r4 networking

Mobile-first networking companion for Slalom r4. Static HTML/CSS/JS, no build step; data lives in browser localStorage.

Run: `python3 -m http.server 8080` in this folder, open http://localhost:8080.

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
