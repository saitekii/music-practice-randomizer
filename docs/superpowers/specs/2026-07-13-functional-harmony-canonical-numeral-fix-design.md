# Functional Harmony Canonical-Numeral Bug Fix + Random Numerals Drill Mode

**Goal:** Fix a severe, pre-existing bug where every Functional Harmony Learning Path stage (including the new "Play Your First Song" teaser) serves mostly-wrong content — random bare numerals in a random mode, ignoring the stage's intended scope. Add a new opt-in "Random Numerals" drill mode as a related, deliberate feature.

## Background

Found via user bug report on "Play Your First Song" (configured for C-major `I–IV–V` only): the app showed "Key: C minor, Play: ii°". Root-caused via systematic-debugging and confirmed empirically (200-prompt live simulation: only 6% of prompts were the intended `I–IV–V`; the rest were random bare numerals across both modes).

**Two compounding root causes in `genFunctional()` (script.js):**

1. `const isMinor = Math.random() < 0.5;` — an unconditional coin-flip between Major and minor mode, run *before* checking whether either mode has any enabled content for the current context.
2. `CANONICAL_FUNCTIONAL_NUMERALS` (`{major: ['I','ii','iii','IV','V','vi','vii°'], minor: ['i','ii°','III','iv','V','VI','VII']}`) causes `checkboxGatedPatterns()` and `enabledProgressions()` to treat these 7-per-mode bare numerals as *always available regardless of checkbox state* — a design decision from before the Learning Path's per-stage content restriction existed. `applyStage()` has no way to override this: no Learning Path stage can ever fully restrict Functional Harmony content, because the canonical numerals always leak into the pool.

This predates all recent work — it's been present since canonical numerals were first made "never filtered," before per-stage progression restriction was built. It affects every `catFunctional` Learning Path stage (the 3 new "First Progressions" stages and likely all 26 stages in the late "Functional harmony" phase), plus free-play/Shuffle Settings.

**Investigation found one more thing the fix must account for**: the Learning Path stage `"Functional Harmony — C"` (hint: "I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C") depends *entirely* on the current bypass — it sets `progressions: []` specifically so nothing but the always-on canonical numerals is playable. Fixing the bypass without updating this stage would silently break it (leave it with nothing playable).

