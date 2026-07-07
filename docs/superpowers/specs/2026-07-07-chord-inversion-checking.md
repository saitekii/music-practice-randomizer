# Chord inversion checking: verify the bass note, not just the pitch classes

## Problem

`genChord()` displays a specific inversion ("Root position", "1st inversion", "2nd inversion", "3rd inversion") whenever the `inversions` checkbox is on, and encodes it into the prompt's key (`chord|${note}|${type.label}|${inv}`). But `checkMidi()`'s chord-matching logic (`script.js:3266-3267`) only checks that all the chord's pitch classes are present among the held notes — it never looks at which note is in the bass. So today, any voicing of the right notes registers as correct regardless of which inversion was actually asked for; the inversion label is purely decorative.

## Scope

Fix this for the 12 chord types where a "1st/2nd/3rd inversion" has an unambiguous, standard meaning: **Major, Minor, Diminished, Augmented, sus2, sus4, Major 7, Minor 7, Dominant 7, 7sus4, Minor 7♭5, Diminished 7**. For these types, `CHORD_INTERVALS`' array position already matches root/3rd(or 4th)/5th/[7th] order, so the inversion label's index directly identifies which chord tone must be the bass note.

**Explicitly excluded:** Dominant 9, Major 9, Minor 9, Dominant 13, 7♭9, 7♯9, 7♯11. Their `CHORD_INTERVALS` arrays are sorted by ascending pitch-class value, not by chord-tone role — for example Dominant 9 is `[0, 2, 4, 7, 10]`, where position 1 (pitch class 2) is the *9th*, not the 3rd. Naively indexing into these arrays for "1st inversion" would put a non-standard tone in the bass. These chords keep today's behavior unchanged: pitch-class-only checking, no bass requirement, no visual marker. Making inversions well-defined for these would require reworking `CHORD_INTERVALS` to track functional chord-tone roles explicitly, which is out of scope for this pass.

This applies only to the plain Chords generator (`genChord()`) — Diatonic Chords and Functional Harmony don't use inversion labels today and this doesn't add any.

## Design

### Correctness check

`getExpectedPCs()`'s `chord` branch gains a `requiredBassPc` field. When the resolved chord type is one of the 12 clean types above *and* a specific inversion was picked (the `inversions` checkbox was on for this prompt), `requiredBassPc` is `pcs[inversionIndex]`, where `inversionIndex` is the position of the inversion label within `TRIAD_INVERSIONS`/`SEVENTH_INVERSIONS` (Root position = 0, 1st = 1, 2nd = 2, 3rd = 3). Root position is a real requirement too — it means the root must be the bass note, not "no check." Every other case (excluded chord types, or `inversions` off) returns `requiredBassPc: null`.

`checkMidi()`'s chord-matching branch adds one condition alongside the existing pitch-class check: `requiredBassPc == null || sortedHeldNotes[0] % 12 === requiredBassPc`, reusing the same ascending-sort-then-inspect pattern the existing octave-interval check already uses (`script.js:3273`).

### Visual bass-note marker

When the held notes satisfy every expected pitch class but the lowest held note isn't the required bass note, `updateKeyboard()` marks whichever currently-held key(s) do have the required bass pitch class with a new `bass-target` CSS class, additive to the existing `active`/`wrong` classes. Because the premise of this state is "all the right notes are already being played, just not in the right order," the marker never invents a note you're not playing — it always points at a key you're already holding, indicating that one specifically needs to become your lowest note. It updates live via the existing `updateKeyboard()` call already wired to every note-on/off event, and disappears the moment the bass note is corrected (or the notes are released).

## Out of scope for this pass

- The 7 extended/altered chord types listed above — deliberately left with today's lenient (pitch-class-only) behavior.
- Any new settings/checkboxes — this fixes existing behavior behind the existing `inversions` checkbox, not an opt-in toggle.
- Diatonic Chords, Functional Harmony, or any `LEARNING_PATH` data changes — inversion-focused stages already reference the `inversions` checkbox and inherit the corrected behavior automatically; no other generator uses inversion labels.
- Reworking `CHORD_INTERVALS` to track functional chord-tone roles for the excluded chord types — a larger change, not needed for this scope.
