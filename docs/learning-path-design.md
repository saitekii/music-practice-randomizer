# Learning Path Design

This is the living reference for *why* the Learning Path looks the way it does — not just what's in `LEARNING_PATH`/`LEARNING_PATH_PHASES` (script.js), but the reasoning behind the ordering, the recurring design rules the path tries to follow, and the open issues that haven't been fixed yet.

**Maintenance rule:** whenever a plan adds, removes, reorders, or renames a stage or phase, update this doc as part of that same plan/commit — the same discipline already applied to keeping `LEARNING_PATH_PHASES` counts in sync with `LEARNING_PATH.length`. A stale version of this doc is worse than no doc; don't let it drift.

As of 2026-07-13: **136 stages across 21 phases.**

## How the mechanism works (for context on everything below)

- `LEARNING_PATH` is a flat array of stage objects: `{ name, hint, cats, notes, chords, scales, progressions, timer, ... }`. `applyStage(idx)` wipes every category/chord-type/scale-type/root-note/progression checkbox, then sets only what the stage specifies, plus the timer value.
- `LEARNING_PATH_PHASES` is a separate `{name, count}` array, sequential over `LEARNING_PATH` — a phase's stages are just the next `count` entries. This is deliberately *not* a per-stage `phase` field: inserting a stage only requires bumping one phase's `count`, not touching every stage object after the insertion point.
- Stage position is persisted in `mpr_learning_stage` in localStorage **by stage name**, not array index (fixed 2026-07-09 — index-based persistence silently shifted every learner's saved position on any insertion before that point). Stage names must stay unique across the whole array; several rounds have had to pick non-obvious names specifically to avoid colliding with an existing stage teaching the same content at a different curriculum position (e.g. `'Play Your First Song'` vs. the later `'Progression: I–IV–V'`).
- Shuffle Settings (free play) exits the Learning Path entirely — none of this reasoning applies there.

## Recurring design rules

These aren't enforced by code — they're patterns that emerged from two audit rounds and a written critique review, and are the standard new stages should be checked against:

1. **One new axis of difficulty per stage.** The axes are: new content (a chord/scale/numeral type), more keys, a timer, or combining two previously-separate categories. A stage should add at most one. ("Add Dim & Aug" and a few others below violate this — tracked as open issues.)
2. **New content gets a single-key, untimed intro before any key-ramp or timer.** Established pattern: `Meet X` (C only) → `X, Nat. Keys` (7 keys) → `X, All 12` (+ timer). A few older stages predate this pattern and skip the C-only step (see Open Issues).
3. **Key ramp before timer, not simultaneously.** The critique's most-repeated finding: several sections jump from "7 keys, untimed" straight to "12 keys + timer" in one step. Where this has been fixed (progressions, the broader stage audit's 7 additions), an untimed 12-key stage sits between them.
4. **Once key fluency is well-established elsewhere in the path, later phases don't need their own granular key ramp.** Used deliberately in the borrowed-chords/jazz-extension phase 18 content (2-stage ramp, not the original 5-stage one) and when trimming the second audit round's redundant ramps — by phase 15+, a learner has already drilled all 12 keys many times over in earlier phases.
5. **A stage's `progressions`/`chords`/`scales` fields should always be explicit**, never rely on the `?? ALL_X` backward-compatibility fallback for a stage that's supposed to be restrictive — this exact bug (`'Functional Harmony — C'` silently unlocking all 26 progressions early) shipped once already.
6. **A phase that introduces a new skill or element should be followed by a small progression-practice phase exercising that specific skill, where practical** — added 2026-07-13, from the user's own observation after "Two-Handed Progressions" shipped. Reuses the existing progression-generation mechanism (already fully key-agnostic and already supports combining with `leftHandMode`/`functionalRequireInversions`) rather than needing new code each time — the value is in the curriculum touchpoint, not new mechanism. Not retroactive to every phase automatically; each application gets its own scoped design pass. See the open-issues list below for which phases are flagged as candidates and which are already shipped or in progress.

**Reading the stage tables below:** "Keys" is the enabled root notes (or, for Diatonic Chords stages, the single key the by-key explorer is set to — that phase ignores the root-note checkboxes entirely, per the Root Notes vs. Diatonic gotcha in `CLAUDE.md`). "Content" lists enabled chord types / scale types / progressions (`+` joins categories combined in one stage); `(inv)` = inversions on, `(LH)` = Left-Hand mode on. "N progressions" abbreviates a progression list once a stage enables more than 10 of them (the full lists are long and additive — each stage in a cumulative run enables everything the previous one did, plus one more). "all progressions (no restriction)" marks a stage with no `progressions` field at all, falling back to every progression via `applyStage()`'s backward-compatibility default (see rule 5 below) — this is intentional for those specific stages, not the bug rule 5 warns about.

## Phase-by-phase

### 1. Note Finder (7 stages)
`Find C → C and D → Add E → Add F → Add G → Add A → All Natural Notes`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Find C | C | — | off |
| C and D | C,D | — | off |
| Add E | C,D,E | — | off |
| Add F | C,D,E,F | — | off |
| Add G | C,D,E,F,G | — | off |
| Add A | C,D,E,F,G,A | — | off |
| All Natural Notes | 7 naturals | — | off |

Bare note-name recognition, no chords yet. One natural note added per stage, all untimed. The obvious, uncontroversial starting point — never flagged by any audit.

### 2. Major chords, natural keys, no timer (7 stages)
`First Chord → Two Chords → Three Chords → Add D Major → Add A Major → Add E Major → All Natural Majors`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| First Chord | C | Major | off |
| Two Chords | C,G | Major | off |
| Three Chords | C,F,G | Major | off |
| Add D Major | C,D,F,G | Major | off |
| Add A Major | C,D,F,G,A | Major | off |
| Add E Major | C,D,E,F,G,A | Major | off |
| All Natural Majors | 7 naturals | Major | off |

