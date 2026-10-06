# 09 · English, Spanish, Portuguese

Paste everything below the line into Devin. Run after all feature prompts.

---

**Goal:** Add English, Spanish and Portuguese for everything the app itself says.

## Pause point 1 · Build (READ-DO)
1. Wrap every UI string in `t('english string', {vars})`. The English strings are the keys; Spanish and Portuguese go in `i18n.js`. **(must)**
2. Translate generated content too: persona summaries, follow-up templates, warnings, reports and alerts. Leave anything the user typed untouched. **(must)**
3. An EN / ES / PT switch in the header. Persist the choice and set `<html lang>`.
4. Format dates and times with `Intl` using `en-US`, `es-ES` and `pt-BR`.
5. Write a check script that extracts every `t()` key and confirms each exists in `es` and `pt` with matching `{placeholders}`. **(must)**

## Pause point 2 · Before saying "done" (DO-CONFIRM)
- [ ] The check script reports 0 missing keys. Any placeholder differences are explained.
- [ ] Switched to each language and screenshotted every tab, with no English leaking through.
- [ ] Reload keeps the chosen language.
- [ ] Longer Spanish/Portuguese strings don't break buttons or the tab bar.
- [ ] `i18n.js` is loaded before `app.js` and actually exists. **(must)**
