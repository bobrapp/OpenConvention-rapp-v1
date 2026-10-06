# 06 · Slalom design language

Paste everything below the line into Devin. Requires prompt 01.

---

**Goal:** Style the app in Slalom's design language.

## Pause point 1 · Build (READ-DO)
1. Use an approximation, not official assets: deep blue primary, lots of white space, rounded cards, lowercase friendly headings, people-first copy. Tell me it's an approximation. **(must)**
2. Define colors, radius, shadow and spacing once as CSS variables. No inline styles.
3. Mobile-first: designed at 420px wide, bottom tab bar, tap targets of at least 44px, `env(safe-area-inset-*)` padding.
4. Short, warm, lowercase tone ("who should you meet next?").
5. Body text contrast of at least 4.5:1 (WCAG AA). **(must)**

## Pause point 2 · Before saying "done" (DO-CONFIRM)
- [ ] Screenshots of every tab at 420×900.
- [ ] No horizontal scroll at 360px wide, and long names truncate cleanly.
- [ ] The tab bar still fits when a 7th tab is added.