First chord content. `Three Chords` (C/F/G) is load-bearing for Phase 4 below — it's the exact chord set `I–IV–V` needs.

### 3. Introduce minor (3 stages)
`First Minor → More Minors → All Natural Minor`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| First Minor | C,A | Major, Minor | off |
| More Minors | C,D,E,F,G,A | Major, Minor | off |
| All Natural Minor | 7 naturals | Major, Minor | off |

### 4. First Progressions (3 stages) — added 2026-07-13
`Play Your First Song → Add a Turnaround → Four Chord Song`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Play Your First Song | C | I–IV–V | off |
| Add a Turnaround | C | I–IV–V, IV–V–I | off |
| Four Chord Song | C | I–IV–V, IV–V–I, I–V–vi–IV | off |

Added directly in response to the critique's strongest single point: a learner previously had to get through inversions, sevenths, extended chords, borrowed chords, and every scale (~80 stages) before ever stringing chords into something song-like. This phase reuses `I–IV–V`, `IV–V–I`, `I–V–vi–IV` — progressions built entirely from chords already taught by Phase 2/3, no new theory. `vi` needs minor, hence placement right after Phase 3, not right after Phase 2.

**Explicitly not** a "strip the roman numerals" simplification — the critique suggested framing this as note names only ("now play C, F, G"), but the user pushed back: *"I feel like the roman numerals are almost the whole point... you have to practice recalling what is the IV in the key of D major."* Numerals stayed; only the curriculum position moved. The existing late-phase progression stages (Phase 19) are untouched and still serve as the generalization layer once 7ths/borrowed/secondary-dominant content exists.

