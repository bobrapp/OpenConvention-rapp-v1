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
Recovery mode suppresses automatic writes (including Muse badge awards and alert
bookkeeping). Export first, then choose **keep recovered project** or explicitly
import a replacement to resume persistence. Browser storage is not a durable backup.

## Work-calendar import

ICS imports support UTC (`Z`), floating device-local times and IANA `TZID` values
such as `America/New_York`. Instants are converted to the device timezone before
placing work blocks on conference days. Times use minute precision. All-day events
are skipped. Ambiguous/nonexistent DST wall times, unknown/Windows timezone names,
custom `VTIMEZONE` definitions, and recurrence rules are rejected with a warning:
export those events in UTC and expand recurring instances first. Split overnight
events before import. Unsupported events never partially replace the agenda.
Files are limited to 2 MiB and 1000 events.

## Reproducible, offline regression checks

Use Node 22 and Python 3. Run dependency/browser installation once (this setup
step needs network access):

```sh
npm ci --prefix tests
npm ci --prefix claude-v1/tests
(cd tests && npx playwright install chromium)
```

Then run the full non-deploying gate:

```sh
node --check app.js && node --check i18n.js && node --check backup.js && node --check calendar.js
python3 build_muse.py
python3 claude-v1/build.py
git diff --exit-code -- 'R4 Muse V1' claude-v1/index.html
npm test --prefix tests
npm test --prefix claude-v1/tests
node tests/workflow-check.mjs
git diff --check
```

Root/Muse tests start an ephemeral loopback server, reject external requests,
and cover normal/empty/malformed backups, harmless ID marker probes, quota
failures, old version-1 migration, invalid-storage recovery, named-zone calendar
import, language switching, and every top-level tab. The Node calendar lane also
covers floating/UTC times, fractional offsets and DST gaps/overlaps. Localization
checks ensure Spanish/Portuguese key parity and interpolation variables.
Claude tests use local files, reject HTTP(S), and stub Claude rather than calling
real accounts. Use `CHROME_PATH` for root/Muse or `CHROMIUM_PATH` for Claude to
reuse an installed browser; otherwise Playwright uses its pinned browser build.

The standalone **Muse** file keeps its independent feature set (prep, badges,
icebreakers, promises, pitch revisions and matching weights). Its import and
calendar boundaries share the root modules; `build_muse.py` only refreshes those
inline scripts. The extensionless file must be served as `text/html` (the test
server does this; a default Python server will instead download it). Do not
replace Muse with a root-app bundle. `.github/workflows/check.yml` runs the same
source/generated checks with read-only permissions and no deployment step.
There is no configured linter/typechecker; syntax checks are not a lint claim.

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
