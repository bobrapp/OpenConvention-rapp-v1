# 12 · GitHub Pages: all versions, one picker page

Paste everything below the line into Devin. Requires prompt 11.

---

**Goal:** Host every version of the app live on GitHub Pages, with a nice landing page to choose one. Versions: [Devin-v1, Claude-v1, Muse-v1] in [bobrapp/OpenConvention-rapp-v1].

## Pause point 1 · Before building (READ-DO)
1. GitHub Pages serves one site per repo, so build a single site: `/` is the picker, and `/devin/`, `/claude/` and `/muse/` each hold a copy of their branch. **(must)**
2. Check that each branch exists (`git ls-remote`). Show a missing branch as "coming soon" instead of failing.
3. Check that each branch is static (`index.html` at the root). If it needs a build, build it and copy the output.
4. All versions share one origin and therefore one localStorage. Make sure each version uses its own storage key. **(must)**

## Pause point 2 · Build (READ-DO)
5. A picker page in the app's design: one card per version with status (live / coming soon), last commit and an "open" button, plus links to the repo and Rapp-Prompts.
6. Use relative paths only, so each app works under `/[repo]/[version]/`. **(must)**
7. Keep the build in the repo (`pages/build-pages.sh`) so a rebuild is one command after any branch changes.
8. Push the output, including `.nojekyll`, to a `gh-pages` branch.
9. If Pages isn't on, ask me to set Settings → Pages → Deploy from a branch → `gh-pages` / root.

## Pause point 3 · Before saying "done" (DO-CONFIRM)
- [ ] `https://[owner].github.io/[repo]/` returns 200 and shows every version.
- [ ] Each live version opens, loads with zero console errors, and keeps its data after a reload.
- [ ] "Coming soon" versions say which branch to push.
- [ ] Told me how to republish after a branch changes.
