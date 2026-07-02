# Music Practice Randomizer

A lightweight browser app that generates random prompts for instrument practice. No accounts, no backend, no install — just open and play.

**[Live app →](https://saitekii.github.io/music-practice-randomizer/)**

---

## What it does

Each press of **Next Prompt** (or the spacebar) gives you something to practice. You choose which categories are active, and the app picks randomly from your selection.

### Categories

| Category | Example output |
|---|---|
| Chords | `F# Minor 7` |
| Chords + Inversions | `Eb Major` / `2nd inversion` |
| Scales | `G Harmonic minor` |
| Modes | `D Dorian` |
| Functional Harmony | `Key: Bb Major` / `Play: ii–V–I` |
| Diatonic Chords | `A Minor` / `vi in C Major` |

### Timer

Set an auto-advance interval (3 s, 5 s, 10 s, 15 s, or custom) so prompts cycle hands-free while you practice.

### Root Notes

Toggle which of the 12 chromatic notes are included in the random pool. Applies to Chords, Scales, and Functional Harmony. Diatonic Chords uses its own key selector.

---

## Usage

Open `index.html` in any browser — no server needed. Works offline.

Settings (active categories, root notes, timer) are saved automatically in `localStorage`.

**Keyboard shortcut:** Spacebar → next prompt

---

## Tech

Plain HTML, CSS, and vanilla JavaScript. No frameworks, no build step, no dependencies.
