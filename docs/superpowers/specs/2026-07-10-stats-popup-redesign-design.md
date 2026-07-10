# Practice Stats Popup Redesign

**Goal:** Fix three real bugs and five organization/labeling issues in the Practice Stats popup, found during a full audit of `renderStats()`, `renderEarStats()`, and their shared rendering helpers.

## Background

An audit of the stats popup (`#statsModal`, built by `renderStats()`/`renderEarStats()` in `script.js`) against live-rendered screenshots found 8 issues, split into two categories:

**Real bugs:**
1. Ear Training's `earAdaptWeights.types` bucket is keyed by bare label text shared across intervals, chords, and scales. `EAR_CHORD_MAP`'s `'Major'` (a chord quality) and `EAR_SCALE_MAP`'s `'Major'` (a scale type) collide on the identical string, silently merging two unrelated skills' response-time stats into one number with no UI indication.
2. `buildSection()` (shared by every mastery list in both tabs) sorts purely by raw EMA (average response time), ignoring sample size. A row with 2 samples and an unlucky slow average can outrank a row with 20 samples and genuinely reliable data.
3. The Playing tab's "Focus on These" panel silently mixes real measured root×type combos (≥3 samples) with a synthesized cross-product estimate (slowest root × slowest type) when no real combo qualifies yet — rendered through an identical template, with no way to tell which is which.

**Organization/labeling issues:**
4. The color/trend legend sits between "Focus on These" and the 14-Day chart, far from the Root Notes/Types/Voicings sections that actually use those colors and badges.
5. The two time-based visualizations (Practice Calendar heatmap, 14-Day Avg Response Time chart) are split apart by unrelated sections.
6. The "Inversions" section title is stale — it also holds a synthetic "Left Hand" entry from two-handed practice mode, which isn't an inversion.
7. Five of the header row's six tiles show one number + one label; the sixth ("practice minutes") crams two numbers/timeframes into one tile.

## Fix 1: Ear Training key-collision (resolver + selection + one-time cleanup)

This fix touches three places, not just the write path — `weightedPickEar()` (the adaptive-selection function that weights which prompt to show next toward weak spots) reads the same bucket by bare label, so fixing only the write side would silently break weighted selection (every lookup would miss, falling back to uniform random with no error).

- **Storage key format**: `${category}:${label}` — e.g. `'chord:Major'`, `'scale:Major'`, `'interval:Minor 2nd'`. `category` is one of `'interval'|'chord'|'scale'`, matching the `type` field every ear-training prompt generator (`genEarInterval`/`genEarChord`/`genEarScale`) already produces. Delimiter is literal `:` — verified no existing label in `EAR_INT_MAP`/`EAR_CHORD_MAP`/`EAR_SCALE_MAP` contains one.
- **`weightedPickEar(items, category)`**: gains a required second parameter. Internal lookup becomes `g[`${category}:${item}`]` instead of `g[item]`. All three call sites (`genEarInterval`, `genEarChord`, `genEarScale`) pass their own literal category string.
- **`recordEarResult(category, label, ms)`**: gains a leading `category` parameter, builds the composite key before calling `updateEarAdaptWeight`. Both call sites (the two answer-checking handlers) pass `earCurrentPrompt.type` (already present on the prompt object) alongside the existing `earCurrentPrompt.correct`.
- **`updateEarAdaptWeight(key, ms)`**: unchanged internally — it already takes an opaque key string; the composite key is just a different string than before.
- **One-time cleanup, no migration flag**: on script init, after loading `earAdaptWeights` from `localStorage['mpr_weights_ear']`, check whether any key in `.types` lacks a `:` (i.e., pre-fix bare-label data). If so, reset `earAdaptWeights.types` to `{}` and persist immediately via `saveEarAdaptWeights()`. Self-describing — requires no separate version flag, and never fires again once all stored keys are prefixed. This is a full reset of ear-training mastery data only; `mpr_daily`'s `earAnswers`/`earAvgMs` fields (which drive the Ear tab's header row and streak) are a separate data source and are untouched.
- **`buildEarSection()` / Recognition Types display**: strip the `${category}:` prefix back off for the row label shown to the user (so it still reads "Major", not "chord:Major").

## Fix 2: Sort order accounts for sample size

`buildSection(entries, title)` (used for Root Notes, Types, Voicings, and — via `buildEarSection`, an identical copy — Recognition Types):

- Split `entries` into `confirmed = entries.filter(([, e]) => e.count >= 3)` and `building = entries.filter(([, e]) => e.count < 3)`.
- `confirmed` sorts by EMA descending (worst/slowest first), exactly as today.
- `building` sorts by `count` descending (closer to graduating into "confirmed" first), regardless of its EMA.
- Render `confirmed` rows first, then `building` rows — the existing dim-row/`"n/3"` badge styling is unchanged, this only changes ordering.