**And a collision check found**: of the 14 canonical-numeral strings, exactly 3 (minor's `III`, `iv`, `VI`) are identical strings to pre-existing, unchecked-by-default major-mode borrowed-chord checkboxes (different chords — e.g. major's borrowed `III` is a raised/chromatic mediant, offset 4; minor's canonical `III` is the native relative-major mediant, offset 3). Reusing those checkboxes would couple two unrelated musical concepts to one toggle and force a default-state conflict. Decision: give all 14 canonical numerals **distinct**, mode-qualified checkbox identifiers — none reuse an existing checkbox — preserving the existing borrowed-chord checkboxes' current behavior untouched.

## Design

### Fix 1: Canonical numerals become real, checkbox-gated content

14 new checkboxes in the `functionalOptions` settings panel, one per canonical numeral per mode, all **checked by default**. Each gets a distinct `data-pattern` value that can never collide with any existing or future pattern string — mirroring the `category:pattern` prefixing scheme already proven in the recent adaptive-weights collision fix (e.g. `chord:Major` vs `scale:Major`). Proposed format: `major:I`, `major:ii`, ..., `minor:i`, `minor:ii°`, ..., `minor:III`, `minor:iv`, `minor:VI` (the 3 that would otherwise collide) — all 14 follow the identical `${mode}:${numeral}` scheme for consistency, not just the 3 colliding ones.

`checkboxGatedPatterns()` stops excluding `CANONICAL_FUNCTIONAL_NUMERALS` entries — they become part of its returned list, using their new `${mode}:${numeral}` identifiers (not the bare numeral string, since the bare string is what's used elsewhere for chord resolution — see Fix 1's interface note below).

`enabledProgressions(mode)` stops special-casing canonical membership — every pattern (canonical or not) is now resolved to its correct checkbox and checked normally. For canonical entries, the checkbox lookup uses the mode-qualified identifier; for everything else, the lookup is unchanged (bare pattern string).

**Interface note, load-bearing for correctness**: the mode-qualified identifier (`major:I`) is a *DOM lookup key only* — it never appears in `FUNCTIONAL.major`/`FUNCTIONAL.minor` arrays, `stage.progressions` fields, or anywhere `getExpectedPCs()`'s numeral-parsing logic operates. Those all continue to use the bare numeral string (`'I'`, `'ii°'`, etc.) exactly as today. Only the checkbox-existence-and-state lookup needs mode-awareness; the musical resolution logic is completely unaffected.

`applyStage()`, `saveSettings()`, `loadSettings()` all currently resolve a pattern's checkbox via a mode-blind `document.querySelector('input[data-pattern="${p}"]')`. Since `checkboxGatedPatterns()` will now return mode-qualified identifiers for the 14 canonical entries, these three functions' existing bare-lookup loops will work correctly with **zero changes** to their own logic — they already just iterate whatever `checkboxGatedPatterns()` gives them and look up that exact string. The mode-qualification is entirely encapsulated inside `checkboxGatedPatterns()`'s and `enabledProgressions()`'s output.

### Fix 2: Mode selection only considers modes with enabled content

`genFunctional()`'s `isMinor = Math.random() < 0.5` becomes: compute `enabledProgressions('major')` and `enabledProgressions('minor')` first, build a list of eligible modes (non-empty pattern list), and randomly pick among only the eligible ones. If both are empty, return `null` — same fail-safe pattern the rest of this resolver already uses.

### Fix 3: "Functional Harmony — C" stage updated

`progressions: []` → `progressions: ['I','ii','iii','IV','V','vi','vii°']` (bare numeral strings — `stage.progressions` never uses the mode-qualified checkbox identifiers, per the interface note above). Combined with Fix 2, this stage becomes reliably Major-only, exactly the 7 numerals its hint already promises.

### Fix 4: "Random Numerals (intense drill)" — new opt-in free-play toggle

One new checkbox in the Functional Harmony settings panel, off by default, not referenced by any Learning Path stage's data (a pure free-play/Shuffle-Settings feature). When checked, `genFunctional()` restricts its candidate pool to single-numeral entries only (patterns with no `–` in them) before picking — still fully respecting whichever individual numeral checkboxes are checked (this mode changes *how* prompts are picked, not *which* numerals are eligible). No progressions are ever generated while this toggle is on.

## Testing

- Empirically verify the exact bug scenario is fixed: apply "Play Your First Song" (or any narrowly-scoped `catFunctional` stage), run `genFunctional()` many times, confirm 100% of results are within the stage's configured `progressions` list (statistical/exhaustive check, not a single sample — this is exactly the kind of claim that needs the live-simulation verification technique already used elsewhere in this session, not a hand-traced assertion).
- Confirm "Functional Harmony — C" reliably produces only Major-mode, C-key, one of the 7 canonical numerals across many trials — zero minor-mode results.
- Confirm the 3 collision-risk tokens (minor's `III`/`iv`/`VI`) resolve to genuinely separate checkboxes from major's existing borrowed-chord `III`/`iv`/`VI` — toggling one must not affect the other's checked state or the other mode's `enabledProgressions()` output.
- Confirm existing borrowed-chord `III`/`iv`/`VI` checkboxes keep their current unchecked-by-default state — this fix must not change that.
- Confirm all 14 new canonical checkboxes default to checked, and `saveSettings()`/`loadSettings()` correctly persist/restore their state with no code changes to those two functions (per the interface note).
- Confirm `applyStage()` on a stage with an explicit `progressions: []` (if any other stage besides "Functional Harmony — C" relies on this, audit for it) now correctly disables all Functional Harmony content, including canonical numerals, rather than silently leaving them enabled.
- Confirm the "Random Numerals" toggle: with it on, `genFunctional()` never returns a multi-step progression, only ever single-numeral prompts, drawn only from currently-checked individual numeral checkboxes.
- Regression: existing multi-chord/borrowed/jazz-extended progression content (everything already checkbox-gated today) is completely unaffected — same checked/unchecked defaults, same `enabledProgressions()` behavior for non-canonical patterns.
- Full regression sweep across every existing Functional-Harmony-adjacent test file in the repo (`test-borrowed-checkbox-gating.cjs`, `test-progression-filtering.cjs`, `test-progression-curriculum-fix.cjs`, `test-progression-learning-path.cjs`, `test-borrowed-chords-content.cjs`, `test-jazz-progressions-content.cjs`, `test-secondary-dominant-content.cjs`, `test-chord-progressions.cjs`, `test-first-progressions.cjs`, and others touching `LEARNING_PATH`/`catFunctional` stages) — several of these assert the *current* "canonical numerals are never filtered" behavior by name and will need their assertions rewritten to match the new, correct behavior; this is expected, necessary fallout, not a sign of a wrong fix.
