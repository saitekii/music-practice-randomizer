# Tonal.js integration + jazz-extended chord progressions

## Problem

Two of the four remaining deferred progression tiers ([[chord-progressions-learning-path-deferred]]) — inline chord-quality overrides (`maj7`, `m9`, `13sus`, etc.) and slash-chord/pedal-point notation — kept requiring more and more hand-built lookup tables to extend (see the `FUNCTIONAL_NUMERALS` work from the borrowed-chords tier). A spike validated that [Tonal.js](https://github.com/tonaljs/tonal), a mature music-theory library, handles arbitrary chord-symbol parsing (extensions, alterations, sus variants, slash-chord bass notation) directly, and can be loaded without a build step. This spec turns that validated spike into the real feature: introduce Tonal.js as the app's first-ever external dependency, and ship a batch of jazz-extended progressions sourced from `Modern Harmony Reference.md` (which superseded and replaced `progressions.md` as the working reference during this design pass).

## Content scope

Cross-referenced the current `Modern Harmony Reference.md` against everything already shipped. Most of the file's "Diatonic Progressions" and much of "Harmonic Devices" turned out to be exact duplicates of already-shipped borrowed-chord-tier content (same roman-numeral skeleton, no quality suffix) — deduplicated those out. What's left: **31 new progressions**, all major-key (the file's earlier minor-key jazz content was removed during the user's own cleanup pass).

- **Section 1 (Diatonic Progressions):** 1 new — `I–VI7–ii–V`
- **Section 2 (Jazz & Extended Harmony):** 18 new — 7th/9th/13th/altered-dominant extensions on already-familiar roman-numeral skeletons
- **Section 3 (Harmonic Devices):** 10 new — Circle of Fifths, secondary-dominant-as-borrowed-chord entries, deceptive cadences, tritone substitution, and one entry needing new `ø` (half-diminished) symbol support
- **Lydian Color's "Common progressions" subsection:** 2 new (the rest of Section 4 is reference/vocabulary material, explicitly out of scope for this pass — see below)

**Full list (all major key):**

`I–VI7–ii–V`, `Imaj7–iii7–vi7–ii7–V7`, `iii7–vi7–ii7–V7–Imaj7`, `vi7–ii7–V7–Imaj7`, `Imaj7–VI7–ii7–V7`, `Imaj7–vi7–IVmaj7–V13`, `vi9–V13–Imaj9–IVmaj9`, `ii9–V13–Imaj9`, `IVmaj7–V7–iii7–vi7–ii7–V7`, `Imaj7–IVmaj7–ii7–V13`, `Imaj7–iii7–IVmaj7–iv7`, `Imaj7–♭VIImaj7–IVmaj7`, `Imaj9–VI7–ii9–V13`, `Imaj9–VI13–ii11–V13`, `Imaj9–♯IV°7–ii9–V13`, `Imaj7–IIImaj7–vi9–IVmaj7`, `Imaj9–♭IImaj7–vi11–V13♯11`, `Imaj9–♭IIImaj7–IVmaj9–iv7`, `Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13`, `I–III7–vi–II7–ii–V–I`, `iii–VI7–ii–V–I`, `vi–II7–ii–V–I`, `I–III7–vi`, `vi–II7–V`, `V–vi`, `V–IV`, `ii–♭II7–I`, `♭II7–I`, `Imaj7–viiø7–iii7–vi7`, `Imaj7♯11–IImaj7`, `Imaj7♯11–♭VIImaj7`

**Out of scope for this pass** (unchanged from the original deferred-tier boundaries):
- `V/vi`/`V/V` secondary-dominant slash notation (1 entry: `I→V/vi→vi→V/V→ii→V`) — still needs its own interpretation logic, not just quality parsing.
- "Bass line: 1 → 7 → 6 → 5" — describes a bass motion concept, not a concrete chord progression; not actionable.
- All of Section 4 ("Voicing & Arrangement Concepts") except the 2 Lydian progressions above — Pedal Point, Common/Upper-Structure Slash Chords, Quartal Harmony, Constant Structure, and the bare chord-quality-name glossaries are reference/vocabulary material for future feature ideas (e.g. an alternate voicing mode), not ready-to-parse progressions.

## Design

### 1. Vendor Tonal.js locally (not a live CDN dependency)

This app is a fully offline-capable static site (`file://` friendly, no network calls anywhere today — not even in the test suite). A live CDN `<script src="https://cdn.jsdelivr.net/...">` would make both the shipped app and every functional-harmony test silently depend on network availability, which regresses that property. Instead: download Tonal's minified browser build (~31KB) once and check it into the repo as `tonal.min.js` at the root (matching the existing flat-file convention), referenced via a plain relative `<script src="tonal.min.js"></script>` tag in `index.html`, loaded before `script.js`. No build step, no bundler, no `node_modules` — the "no build step, no framework, no dependencies" architecture note in `CLAUDE.md` needs a small update to reflect this first-ever dependency and where it's vendored.

### 2. New numeral+quality-suffix resolution, layered on top of the existing resolver

`getExpectedPCs()`'s `func` branch currently does one lookup: `FUNCTIONAL_NUMERALS[modeKey][numeral]`. That stays exactly as-is for all ~110 existing bare-numeral tokens (fast path, zero behavior change). Add a **fallback** for when that lookup misses: split the token into a base numeral (e.g. `I`, `♭II`, `♯IV`, `vii`) and a quality suffix (e.g. `maj7`, `13sus`, `ø7`, `♯11`), resolve the base numeral's semitone offset from the *same* `FUNCTIONAL_NUMERALS` table (reusing its offset half only, ignoring the stored default quality — a numeral with an explicit suffix always has its quality overridden by that suffix), then resolve the actual chord via Tonal:

```js
const jazzMatch = numeral.match(/^(♭|♯)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°|ø)?(.+)$/);
if (jazzMatch) {
  const accLetters   = (jazzMatch[1] || '') + jazzMatch[2];
  const degreeMarker = jazzMatch[3] || '';
  const suffix       = jazzMatch[4];
  const isUpper      = jazzMatch[2] === jazzMatch[2].toUpperCase();
  const baseEntry = FUNCTIONAL_NUMERALS[modeKey][accLetters] || FUNCTIONAL_NUMERALS[modeKey][accLetters + '°'];
  if (baseEntry) {
    const rootNote = NOTES[(rootIdx + baseEntry[0]) % 12];
    const quality = resolveJazzQuality(degreeMarker, isUpper, suffix);
    const chord = Tonal.Chord.getChord(quality, rootNote);
    if (chord && !chord.empty && chord.notes.length) {
      return { type: 'chord', pcs: chord.notes.map(n => Tonal.Note.chroma(n)) };
    }
  }
}
```

**Found and fixed two bugs while verifying this against every token the batch actually uses** (not just the happy-path cases from the earlier spike): the degree-marker capture only recognized `°` (fully-diminished), not `ø` (half-diminished — a different Unicode character), so `viiø7` failed to split at all; and `♯IV°7`'s base numeral doesn't exist as a combined `♯IV°` key in the table (the table's existing `vii°`/`ii°` entries bake the degree symbol into the key itself, an existing inconsistency, not something to repeat for the new `♯IV` entry). Fixed by separating the degree marker from the numeral-letters lookup entirely — look up the accidental+letters form first (e.g. `♯IV`), fall back to that form with `°` appended (catches `vii`/`ii` which are only stored in `°`-suffixed form) — and resolving quality from the degree marker directly rather than from string-matching the combined base. Verified against all 21 distinct numeral tokens the 31-entry batch uses, plus two end-to-end pitch checks (`viiø7` in C major → B-D-F-A; `♯IV°7` in C major → F♯-A-C-E♭, both hand-confirmed correct).

`Tonal.Note.chroma()` converts Tonal's returned note names straight to the app's 0–11 pitch-class numbering, so there's no enharmonic-spelling reconciliation needed against the app's own `NOTES` array — verified directly (F♯ half-diminished → chromas `[6, 9, 0, 4]`, matching hand-computed values).

`resolveJazzQuality(degreeMarker, isUpper, suffix)` — the suffix-to-Tonal-quality mapping, built and verified against every quality this batch actually uses (`maj7`, `maj9`, `m7`, `m9`, `m11`, `7`, `9`, `13`, `13#11`, `m7b5`, `dim7`, `maj7#11`):
- `degreeMarker` is `ø` and `suffix` is exactly `7` (the only half-diminished form this batch uses): `m7b5`.
- `degreeMarker` is `°` and `suffix` is exactly `7` (fully diminished 7th, e.g. `♯IV°7`): `dim7`.
- `suffix` is a bare number optionally followed by `sus`/`sus4`/`sus2` (e.g. `7`, `9`, `13`): case-sensitive — `isUpper` true → dominant extension (`7`, `9`, `13` as Tonal quality strings directly), `isUpper` false → minor extension (prefix `m`: `m7`, `m9`, `m11`).
- Otherwise (an explicit spelled-out quality: `maj7`, `maj9`, `maj7♯11`, `13♯11`): use the suffix directly as the Tonal quality string, converting `♯`→`#` and `♭`→`b` first (Tonal expects ASCII accidentals).

New offset-table entry needed: `♯IV` (6 semitones) — added to `FUNCTIONAL_NUMERALS.major` alongside the existing borrowed/mediant entries from the prior tier, stored as a bare key (no `°` suffix — unlike `vii°`, this is a fresh entry with no pre-existing bare-vs-suffixed inconsistency to match, and the bare-first lookup order above resolves it directly).

### 3. Data and checkboxes

31 new `FUNCTIONAL.major` entries, each with its own `data-pattern` checkbox in the existing `functionalOptions` panel, **unchecked by default** (same convention as every prior batch). No new standalone single-chord entries needed this round — every item in this batch is a 2+ chord progression.

### 4. Learning Path — 4 new stages, light-touch (per the key-ramp audit's now-established template)

Inserted after `'Minor Borrowed — ♭II'` (the last stage of the borrowed-chords tier) and before `'Functional, Nat. Keys'`. All C-only, `timer: 'off'`, no dedicated key-ramp stage of their own — consistent with the principle just established in the key-ramp audit (key-fluency is long since built by this point in the path; `'Functional, Nat. Keys'`/`'Functional, All 12'` already auto-include everything once it exists in `FUNCTIONAL`, no explicit ramp stage needed).

1. **Jazz 7th Chords** (8): `I–VI7–ii–V`, `Imaj7–iii7–vi7–ii7–V7`, `iii7–vi7–ii7–V7–Imaj7`, `vi7–ii7–V7–Imaj7`, `Imaj7–VI7–ii7–V7`, `Imaj7–vi7–IVmaj7–V13`, `vi9–V13–Imaj9–IVmaj9`, `ii9–V13–Imaj9`
2. **Extended 9ths, 11ths & 13ths** (11): `IVmaj7–V7–iii7–vi7–ii7–V7`, `Imaj7–IVmaj7–ii7–V13`, `Imaj7–iii7–IVmaj7–iv7`, `Imaj7–♭VIImaj7–IVmaj7`, `Imaj9–VI7–ii9–V13`, `Imaj9–VI13–ii11–V13`, `Imaj9–♯IV°7–ii9–V13`, `Imaj7–IIImaj7–vi9–IVmaj7`, `Imaj9–♭IImaj7–vi11–V13♯11`, `Imaj9–♭IIImaj7–IVmaj9–iv7`, `Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13`
3. **Circle of Fifths & Applied Chords** (7): `I–III7–vi–II7–ii–V–I`, `iii–VI7–ii–V–I`, `vi–II7–ii–V–I`, `I–III7–vi`, `vi–II7–V`, `ii–♭II7–I`, `♭II7–I`
4. **Cadences & Color Chords** (5): `V–vi`, `V–IV`, `Imaj7–viiø7–iii7–vi7`, `Imaj7♯11–IImaj7`, `Imaj7♯11–♭VIImaj7`

Each stage's `progressions` array is cumulative (stage 4's array is all 95 existing progressions plus all 31 new ones), matching the pattern used by every prior tier.

### Testing

- Tonal loads correctly from the vendored local file (not network-dependent) — a test asserting `typeof Tonal !== 'undefined'` after page load.
- `resolveJazzQuality()` / the new `getExpectedPCs()` fallback path resolves every distinct quality this batch uses to the correct pitch classes — direct unit-style checks via `getExpectedPCs()`, mirroring how the borrowed-chords tier tested `FUNCTIONAL_NUMERALS`.
- The fast path (existing `FUNCTIONAL_NUMERALS` direct lookup) is provably untouched — a regression check that a sample of existing bare-numeral progressions still resolve identically.
- All 31 new progressions get checkboxes, unchecked by default, existing ones unaffected (same checklist as every prior batch).
- New Learning Path stages: correct adjacency, cumulative counts, `applyStage()` behavior — same pattern as every prior tier's stage tests.
- `LEARNING_PATH_PHASES`'s `'Functional harmony'` count and `LEARNING_PATH.length` total both increase by 4 — updated together in the same task that adds the stages, per the established convention for this recurring staleness pattern.

## Out of scope for this pass

- `V/vi`/`V/V` secondary-dominant slash notation — still needs custom interpretation logic (resolve target root, then build a dominant chord a 5th above it), not just Tonal chord-symbol parsing.
- Slash-chord/pedal-point notation from Section 4 (`Pedal Point`, `Common Slash Chords`, `Upper Structure Slash Chords`) — explicitly deferred as reference/vocabulary material per the user's own scoping decision, not ready-to-parse progressions.
- Quartal harmony, constant-structure chromatic motion, and the bare chord-quality-name glossaries — same reasoning; Section 4 as a whole documents future feature ideas rather than progression content.
- Any change to the numeral-resolution fast path or to any previously-shipped progression, checkbox, or stage.