## Fix 3: "Focus on These" — measured data only

Remove the cross-product fallback (the `else` branch that synthesizes an estimate from slowest roots × slowest types when no real combo has ≥3 samples). If `weakCombos.length === 0`, the panel renders nothing — `weakSpotsHtml` becomes `''`, matching the existing convention every other section already follows when it has no data (`buildSection()` already returns `''` for an empty section; no new empty-state message is introduced here). `usesCombos` and the two-branch `weakItems`/`usesCombos` logic are removed entirely — the Playing tab's Focus panel now always sources from `adaptWeights.combos` alone. (The Ear Training tab's Focus panel already only uses measured data — `earWeakItems = typeEntries.filter(([, e]) => e.count >= 3)` — no change needed there.)

## Fix 4: "Inversions" → "Voicings"

Single string change: `buildSection(Object.entries(adaptWeights.variations), 'Inversions')` → `buildSection(Object.entries(adaptWeights.variations), 'Voicings')`. No data-model change — this is a display label only.

## Fix 5: Section reorder + regrouped charts/legend

Playing tab's `renderStats()` return-value order changes from:

`headerHtml + calHtml + weakSpotsHtml + legendHtml + chartHtml + buildSection(roots) + buildSection(types) + buildSection(variations)`

to:

`headerHtml + weakSpotsHtml + calHtml + chartHtml + legendHtml + buildSection(roots) + buildSection(types) + buildSection(variations)`

I.e.: Header → Focus on These → Practice Calendar → 14-Day Chart → Legend → Root Notes → Types → Voicings. The two time-based visualizations (calendar, chart) become adjacent; the legend moves to immediately precede the three color-coded mastery sections it explains. "Focus on These" keeps its current early position (right after the header) rather than moving to the end — it's the most actionable part of the popup and this preserves showing it before the user has to scroll.

The Ear Training tab's `renderEarStats()` order is unaffected — it already has no calendar/chart to regroup, and its existing order (header → weak-spots → legend → Recognition Types) already puts the legend directly before the one color-coded section it explains.

## Fix 6: Header tile — stacked equal-weight numbers

The 6th header tile's markup changes from:

```html
<div class="stats-header-stat">
  <span class="stats-header-num">${todayPracticeMin} min</span>
  <span class="stats-header-lbl">today · ${totalPracticeMin} min (30 days)</span>
</div>
```

to two comparably-weighted numbers in one tile:

```html
<div class="stats-header-stat">
  <span class="stats-header-num">${todayPracticeMin} <span class="stats-header-num-sep">/</span> ${totalPracticeMin}</span>
  <span class="stats-header-lbl">min today / 30d</span>
</div>
```

A new `.stats-header-num-sep` CSS class renders the `/` separator visually lighter/smaller than the two numbers flanking it (both numbers keep the existing `.stats-header-num` size/weight — this is a font-size/opacity tweak on the separator only, not a new number style). Tile count stays at 6; no other header tile changes.

## Testing

- Ear Training: seed `mpr_weights_ear` with pre-fix bare-label data (e.g. `{types: {Major: {...}}}`), load the page, confirm it's reset to `{}` on init and the reset persists (reload again, confirm it stays empty rather than re-triggering). Seed post-fix prefixed data for a chord `'Major'` and a scale `'Major'` with different EMAs, confirm both render as separate "Major" rows in Recognition Types with their own distinct values (not merged). Confirm `weightedPickEar` actually reads back weighted data correctly post-fix (a category with strongly weighted-slow data gets picked more often than uniform baseline over many trials, or more simply: confirm the composite lookup key used by `weightedPickEar` matches the composite key used by `recordEarResult` for the same category/label pair).
- Sort order: seed a "building" entry (count=2) with a worse EMA than a "confirmed" entry (count=10), confirm the confirmed entry still renders first.
- Focus on These: seed `adaptWeights` with roots/types data but zero combos ≥3 samples, confirm the panel doesn't render at all (not even an empty-state message).
- Section rename: confirm the rendered HTML contains "Voicings" and not "Inversions" anywhere in the Playing tab.
- Section order: confirm the six section markers appear in the new order within the rendered HTML string.
- Header tile: confirm the tile's rendered text contains both the today and 30-day numbers, and that `.stats-header-num-sep` wraps only the `/` character.
- Full regression: existing stats-related tests (if any exist covering `renderStats`/`renderEarStats`) must still pass; run the project's broader `.cjs` suite relevant to stats/adaptive-weights.
