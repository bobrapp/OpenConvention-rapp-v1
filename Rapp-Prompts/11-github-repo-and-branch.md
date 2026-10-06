# 11 · Public GitHub repo + branch

Paste everything below the line into Devin.

---

**Goal:** Put the app in a public GitHub repo [bobrapp/OpenConvention-rapp-v1] with `main` and a branch [Devin-v1] off main.

## Pause point 1 · Before pushing (READ-DO)
1. Check whether the repo exists with `git ls-remote https://github.com/[owner]/[repo]`.
2. If it doesn't, ask me to create an **empty public** repo (no README, license or .gitignore) and to give the Devin GitHub app access to it. Devin can't create repos under a personal account without a token. **(must)**
3. Make sure the local default branch is `main` and everything is committed. No secrets, zips, `.DS_Store` or build junk. **(must)**

## Pause point 2 · Push (READ-DO)
4. Add `origin`, push `main`, create [Devin-v1] from `main`, and push it.
5. Never force-push `main`. **(must)**

## Pause point 3 · Before saying "done" (DO-CONFIRM)
- [ ] `git ls-remote origin` shows both branches at the expected commit.
- [ ] The repo URL returns 200 when logged out, so it's public.
- [ ] Sent me links to the repo and to each branch.