Building and testing this phase is also what surfaced a severe, unrelated, **pre-existing** bug — see [Functional harmony](#19-functional-harmony-26-stages) and the "canonical numerals" note below.

**Partially fixed 2026-07-13 (was: "progression silence" open issue):** after this phase, progressions used to go untouched for 71 stages until Phase 19 picked the concept back up. Two new phases — "Progressions, Inverted" (Phase 9) and "Two-Handed Progressions" (Phase 10), directly adjacent with zero gap between them — now give progressions a mid-path touchpoint, splitting that single 71-stage silence into a 23-stage gap (here → Phase 9) and a 47-stage gap (Phase 10 → Phase 19) — not a full fix, since the total silence is barely reduced (23+47=70 vs. 71), but the concept no longer goes a full two-thirds of the path without resurfacing at all.

### 5. Add timer pressure (3 stages)
`Add a Timer (15s) → A Bit Faster (10s) → Faster Still (5s)`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Add a Timer | 7 naturals | Major, Minor | 15s |
| A Bit Faster | 7 naturals | Major, Minor | 10s |
| Faster Still | 7 naturals | Major, Minor | 5s |

First timer introduction, chords only, no new content — a clean single-axis stage per the recurring rule.

### 6. Accidentals one at a time (6 stages)
`Add F♯ → Add B♭ → Add E♭ → Add A♭ → Add C♯ → Speed Up`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Add F♯ | C,D,E,F,F#,G,A,B | Major, Minor | 10s |
| Add B♭ | C,D,E,F,F#,G,A,Bb,B | Major, Minor | 10s |
| Add E♭ | C,D,Eb,E,F,F#,G,A,Bb,B | Major, Minor | 10s |
| Add A♭ | C,D,Eb,E,F,F#,G,Ab,A,Bb,B | Major, Minor | 10s |
| Add C♯ | All 12 | Major, Minor | 10s |
| Speed Up | All 12 | Major, Minor | 5s |

Critique item: reordering enharmonics (Phase 17 today) to sit right after this phase would make these accidental-heavy stages easier, since F♯/G♭ equivalence would already be known. **Not yet done** — see Open Issues.

### 7. Left-Hand Voicing (6 stages)
`Left Hand Shape → Meet Left Hand → Left Hand, Nat. Keys → Add Minor, Left Hand → Left Hand Timer → Left Hand, All 12`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Left Hand Shape | C | Root+5th | off |
| Meet Left Hand | C | Major, (LH) | off |
| Left Hand, Nat. Keys | 7 naturals | Major, (LH) | off |
| Add Minor, Left Hand | 7 naturals | Major, Minor, (LH) | off |
| Left Hand Timer | 7 naturals | Major, Minor, (LH) | 15s |
| Left Hand, All 12 | All 12 | Major, Minor, (LH) | 10s |

Teaches the two-handed Major/minor root-position voicing feature (left hand = root+5th below middle C, right hand = full chord at/above middle C). `Left Hand Shape` (added 2026-07-13, single-key/no-right-hand) exists specifically because the critique flagged that combining "new left-hand shape" with "coordinate two hands simultaneously" in one step skips isolating hand-independence — the actual new skill — from note-finding.

**Still critique-flagged, not fixed:** this phase comes after a learner has already drilled the right hand alone through 30+ stages (inversions, sevenths). If two-handed play is core to what the app teaches, the critique argues for a parallel early track starting around "First Chord" instead of a post-mastery bolt-on. Left unresolved — a bigger restructure than the warmup-stage fix, deliberately deferred. See [[left-hand-mode-deferred]] for the feature's full architecture (deliberately open for real per-inversion voicings and other chord types later — the current root+5th shape does not generalize past Major/Minor root position).

**Open issue (no recurrence):** distinct from the placement issue above — even leaving timing alone, Left-Hand mode appears in exactly these 5 stages and never again across the remaining 96. If two-handed play matters to the product, it's odd that it's a one-time detour rather than something that resurfaces later (e.g. a left-hand variant folded into the Phase 8 inversions or Phase 13-14 seventh-chord content). Not yet done.

### 8. Triad inversions (10 stages)
`Meet Inversions → Natural Majors Inv. → Add Minor Inversions → Inversion Timer → Inversions, 10 Sec → All 12, Inverted → Meet Diminished → Meet Augmented → Add Dim & Aug → Triad Mastery`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Meet Inversions | C | Major, (inv) | off |
| Natural Majors Inv. | 7 naturals | Major, (inv) | off |
| Add Minor Inversions | 7 naturals | Major, Minor, (inv) | off |
| Inversion Timer | 7 naturals | Major, Minor, (inv) | 15s |
| Inversions, 10 Sec | 7 naturals | Major, Minor, (inv) | 10s |
| All 12, Inverted | All 12 | Major, Minor, (inv) | 10s |
| Meet Diminished | C | Major, Minor, Dim | off |
| Meet Augmented | C | Major, Minor, Dim, Aug | off |
| Add Dim & Aug | All 12 | Major, Minor, Dim, Aug, (inv) | 10s |
| Triad Mastery | All 12 | Major, Minor, Dim, Aug, (inv) | 5s |

**Fixed 2026-07-13 (was: critique's "worst spike in the doc"):** `Add Dim & Aug` used to introduce two brand-new chord qualities simultaneously, at all 12 keys, with inversions on, with a 10-second timer — four difficulty axes at once. `Meet Diminished` → `Meet Augmented` now give each quality its own C-only, untimed, root-position-only intro first — introduced **separately**, not combined into one intro stage (a deliberate pedagogical choice: diminished and augmented triads are the pair a beginner is most likely to confuse with each other, unlike the Half-Dim/Dim7 precedent in Phase 17, which combined its two new qualities into one intro stage since they're more clearly distinct in character). `Add Dim & Aug` and `Triad Mastery` are unchanged — `Add Dim & Aug` now serves as the "combine with inversions + all keys" step rather than a first exposure.

### 9. Progressions, Inverted (3 stages) — added 2026-07-13
`Invert Your First Song → Invert the Turnaround → Four Chords, Inverted`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Invert Your First Song | C | I–IV–V (inversions required) | off |
| Invert the Turnaround | C | I–IV–V, IV–V–I (inversions required) | off |
| Four Chords, Inverted | C | I–IV–V, IV–V–I, I–V–vi–IV (inversions required) | off |

Combines two skills the learner already has by this point — finding the right chords in a progression (Phase 4) and playing a specific inversion (this phase's own preceding 8 stages) — into one. Reuses Phase 4's exact 3 progression strings (`I–IV–V`, `IV–V–I`, `I–V–vi–IV`), now requiring a specific, voice-led inversion per chord instead of accepting any voicing: bass motion is either a held common tone or a step, worked out via real voice-leading reasoning and reviewed by the user before being locked in (see `docs/superpowers/specs/2026-07-13-progressions-with-inversions-design.md` for the full per-chord table and reasoning). A new opt-in `functionalRequireInversions` toggle plus a `PROGRESSION_INVERSIONS` lookup table drive the checking — reusing `getRequiredBassPc()`, `checkMidi()`, and `updateKeyboard()` completely unchanged, since those were already generic on `requiredBassPc` regardless of which prompt type produced it (built originally for this same phase's single-chord inversions).

This phase also gives progressions a mid-path touchpoint, partially closing the "progression silence" gap (see Phase 4's open issue) — silence is now split into a 23-stage gap (Phase 4 → here) and a 47-stage gap (Phase 10 → Phase 19), rather than one unbroken 71-stage stretch. Not a full fix; still tracked as a partial one.

**Built 2026-07-13 (was: "explicitly deferred"):** combining this with Left-Hand mode — the user's stated longer-term direction, raised in the very next conversation turn after this phase shipped. See Phase 10 below.

### 10. Two-Handed Progressions (3 stages) — added 2026-07-13
`Two-Handed First Song → Two-Handed Turnaround → Four Chords, Two Hands`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Two-Handed First Song | C | I–IV–V (inversions required, two hands) | off |
| Two-Handed Turnaround | C | I–IV–V, IV–V–I (inversions required, two hands) | off |
| Four Chords, Two Hands | C | I–IV–V, IV–V–I, I–V–vi–IV (inversions required, two hands) | off |

Reuses the same 3 progressions a third time — root position (Phase 4), single-hand inversions (Phase 9), now two-handed inversions here — combining Phase 9's mechanism with the existing single-chord Left-Hand mode (Phase 7). The right hand plays the required inversion; the left hand plays the *actual* required bass note plus the chord's root, not a fixed root+5th — a deliberate design decision resolving a real conflict in `checkMidi()`'s combined-hands bass check (a fixed-root left hand would always be the overall lowest note, making the right hand's inversion unenforceable). See `docs/superpowers/specs/2026-07-13-two-handed-progressions-design.md` for the full per-step left-hand voicing table and the conflict-avoidance reasoning (`requiredBassPc` is explicitly `null` in this mode; only hand-membership checking applies, mirroring how the pre-existing single-chord Left-Hand mode already avoids the same conflict).

Directly adjacent to Phase 9 with zero stage gap between them — together they form one continuous 6-stage progression-content block roughly a quarter of the way through the path, before the next 47-stage silent stretch to Phase 19.

**Explicitly deferred, not built here:** more complex voicings beyond triads (7ths, extensions). `progressionAllowsLeftHand()` guards this scope explicitly — it only allows hand mode for numerals resolving to plain Major/Minor triads, not a coincidence of current content.

**Minor, non-blocking note from final review:** `leftHandMode` now affects *any* Functional Harmony prompt in free-play, not just these 3 curated progressions — before this phase, Left-Hand mode had no effect on Functional Harmony at all. Coherent behavior, just wasn't explicitly called out as in-scope beforehand.

### 11. Major scales (4 stages)
`First Scale → All Natural Scales → Scale Timer → All 12 Scales`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| First Scale | C | Major | off |
| All Natural Scales | 7 naturals | Major | off |
| Scale Timer | 7 naturals | Major | 15s |
| All 12 Scales | All 12 | Major | 15s |

### 12. Combine chords + scales (3 stages)
`Mix Chords + Scales → All 12 Combined → Add Minor Scale`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Mix Chords + Scales | 7 naturals | Major, Minor, (inv) + Major | 15s |
| All 12 Combined | All 12 | Major, Minor, (inv) + Major | 10s |
| Add Minor Scale | All 12 | Major, Minor, (inv) + Major, Nat Minor | 10s |

**Open issue:** `Mix Chords + Scales` starts timed (15s) — the first time a learner switches between categories mid-drill, itself a new skill (context-switching) independent of speed, per the critique. Suggested fix: an untimed natural-keys combine-step before the existing timed one.

### 13. Seventh chords — root position (4 stages)
`Add Major 7 → Add Minor 7 → Add Dominant 7 → 7ths in All Keys`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Add Major 7 | 7 naturals | Major, Minor, Maj7 + Major, Nat Minor | 10s |
| Add Minor 7 | 7 naturals | Major, Minor, Maj7, Min7 + Major, Nat Minor | 10s |
| Add Dominant 7 | 7 naturals | Major, Minor, Maj7, Min7, Dom7 + Major, Nat Minor | 10s |
| 7ths in All Keys | All 12 | Major, Minor, Maj7, Min7, Dom7 + Major, Nat Minor | 10s |

**Open issue:** same 7-keys-untimed → 12-keys-timed single-step jump the critique flags as the path's most repeated pattern (see rule 3) — no intermediate "12 keys, untimed" rung here yet.

### 14. Seventh chord inversions (5 stages)
`First 7th Inversion → 7th Inv., Nat. Keys → Add Dom 7 Inv. → 7th Inv. Full Mix → 7th Inv. All Keys`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| First 7th Inversion | C | Maj7, (inv) | off |
| 7th Inv., Nat. Keys | 7 naturals | Maj7, Min7, (inv) + Major, Nat Minor | off |
| Add Dom 7 Inv. | 7 naturals | Maj7, Min7, Dom7, (inv) + Major, Nat Minor | 15s |
| 7th Inv. Full Mix | 7 naturals | Major, Minor, Maj7, Min7, Dom7, (inv) + Major, Nat Minor | 15s |
| 7th Inv. All Keys | All 12 | Major, Minor, Maj7, Min7, Dom7, (inv) + Major, Nat Minor | 10s |

**Open issue:** `Add Dom 7 Inv.` introduces Dom7 as new content *and* turns the timer on (off → 15s) in the same stage — two axes at once, violating rule 1. Suggested fix: split into "add Dom7, still untimed" then "add the timer," the same pattern used to fix the analogous issues elsewhere. Not yet done.

### 15. Full Foundation (1 stage)
A single consolidation checkpoint (5s timer) covering everything through Phase 14 — root-position and inverted triads and 7ths, all natural qualities, all 12 keys.

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Full Foundation | All 12 | Major, Minor, Maj7, Min7, Dom7, (inv) + Major, Nat Minor | 5s |

### 16. Scales beyond natural minor (15 stages)
`Harmonic Minor — C → …, Nat. Keys → …, All 12 → Melodic Minor — C → …, Nat. Keys → …, All 12 → Three Minors → Major Pentatonic — C → …, Nat. Keys → Both Pentatonics, Nat. → Pentatonics, All 12 → Meet the Modes → Modes, Nat. Keys → Modes, All 12 → All Scales, All Keys`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Harmonic Minor — C | C | Harm Minor | off |
| Harmonic Minor, Nat. Keys | 7 naturals | Harm Minor | off |
| Harmonic Minor, All 12 | All 12 | Harm Minor | 10s |
| Melodic Minor — C | C | Mel Minor | off |
| Melodic Minor, Nat. Keys | 7 naturals | Mel Minor | off |
| Melodic Minor, All 12 | All 12 | Mel Minor | 10s |
| Three Minors | All 12 | Nat Minor, Harm Minor, Mel Minor | 10s |
| Major Pentatonic — C | C | Maj Pent | off |
| Major Pentatonic, Nat. Keys | 7 naturals | Maj Pent | off |
| Both Pentatonics, Nat. | 7 naturals | Maj Pent, Min Pent | off |
| Pentatonics, All 12 | All 12 | Maj Pent, Min Pent | 10s |
| Meet the Modes | C | Modes | off |
| Modes, Nat. Keys | 7 naturals | Modes | off |
| Modes, All 12 | All 12 | Modes | 10s |
| All Scales, All Keys | All 12 | Major, Nat Minor, Harm Minor, Mel Minor, Maj Pent, Min Pent, Modes | 10s |

Fully ramped as of the first audit's Part 3 fix (Melodic Minor previously had no dedicated 12-key stage; Modes previously had *zero* key ramp — C-only straight to full complexity; Major Pentatonic previously combined adding Minor Pentatonic with a 7-key jump in one step). **Still has the untimed-12-keys gap** (rule 3) at each `…, All 12` stage — those jump straight into the phase's shared timer at `All Scales, All Keys`, same pattern as Phase 13.

**Fixed 2026-07-13 (was: "no recurrence" open issue):** harmonic minor, melodic minor, both pentatonics, and modes were never referenced again anywhere after this phase — neither of the path's two later "everything" checkpoints (`All Extensions, All Keys` in Phase 18, `Full Theory Workout` in Phase 21) included any scale beyond Major/Nat Minor, capping content at exactly what Phase 11 already taught. Both checkpoints' `scales` field now includes all 7 scale types (see `docs/superpowers/specs/2026-07-13-scales-recurrence-fix-design.md` and `docs/superpowers/plans/2026-07-13-scales-recurrence-fix.md`) — a pure data widening, no new stages, no `LEARNING_PATH_PHASES` change. Interval reading (Phase 20) has the identical problem and remains unfixed, deliberately deferred as a separate build — see that phase's open issue below.

### 17. Enharmonic spellings (3 stages)
`Meet Enharmonics → Flat-Key Spellings → Any Spelling, All Keys`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Meet Enharmonics | C,C#,Db,D,E,F,F#,Gb,G,A,B | Major, Minor | off |
| Flat-Key Spellings | C,Db,D,Eb,E,F,Gb,G,Ab,A,Bb,B | Major, Minor, Maj7, Min7, Dom7, (inv) + Major, Nat Minor | 10s |
| Any Spelling, All Keys | C,C#,Db,D,D#,Eb,E,F,F#,Gb,G,G#,Ab,A,A#,Bb,B | Major, Minor, Maj7, Min7, Dom7, (inv) + Major, Nat Minor | 10s |

**Open issue:** critique suggests this phase should sit right after Phase 6 (accidentals) instead of here — "teach the concept where the confusion is created" — not a difficulty-spike fix so much as a conceptual-ordering one. Not yet done.

### 18. Extended chords (12 stages)
`Meet Sus Chords → Add 7sus4, Nat. Keys → Sus + 7sus4, All Keys → Meet Half-Dim & Dim7 → Half-Dim & Dim7, All Keys → Meet Dominant 9 → Add Major 9 & Minor 9 → 9th Chords, Inversions → 9th Chords, All Keys → Add Dominant 13 → Jazz Alterations → All Extensions, All Keys`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Meet Sus Chords | 7 naturals | Major, Minor, sus2, sus4 | off |
| Add 7sus4, Nat. Keys | 7 naturals | Major, Minor, sus2, sus4, 7sus4 | off |
| Sus + 7sus4, All Keys | All 12 | Major, Minor, sus2, sus4, 7sus4 | 10s |
| Meet Half-Dim & Dim7 | 7 naturals | Major, Minor, Maj7, Min7, Dom7, Half-Dim, Dim7, (inv) + Major, Nat Minor | off |
| Half-Dim & Dim7, All Keys | All 12 | Major, Minor, Maj7, Min7, Dom7, Half-Dim, Dim7, (inv) + Major, Nat Minor | 10s |
| Meet Dominant 9 | 7 naturals | Major, Minor, Dom7, Dom9 | off |
| Add Major 9 & Minor 9 | 7 naturals | Major, Minor, Maj7, Min7, Dom7, Dom9, Maj9, Min9 | off |
| 9th Chords, Inversions | 7 naturals | Major, Minor, Maj7, Min7, Dom7, Dom9, Maj9, Min9, (inv) | off |
| 9th Chords, All Keys | All 12 | Major, Minor, Maj7, Min7, Dom7, Dom9, Maj9, Min9, (inv) + Major, Nat Minor | 10s |
| Add Dominant 13 | All 12 | Major, Minor, Maj7, Min7, Dom7, Dom9, Maj9, Min9, Dom13, (inv) + Major, Nat Minor | 10s |
| Jazz Alterations | 7 naturals | Major, Minor, Dom7, 7♭9, 7♯9, 7♯11 | off |
| All Extensions, All Keys | All 12 | Major, Minor, Dim, Aug, Maj7, Min7, Dom7, sus2, sus4, 7sus4, Dom9, Maj9, Min9, Dom13, 7♭9, 7♯9, 7♯11, Half-Dim, Dim7, (inv) + Major, Nat Minor, Harm Minor, Mel Minor, Maj Pent, Min Pent, Modes | 10s |

`Meet Half-Dim & Dim7` was split out (first audit, Part 3) from a single stage that used to debut two new chord qualities directly at full 12-key complexity — the same class of issue `Add Dim & Aug` had in Phase 8, since fixed too (see Phase 8's note above). Sus chords and 9th chords each got their own natural-keys warmup added in the same round.

**Open issue:** four "Meet X"-style stages in this phase start at 7 natural keys rather than C-only, unlike the established "new chord type = C-only first" pattern used everywhere else: `Meet Sus Chords`, `Meet Half-Dim & Dim7` (despite the fix above), `Meet Dominant 9`, and `Jazz Alterations`. Four out of five new-content debuts in this phase share the same non-standard convention — it reads less like a couple of one-off exceptions and more like this whole phase was authored to a different rule than the rest of the path. Worth re-auditing whether each natural-keys stage should itself be preceded by a C-only one, or whether "natural keys" is an acceptable substitute for "single key" at this later curriculum position (same reasoning as rule 4) — not resolved either way yet.

### 19. Functional harmony (26 stages)
`Functional Harmony — C → Progression: I–IV–V → Add IV–V–I → Add I–V–vi–IV → Add vi–IV–I–V → Add ii–V–I → Add i–iv–V (minor) → Add ii°–V–i (minor) → Add i–VI–III–VII (minor) → More Major Progressions I → More Major Progressions II → Introducing iii → More Minor Progressions → Borrowed Chords — Intro → Single Borrowed Chord Progressions → Combining Borrowed Chords → Raised Mediants → Minor Borrowed — ♭II → Jazz 7th Chords → Extended 9ths, 11ths & 13ths → Circle of Fifths & Applied Chords → Cadences & Color Chords → Functional, Nat. Keys → Functional, All 12 → Functional + Chords → Full Functional Mix`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Functional Harmony — C | C | I, ii, iii, IV, V, vi, vii° | off |
| Progression: I–IV–V | C | I–IV–V | off |
| Add IV–V–I | C | I–IV–V, IV–V–I | off |
| Add I–V–vi–IV | C | I–IV–V, IV–V–I, I–V–vi–IV | off |
| Add vi–IV–I–V | C | I–IV–V, IV–V–I, I–V–vi–IV, vi–IV–I–V | off |
| Add ii–V–I | C | I–IV–V, IV–V–I, I–V–vi–IV, vi–IV–I–V, ii–V–I | off |
| Add i–iv–V (minor) | C | I–IV–V, IV–V–I, I–V–vi–IV, vi–IV–I–V, ii–V–I, i–iv–V | off |
| Add ii°–V–i (minor) | C | I–IV–V, IV–V–I, I–V–vi–IV, vi–IV–I–V, ii–V–I, i–iv–V, ii°–V–i | off |
| Add i–VI–III–VII (minor) | C | I–IV–V, IV–V–I, I–V–vi–IV, vi–IV–I–V, ii–V–I, i–iv–V, ii°–V–i, i–VI–III–VII | off |
| More Major Progressions I | C | 13 progressions | off |
| More Major Progressions II | C | 18 progressions | off |
| Introducing iii | C | 22 progressions | off |
| More Minor Progressions | C | 26 progressions | off |
| Borrowed Chords — Intro | C | 34 progressions | off |
| Single Borrowed Chord Progressions | C | 57 progressions | off |
| Combining Borrowed Chords | C | 70 progressions | off |
| Raised Mediants | C | 79 progressions | off |
| Minor Borrowed — ♭II | C | 81 progressions | off |
| Jazz 7th Chords | C | 89 progressions | off |
| Extended 9ths, 11ths & 13ths | C | 100 progressions | off |
| Circle of Fifths & Applied Chords | C | 108 progressions | off |
| Cadences & Color Chords | C | 113 progressions | off |
| Functional, Nat. Keys | 7 naturals | all progressions (no restriction) | off |
| Functional, All 12 | All 12 | all progressions (no restriction) | 10s |
| Functional + Chords | All 12 | Major, Minor, Maj7, Min7, Dom7 + all progressions (no restriction) | 10s |
| Full Functional Mix | All 12 | Major, Minor, Maj7, Min7, Dom7, (inv) + Major, Nat Minor + all progressions (no restriction) | 10s |

This phase is the generalization layer Phase 4 (First Progressions) sets up: roman numerals as transposable, key-independent labels, plus every harmonic concept that needs the vocabulary already built by earlier stages in *this* phase (7ths, borrowed chords, secondary dominants — none of which exist yet at Phase 4's position). `Functional Harmony — C` teaches the 7 bare diatonic numerals (I, ii, iii, IV, V, vi, vii°) before any progression content; the rest builds progressions cumulatively, then borrowed/chromatic-mediant content, then jazz-extended content, then a final key/category-combining ramp.

**The canonical-numeral bug (fixed 2026-07-13, see [[functional-harmony-canonical-numeral-fix]]):** for the entire life of this phase until this date, the 7 bare numerals per mode silently bypassed *every* checkbox and stage restriction in this whole phase — every single stage above was serving mostly-random, often wrong-mode content underneath its intended restriction, not just `Functional Harmony — C`. Found via the user's own live testing of the new Phase 4, not by any audit or automated test. Now fixed: the 14 canonical numerals (7 major + 7 minor) have their own mode-qualified checkboxes and participate in the same gating as everything else. A related opt-in "Random Numerals (intense drill)" toggle was added alongside the fix — pure free-play, not referenced by any stage here.

**Open issue (Diatonic Chords placement):** the critique argues Phase 21 (Diatonic Chords — "here are all 7 chords in a key," a simpler, more fundamental concept) should sit as a bridge in or right before this phase, not as the very last thing in the whole path, since borrowed-chord and applied-dominant concepts here are defined *relative to* diatonic scale degrees. Not yet done.

**Open issue (`Functional, Nat. Keys` two-axis jump):** `Cadences & Color Chords` caps the curated, incrementally-built pool at 113 progressions, C-only. The very next stage, `Functional, Nat. Keys`, jumps to 7 keys *and* drops the restriction entirely via the no-`progressions`-field fallback — unlocking the full `FUNCTIONAL` catalog (127 entries: 111 major + 16 minor, verified directly against the live data, not the "116+" originally guessed), including minor content beyond what the curated buildup ever introduced. It's untimed, which cushions the jump, but it's still the single largest content-pool expansion in the path landing at the same moment as a key-count increase — two axes at once, even though "unlock everything" isn't a "new chord type" in the usual sense rule 1 describes. Not yet done.

**Resolved (not a bug): progression content and Phase 18's extended-chord vocabulary.** It's reasonable to wonder whether playing a jazz-extended progression (e.g. `Imaj9–VI7–ii9–V13`) actually exercises the same chord-quality recognition as Phase 18's dedicated 9th/13th-chord stages, given those stages' `chords` checkbox field rarely includes 9ths/13ths. Checked directly in `getExpectedPCs()`'s `func` branch (script.js:3477+): progression pitch-class resolution reads only the numeral string itself — via `FUNCTIONAL_NUMERALS` for plain numerals, or the jazz-suffix regex → Tonal.js fallback (`resolveJazzQuality`) for suffixed ones like `Imaj9` — and never consults the `chords` checkbox array at all. Playing `Imaj9` in a progression genuinely requires the real maj9 pitch classes, entirely independent of whatever Phase 18's chord-type checkboxes happen to be set to. No missed connection; the two phases' vocabularies are already combined at generation time, just through a mechanism (`chords` field is Chords-generator-only) that isn't obvious from the Learning Path data alone.

**Still-deferred content** (per `Modern Harmony Reference.md`, the load-bearing reference document for this whole area — its Section 4 is the only part left): pedal point, slash chords, quartal harmony, constant structure, and a "Common Modern Chord Colors" vocabulary list. Explicitly scoped by the user as reference/vocabulary for later, not active content to build yet.

### 20. Interval reading (7 stages)
`Perfect Intervals → Add Thirds → Add 2nds and 6ths → All Simple Intervals → Add Descending → Intervals, All 12 Notes → Intervals + Chords`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Perfect Intervals | 7 naturals | Perf5, Perf4, Oct (up) | off |
| Add Thirds | 7 naturals | Perf5, Perf4, Oct, Maj3, Min3 (up) | off |
| Add 2nds and 6ths | 7 naturals | Perf5, Perf4, Oct, Maj3, Min3, Maj6, Min6, Maj2 (up) | off |
| All Simple Intervals | 7 naturals | Min2, Maj2, Min3, Maj3, Perf4, TT, Perf5, Min6, Maj6, Min7, Maj7, Oct (up) | off |
| Add Descending | 7 naturals | Min2, Maj2, Min3, Maj3, Perf4, TT, Perf5, Min6, Maj6, Min7, Maj7, Oct (up/down) | off |
| Intervals, All 12 Notes | All 12 | Min2, Maj2, Min3, Maj3, Perf4, TT, Perf5, Min6, Maj6, Min7, Maj7, Oct (up/down) | 10s |
| Intervals + Chords | All 12 | Major, Minor, Maj7, Min7, Dom7 + Min2, Maj2, Min3, Maj3, Perf4, TT, Perf5, Min6, Maj6, Min7, Maj7, Oct (up/down) | 10s |

**Open issue:** critique suggests a light P5/M3/m3-only interval intro belongs right after Phase 2 ("here's what's inside the chord you just played") rather than the first mention of "interval" being 90+ stages in — while leaving this full unit (all 12 types, both directions, 12 keys) where it is as an advanced ear-training unit. Not yet done — would be an addition to an early phase, not a move of this one.

**Open issue (untimed-12-keys gap, named explicitly):** `Intervals, All 12 Notes` jumps from `Add Descending` (7 naturals, untimed) straight to 12 keys + 10s in one step — the same rule-3 pattern already flagged for Phase 13 and Phase 16, just not previously named for this phase specifically. Relatedly, `Intervals + Chords` is this phase's first category combination (intervals + chords) and starts already timed at 10s — the same shape as the already-tracked `Mix Chords + Scales` issue in Phase 12, not previously cross-referenced here. Not yet done.

**Open issue (no recurrence):** same pattern as Phase 16's scales — verified directly against the live data, zero Phase 21 stages reference any interval type at all. Once a learner finishes this phase, interval reading never comes up again.

### 21. Diatonic chords (5 stages)
`Diatonic Chords — C Maj → Diatonic, Major Keys → Diatonic Minor Mode → Diatonic + Functional → Full Theory Workout`

| Stage | Keys | Content | Timer |
|---|---|---|---|
| Diatonic Chords — C Maj | C | key C major | off |
| Diatonic, Major Keys | G | key G major | off |
| Diatonic Minor Mode | A | key A minor | off |
| Diatonic + Functional | All 12 | all progressions (no restriction) + key C major | 10s |
| Full Theory Workout | All 12 | Major, Minor, Maj7, Min7, Dom7, (inv) + Major, Nat Minor, Harm Minor, Mel Minor, Maj Pent, Min Pent, Modes + all progressions (no restriction) + key C major | 10s |

The path's final phase — a cumulative "everything" checkpoint plus the by-key diatonic-chord explorer. See Phase 19's open issue above for why the critique thinks this phase's core concept is positioned too late.

**Fixed 2026-07-13 (scales recurrence):** `Full Theory Workout` previously capped scales at Major/Nat Minor only — this table row now reflects the fix (see Phase 16's note and the "second critique round" open-issues entry, moved to Resolved below).

## Open issues summary (not yet built, tracked here so they aren't re-discovered from scratch)

**Rule 6 candidates (progression-practice phase after a skill-introducing phase), added 2026-07-13:**

- Phase 6 (Accidentals) → progressions in accidental-heavy keys. **In progress**, next round to be built.
- Phase 7 (Left-Hand Voicing) → progressions with left-hand voicing (simple root+5th, not full inversions — that combination already exists later as Phase 10 "Two-Handed Progressions"). **In progress**, being built first.
- Phase 8 (Triad inversions / Dim & Aug) → weaker case; diminished already appears in existing minor progressions (`ii°`, `vii°`) but a full augmented-triad progression isn't obviously musical. Not scoped yet — worth revisiting after the two in-progress builds ship, not before.
- Phases 13/14 (Seventh chords) → NOT flagged as a gap: jazz/7th-chord-quality progressions already exist later in Phase 19 ("Jazz 7th Chords" onward). A phase here would duplicate that payoff rather than fill a real gap.
- Phase 18 (Extended chords: sus, 9ths, 13ths) → same reasoning as Phase 13/14, already covered by Phase 19's extended-chord progressions.
- Phase 16 (Scales beyond natural minor) → doesn't apply; scales aren't a progression-compatible skill in this app's architecture.

From the first critique review (`critique.txt`, independently verified against live code — 7/9 claims confirmed accurate, 2 overstated/wrong before any of this was acted on):

- Missing untimed-12-keys rung before several timed 12-key stages (Phases 13, 16, 20 — see the second round below for Phase 20 specifically) — the most repeated finding.
- ~~`Add Dim & Aug` (Phase 8) introduces two new chord qualities at full complexity in one step~~ **Fixed 2026-07-13.** See Phase 8's note above — `Meet Diminished` → `Meet Augmented` now precede it, each C-only and untimed.
- `Mix Chords + Scales` (Phase 12) starts timed — needs an untimed combine-step first.
- `Meet Sus Chords` / `Meet Half-Dim & Dim7` (Phase 18) start at 7 keys, not C-only — see the second round below, this is actually 4 stages, not 2.
- Enharmonics (Phase 17) would teach the concept where the confusion is actually created if moved to right after Phase 6.
- Interval basics (Phase 20) could get a light early taste right after Phase 2, without moving the full unit.
- Left-hand voicing (Phase 7) is a post-mastery bolt-on rather than a parallel early track — the single biggest unresolved item, and a bigger restructure than anything else on this list.
- Diatonic Chords (Phase 21) is arguably a bridge concept for Phase 19, not a finale.

From a second critique review (`morecritique.txt`, 2026-07-13, independently verified against live code — 7/8 claims confirmed accurate, 1 resolved as not-a-bug, see Phase 19's "Resolved" note above):

- ~~**Advanced content never recurs after its intro phase — the biggest single finding of this round.**~~ **Fixed 2026-07-13, scales half only.** Harmonic minor, melodic minor, both pentatonics, and modes (Phase 16) are now included in both later "everything" checkpoints (`All Extensions, All Keys`, `Full Theory Workout`) — see Phase 16's "Fixed" note above. **Intervals (Phase 20) are still unfixed** — deliberately scoped out of this build as a separate follow-up (folding `catIntervals` into the existing 4-category capstones raises its own design question), tracked as its own open issue below.
- All interval types (Phase 20) are never referenced again anywhere in the remaining stages — neither later checkpoint includes intervals. Deferred as a separate build from the scales fix above (see Phase 20's open issue).
- `Add Dom 7 Inv.` (Phase 14) combines new content (Dom7) and turning the timer on in one stage — an untracked instance of the rule-1 violation pattern.
- The "skip the C-only intro" issue in Phase 18 is 4 stages, not 2: `Meet Sus Chords`, `Meet Half-Dim & Dim7`, `Meet Dominant 9`, and `Jazz Alterations` all start at 7 naturals.
- Phase 20's `Intervals, All 12 Notes` has the same missing-untimed-12-key-rung gap as Phases 13/16, just not previously named explicitly; `Intervals + Chords` also starts pre-timed on its first category combination, mirroring the already-tracked Phase 12 issue.
- `Functional, Nat. Keys` (Phase 19) combines dropping the entire progression restriction (113 curated → 127 total, verified) with a key-count increase in one untimed stage — the single largest content-pool jump in the path.
- Left-Hand mode (Phase 7) never reappears after its own 5-stage phase — distinct from the already-tracked "should be an earlier parallel track" issue.
- ~~Progressions go silent for 71 stages between Phase 4 and Phase 19~~ **Partially fixed 2026-07-13.** The new Phases 9 and 10 ("Progressions, Inverted" and "Two-Handed Progressions," see above — directly adjacent, zero gap between them) split the single 71-stage silence into a 23-stage and a 47-stage gap — a mid-path touchpoint, not a full fix (total silence barely drops, 70 vs. 71 stages).
- ~~Left-hand voicing (Phase 7) explicitly deferred combination with progression inversions~~ **Built 2026-07-13.** See Phase 10 above — the right hand plays the required inversion, the left hand plays the actual bass note plus the chord root.

From `chord-progressions-learning-path-deferred` memory (content, not curriculum-ordering): `Modern Harmony Reference.md` Section 4 — pedal point, slash chords, quartal harmony, constant structure — still explicitly scoped as reference/vocabulary only.

## Related memory (for future sessions picking this up)

- [[learning-path-audit]] — the 2 completed structural audit rounds (key-ramp fixes, All Paths popup redesign, redundant-ramp trims, name-based persistence, Left-Hand Voicing phase) plus this critique round
- [[chord-progressions-learning-path-deferred]] — full history of Phase 19's content buildup and the still-deferred `Modern Harmony Reference.md` Section 4
- [[left-hand-mode-deferred]] — Phase 7's feature architecture and why it doesn't generalize past Major/Minor root position yet
- [[functional-harmony-canonical-numeral-fix]] — the pre-existing bug that silently affected all of Phase 19 until 2026-07-13
- [[tonal-jazz-extensions]], [[secondary-dominants]] — two of the most recent content additions to Phase 19
- [[progressions-with-inversions]] — Phase 9's mechanism (reuses `getRequiredBassPc()`/`checkMidi()`/`updateKeyboard()` from the single-chord inversions feature unchanged) and the voice-leading reasoning behind its 3 stages' required inversions
- [[two-handed-progressions]] — Phase 10's mechanism (combines Phase 7's Left-Hand mode with Phase 9's inversion requirement) and the real `checkMidi()` conflict it was designed around
