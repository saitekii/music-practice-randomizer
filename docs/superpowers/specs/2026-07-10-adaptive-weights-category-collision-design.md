# Adaptive Weights Category-Collision Fix

**Goal:** Fix the Playing tab's chord/scale "Major" data collision in `adaptWeights.types`/`adaptWeights.combos` — the same bug already fixed for Ear Training — plus the `startDrill()`/`findPlayingDrillTarget()` routing quirks in both tabs that stem from the same root cause.

## Background

While fixing the original narrow ask (Ear tab's `startDrill()` mis-routes a scale-Major weak spot to a chord drill), tracing the root cause revealed the identical bug exists in the Playing tab's core adaptive-weights data: `genChord()` and `genScale()` both call `weightedPick(pool, 'types')`, and `recordAdaptiveResult()` writes both into `adaptWeights.types`/`adaptWeights.combos` keyed by bare label. Since `CHORD_TYPES` and `SCALE_TYPES` both define a `'Major'` entry (confirmed the *only* collision across chord/scale/interval/mode label pools via a systematic pairwise check), practicing a C Major chord and a C Major scale today silently merge their response-time stats — mirroring exactly what was fixed for `earAdaptWeights.types` last round, just never applied to `adaptWeights`.

Further tracing found a third dependency: `getStageMastery()` (the Learning Path's mastery-dot/progress-% calculation) also does a direct `adaptWeights.types[bareLabel]` lookup for chord and scale stage items. Any fix to the write-side key format must also update this read site, or every chord/scale-type Learning Path stage would silently show 0% mastered.

`startDrill()`'s non-ear branch (using `findPlayingDrillTarget`) was found to be currently unreachable dead code — the Playing tab's only Drill button always sets `data-combo="true"` (since the "Focus on These" cross-product fallback was removed in the prior stats-popup-redesign round), routing exclusively through `startDrillCombo` instead.

## Decisions

- **No data reset.** Unlike the Ear Training fix, `adaptWeights.types`/`.combos` do NOT get a one-time cleanup. Old bare-label entries (e.g. a pre-fix `'Major'` row) simply stop being written to and coexist with new prefixed entries. This means `getStageMastery()` will read `undefined` for any old-format key it might have matched before — mastery for chord/scale-Major-specific stages effectively resets regardless of "no reset," since the lookup key format itself changes; this was confirmed and the "no reset" choice was reaffirmed with that consequence understood.
- **`findPlayingDrillTarget`'s dead branch is removed**, not kept-but-fixed. `startDrill()` becomes ear-only in practice (its `isEar` parameter is still checked defensively, but the non-ear branch's body is deleted rather than updated to require a category it would never receive).

## Storage: category-prefixed `types`/`combos` keys

`recordAdaptiveResult()`'s chord/scale/interval branches:
- Chord: `updateAdaptWeight('types', parts[2], ms)` → `updateAdaptWeight('types', \`chord:${parts[2]}\`, ms)`; combo: `updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms)` → `updateAdaptWeight('combos', \`${parts[1]}|chord:${parts[2]}\`, ms)`.
- Scale: same pattern with `scale:`.
- Interval: `updateAdaptWeight('types', parts[1], ms)` → `updateAdaptWeight('types', \`interval:${parts[1]}\`, ms)`. Intervals never write to `combos` (confirmed — only chord/scale branches do).

A combo key is therefore `root|` followed by the *same* category-prefixed string used in `types` (e.g. `C|chord:Major`) — not a separately-invented format.

`weightedPick(items, dim, category)` gains an optional third parameter. Internal lookup becomes `g[category ? \`${category}:${item}\` : item]`. Only the three `dim === 'types'` call sites pass a category (`genChord` → `'chord'`, `genScale` → `'scale'`, the interval generator → `'interval'`); the five `dim === 'roots'` call sites are unaffected. `updateAdaptWeight(dim, key, ms)` itself needs no change — it already treats its key as opaque.

`stripEarCategory` is renamed to `stripTypeCategory` (shared by both tabs now — the category vocabulary, `interval|chord|scale`, is identical in both places). An unprefixed (pre-fix) key passes through unchanged, so old orphaned bare-label rows still display correctly, just as a separate, frozen-in-time row.

## Display: `buildSection()`, the Playing-tab weak-spots panel, `getStageMastery()`

- `buildSection()`'s row template applies `stripTypeCategory(key)` to the displayed key text — mirrors the already-shipped `buildEarSection()` fix exactly.
- The Playing-tab weak-spots panel's combo row: `data-type` keeps the **raw** `root|category:type` key (needed by `startDrillCombo` to route correctly). The **displayed name** parses the same way `startDrillCombo` does — split on the first `|`, strip the category off the type half via `stripTypeCategory` — so it reads "C Major", not "C chord:Major".
- `getStageMastery()` (script.js:2879, 2884): `items.push({ dim: 'types', key: ct.label })` → `key: \`chord:${ct.label}\`` for chord stage items; `key: st.label` → `key: \`scale:${st.label}\`` for scale stage items. Intervals aren't part of stage-mastery tracking today (no `stage.intervals` handling exists in this function), so no interval-side change is needed here.

## Drill routing: both tabs

- `findPlayingDrillTarget(label, category)` — rewritten to dispatch directly by category (`'chord'` → search `CHORD_TYPES`; `'scale'` → search `SCALE_TYPES` then `MODES`; `'interval'` → search `INTERVALS`) instead of an ordered guess-chain. No collision is possible regardless of future label overlaps, since category is now ground truth, not inferred.
- `startDrillCombo(comboKey)` — parses the prefixed combo key (`root|category:type`) to extract root, category, and bare type; passes category into `findPlayingDrillTarget`.
- `startDrill(typeLabel, isEar)` — the non-ear branch (dead code, confirmed unreachable via the only Playing-tab `.drill-btn` always setting `data-combo="true"`) is deleted. The function becomes ear-only in practice; `isEar` is still checked (`if (!isEar) return;` as a defensive guard) rather than assumed.
- **The original ask, closing the loop**: the Ear tab's weak-spots row's `data-type` keeps the raw `category:label` key (same pattern as the Playing-tab combo fix); `startDrill`'s ear branch parses category directly from it instead of scanning `EAR_INT_MAP`/`EAR_CHORD_MAP`/`EAR_SCALE_MAP` in a fixed order. The *displayed* weak-spot name still strips the prefix via `stripTypeCategory` for readability. `buildEarSection`'s existing `stripEarCategory(key)` call is renamed to `stripTypeCategory(key)` (same function, new shared name) — no behavior change there, just the rename.

## Testing

- Storage: seed a chord-Major and a scale-Major answer via `recordAdaptiveResult`, confirm they land in `adaptWeights.types['chord:Major']` / `['scale:Major']` as distinct entries, and `adaptWeights.combos['C|chord:Major']` / `['C|scale:Major']` as distinct entries.
- `weightedPick`: confirm chord/scale/interval generation reads back its own category-scoped weight (statistical trial, same technique used for `weightedPickEar`'s equivalent test).
- Display: render `renderStats()` with both a chord-Major and scale-Major entry seeded, confirm two separate "Major" rows appear in the Types section (not merged) and the weak-spots panel (if either qualifies) shows the correctly-stripped display name.
- `getStageMastery()`: seed a chord-Major entry meeting the mastery threshold, confirm a stage whose `chords` includes chord-Major's id reports it mastered; confirm a stage whose `scales` includes scale-Major's id does NOT report mastery from the chord-side data (proving the two are genuinely independent, not accidentally still merged).
- Drill routing: seed a scale-Major weak spot (Playing tab combo AND Ear tab), click/trigger its Drill button, confirm the resulting checkbox state selects the scale category (not chord) in both tabs.
- Regression: confirm root-note weighting (`weightedPick(..., 'roots')`, 5 call sites) is completely unaffected — no category threading, same behavior as before.
- Old bare-label data: seed a pre-fix bare `'Major'` entry in `adaptWeights.types` alongside a new `'chord:Major'` entry, confirm both render as separate rows (no crash, no silent merge, no data loss) — proving the "no reset" choice degrades gracefully rather than breaking.
