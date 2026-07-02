# Simple Music Practice Randomizer

## Goal

Create a lightweight browser app that generates random music prompts for instrument practice.

The purpose is to build instant recognition and execution of scales, chords, and musical structures.

No accounts, no statistics, no backend, no login system.

Everything runs locally in the browser.

---

# Main Screen

A large card in the center displays the current prompt.

Examples:

```text
C Major
```

```text
F# Minor
1st Inversion
```

```text
Eb Harmonic Minor
```

```text
Key: A Major
Play: vi
```

A large **Next Prompt** button generates a new item.

Optional keyboard shortcut:

* Spacebar = next prompt

---

# Timer

Optional timer mode.

Settings:

* Off
* 3 seconds
* 5 seconds
* 10 seconds
* 15 seconds
* Custom value

When enabled:

* A countdown is shown.
* A new prompt appears automatically when the timer expires.

---

# Practice Categories

The user can enable or disable categories with checkboxes.

## Chords

Options:

* Major
* Minor
* Diminished
* Augmented
* Major 7
* Minor 7
* Dominant 7

Optional:

* Enable inversions

  * Root position
  * 1st inversion
  * 2nd inversion
  * 3rd inversion (for seventh chords)

---

## Scales

Options:

* Major
* Natural minor
* Harmonic minor
* Melodic minor
* Major pentatonic
* Minor pentatonic
* Modes

---

## Functional Harmony

Generate prompts like:

```text
Key: D Major
Play: IV
```

```text
Key: Bb Major
Play: ii-V-I
```

---

# Root Note Selection

Checkboxes for:

* C
* C#
* D
* Eb
* E
* F
* F#
* G
* Ab
* A
* Bb
* B

Default:

All selected.

---

# Randomization Rules

When generating a prompt:

1. Choose a random enabled category.
2. Choose a random enabled root note.
3. Choose a random subtype.
4. Add inversion information if enabled.
5. Display the result.

No prompt should repeat immediately after itself.

---

# Technology

Use:

* HTML
* CSS
* Vanilla JavaScript

Single-page application.

No frameworks.

Store user settings in localStorage.

The entire project should fit into:

* index.html
* style.css
* script.js

The app should load instantly and work offline.