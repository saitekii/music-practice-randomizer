# Tonal.js Integration + Jazz-Extended Progressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce Tonal.js (vendored locally, this app's first-ever external dependency) to resolve jazz-extended chord-quality numerals (`Imaj7`, `V13`, `viiø7`, etc.) instead of hand-building more lookup tables, and ship 31 new progressions cross-referenced from `Modern Harmony Reference.md`.

**Architecture:** `FUNCTIONAL_NUMERALS`'s existing direct lookup stays the fast path for all ~110 existing bare-numeral tokens, completely untouched. A new fallback in `getExpectedPCs()`'s `func` branch handles any numeral that isn't a direct key: split it into a base numeral (reusing the same table's offsets) and a quality suffix, then hand the actual chord construction off to `Tonal.Chord.getChord()`, converting results back to pitch classes via `Tonal.Note.chroma()`. Pure data addition after that (31 new `FUNCTIONAL.major` entries, checkboxes, 4 Learning Path stages) — same shape as every prior progression tier this project has shipped.

**Tech Stack:** Vanilla JS, Tonal.js (vendored, `tonal.min.js`, tonal@6.4.3), Playwright `.cjs` scripts.

## Global Constraints

- No build step, no bundler, no `node_modules` — Tonal is vendored as a single minified file loaded via a plain `<script>` tag, exactly like `script.js` itself.
- Character-exact pattern strings: en-dash `–` (U+2013), flat `♭` (U+266D), sharp `♯` (U+266F), degree `°` (U+00B0), half-diminished `ø` (U+00F8, LATIN SMALL LETTER O WITH STROKE — distinct from `°`).
- All 31 new progressions get checkboxes, **unchecked by default** — same convention as every prior batch.
- The 3 test files that hardcode an absolute `LEARNING_PATH.length` total (`test-all-paths-popup-redesign.cjs`, `test-audit-fixes-extended-chords-phase.cjs`, `test-audit-fixes-scales-phase.cjs`) get updated **together, once, in Task 4** (the task that actually changes the total) — per the established convention for this recurring staleness pattern. This batch adds 4 stages to an *existing* phase (`Functional harmony`), not a new phase, so `LEARNING_PATH_PHASES.length` (currently 18) does **not** change — only `LEARNING_PATH.length` (120 → 124) and the `Functional harmony` phase's own count (22 → 26).
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `checkTrue(label, condition, extra)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.
- The 31 new progressions, exactly: `I–VI7–ii–V`, `Imaj7–iii7–vi7–ii7–V7`, `iii7–vi7–ii7–V7–Imaj7`, `vi7–ii7–V7–Imaj7`, `Imaj7–VI7–ii7–V7`, `Imaj7–vi7–IVmaj7–V13`, `vi9–V13–Imaj9–IVmaj9`, `ii9–V13–Imaj9`, `IVmaj7–V7–iii7–vi7–ii7–V7`, `Imaj7–IVmaj7–ii7–V13`, `Imaj7–iii7–IVmaj7–iv7`, `Imaj7–♭VIImaj7–IVmaj7`, `Imaj9–VI7–ii9–V13`, `Imaj9–VI13–ii11–V13`, `Imaj9–♯IV°7–ii9–V13`, `Imaj7–IIImaj7–vi9–IVmaj7`, `Imaj9–♭IImaj7–vi11–V13♯11`, `Imaj9–♭IIImaj7–IVmaj9–iv7`, `Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13`, `I–III7–vi–II7–ii–V–I`, `iii–VI7–ii–V–I`, `vi–II7–ii–V–I`, `I–III7–vi`, `vi–II7–V`, `ii–♭II7–I`, `♭II7–I`, `V–vi`, `V–IV`, `Imaj7–viiø7–iii7–vi7`, `Imaj7♯11–IImaj7`, `Imaj7♯11–♭VIImaj7`. Verified programmatically against the live `FUNCTIONAL.major` array before this plan was written: zero overlap with the existing 79 entries, zero internal duplicates, 79 + 31 = 110 total.

---

### Task 1: Vendor Tonal.js locally

**Files:**
- Create: `tonal.min.js` (repo root)
- Modify: `index.html` (add script tag before `script.js`)
- Modify: `CLAUDE.md` (update the "no dependencies" architecture note)
- Test: `test-tonal-vendored.cjs`

**Interfaces:**
- Produces: a global `Tonal` object available in every page load (both the shipped app and every Playwright test), consumed by Task 2. Not a network dependency — verified to work with the browser context's network fully disabled.

- [ ] **Step 1: Write the failing test**

Create `test-tonal-vendored.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  // offline: true proves this is genuinely vendored, not just a CDN happening to respond fast.
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const result = await page.evaluate(() => {
    if (typeof Tonal === 'undefined') return { loaded: false };
    const c1 = Tonal.Chord.getChord('maj7', 'C');
    const c2 = Tonal.Chord.getChord('m7b5', 'F#');
    return {
      loaded: true,
      c1notes: c1.notes,
      c2chromas: c2.notes.map(n => Tonal.Note.chroma(n)),
    };
  });
  checkTrue('Tonal is loaded from the vendored local file with network fully disabled', result.loaded, null);
  check('Tonal.Chord.getChord resolves Cmaj7 correctly', result.c1notes, ['C', 'E', 'G', 'B']);
  check('Tonal.Note.chroma correctly converts F# half-diminished notes to pitch classes', result.c2chromas, [6, 9, 0, 4]);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-tonal-vendored.cjs`
Expected: FAIL — `Tonal` is undefined, `tonal.min.js` doesn't exist yet and isn't referenced by `index.html`.

- [ ] **Step 3: Download the vendored file**

Download Tonal's browser build, pinned to an exact version (already verified end-to-end throughout this plan's design phase — do not use an unpinned "latest" URL, which could silently change behavior on a future re-download):

```bash
curl -sL "https://cdn.jsdelivr.net/npm/tonal@6.4.3/browser/tonal.min.js" -o tonal.min.js
```

Verify the download succeeded and looks like the expected file (starts with `"use strict";var Tonal=`, roughly 40KB):

```bash
ls -la tonal.min.js
head -c 60 tonal.min.js
```

Expected: file exists, non-trivial size (tens of KB), starts with `"use strict";var Tonal=`.

- [ ] **Step 4: Add the script tag to `index.html`**

Current code (`index.html`, end of `<body>`):

```html
  <script src="script.js"></script>
</body>
```

Replace with:

```html
  <script src="tonal.min.js"></script>
  <script src="script.js"></script>
</body>
```

- [ ] **Step 5: Update `CLAUDE.md`**

Current code (`CLAUDE.md:7`):

```markdown
Single-page static app — no build step, no framework, no dependencies. Open `index.html` in a browser. Everything runs client-side. Three files: `index.html` (structure), `style.css` (dark theme, CSS custom properties), `script.js` (all logic, flat file, no classes).
```

Replace with:

```markdown
Single-page static app — no build step, no framework. Open `index.html` in a browser. Everything runs client-side. Four files: `index.html` (structure), `style.css` (dark theme, CSS custom properties), `script.js` (all logic, flat file, no classes), `tonal.min.js` (vendored [Tonal.js](https://github.com/tonaljs/tonal) music-theory library, used only for jazz-extended chord-quality parsing in Functional Harmony — no other dependencies, no CDN at runtime).
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node test-tonal-vendored.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Commit**

```bash
git add tonal.min.js index.html CLAUDE.md test-tonal-vendored.cjs
git commit -m "Vendor Tonal.js locally for jazz-extended chord-quality parsing"
```

---

### Task 2: Extend the numeral resolver with a jazz-quality-suffix fallback

**Files:**
- Modify: `script.js` (`FUNCTIONAL_NUMERALS.major` — add `♯IV`; new `resolveJazzQuality()` function; `getExpectedPCs()`'s `func` branch — add the fallback)
- Test: `test-jazz-numeral-resolution.cjs`

**Interfaces:**
- Consumes: the global `Tonal` object from Task 1.
- Produces: `getExpectedPCs()` now resolves any numeral matching the jazz-suffix shape, not just direct `FUNCTIONAL_NUMERALS` keys. Task 3's new `FUNCTIONAL` entries rely on this resolver working correctly for all 21 distinct numeral tokens they use.

- [ ] **Step 1: Write the failing test**

Create `test-jazz-numeral-resolution.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  // Every distinct numeral token the 31-entry jazz batch uses, resolved in C major, sorted
  // pitch classes compared against hand-computed expected values.
  const result = await page.evaluate(() => {
    const pcs = (numeralToken) => {
      const key = `func|C|Major|${numeralToken}|0`;
      const r = getExpectedPCs(key);
      return r ? [...r.pcs].sort((a, b) => a - b) : null;
    };
    return {
      Imaj7:      pcs('Imaj7'),       // C maj7: C E G B
      iii7:       pcs('iii7'),        // E m7: E G B D
      V7:         pcs('V7'),          // G7: G B D F
      VI7:        pcs('VI7'),         // A7 (raised-VI root + dominant7): A C# E G
      iv7:        pcs('iv7'),         // borrowed iv m7: F Ab C Eb
      V13:        pcs('V13'),         // G13: G B D F A E
      ii9:        pcs('ii9'),         // D m9: D F A C E
      vi11:       pcs('vi11'),        // A m11: A C E G D
      Imaj9:      pcs('Imaj9'),       // C maj9: C E G B D
      V13sharp11: pcs('V13♯11'),      // G13#11: G B D F A C# E (dominant 13 sharp-11)
      flatII7:    pcs('♭II7'),        // Db7: Db F Ab Cb(=B)
      III7:       pcs('III7'),        // E7 (raised-III root + dominant7): E G# B D
      maj7sharp11:pcs('Imaj7♯11'),    // Cmaj7#11: C E G B F#
      halfDim:    pcs('viiø7'),       // B half-dim7: B D F A
      sharpIVdim7:pcs('♯IV°7'),       // F# dim7: F# A C Eb
      // Regression: existing bare-numeral fast path completely untouched
      regressionI:  pcs('I'),         // C major triad: C E G
      regressionVii:pcs('vii°'),      // B diminished triad: B D F
      unknown:      pcs('ZZZmaj7'),   // not a real numeral at all -- must still return null
    };
  });

  check('Imaj7 -> C maj7', result.Imaj7, [0, 4, 7, 11]);
  check('iii7 -> E m7', result.iii7, [2, 4, 7, 11]);
  check('V7 -> G7', result.V7, [2, 5, 7, 11]);
  check('VI7 -> A7 (raised-VI root)', result.VI7, [1, 4, 9, 11]);
  check('iv7 -> borrowed iv m7', result.iv7, [0, 3, 5, 8]);
  check('V13 -> G13', result.V13, [2, 5, 7, 9, 11]);
  check('ii9 -> D m9', result.ii9, [0, 2, 4, 5, 9]);
  check('vi11 -> A m11', result.vi11, [0, 2, 4, 7, 9]);
  check('Imaj9 -> C maj9', result.Imaj9, [0, 2, 4, 7, 11]);
  check('V13♯11 -> G13#11', result.V13sharp11, [2, 4, 6, 7, 9, 11]);
  check('♭II7 -> Db7', result.flatII7, [1, 3, 5, 8]);
  check('III7 -> E7 (raised-III root)', result.III7, [3, 4, 7, 8]);
  check('Imaj7♯11 -> Cmaj7#11', result.maj7sharp11, [0, 4, 6, 7, 11]);
  check('viiø7 -> B half-diminished7', result.halfDim, [1, 2, 5, 11]);
  check('♯IV°7 -> F# diminished7', result.sharpIVdim7, [0, 3, 6, 9]);
  check('regression: bare "I" still resolves via the fast path', result.regressionI, [0, 4, 7]);
  check('regression: bare "vii°" still resolves via the fast path', result.regressionVii, [2, 5, 11]);
  check('an unresolvable token returns null, not a crash', result.unknown, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-jazz-numeral-resolution.cjs`
Expected: FAIL on every jazz-suffixed token — `getExpectedPCs()` has no fallback yet, so all of them return `null`. The two regression checks (`I`, `vii°`) and the `unknown` check already PASS, since that logic is untouched so far.

- [ ] **Step 3: Add the `♯IV` offset entry**

Current code (`script.js`, in `FUNCTIONAL_NUMERALS.major`):

```javascript
    'II': [2, 'Major'], 'III': [4, 'Major'], 'VI': [9, 'Major'],
  },
  minor: {
```

Replace with:

```javascript
    'II': [2, 'Major'], 'III': [4, 'Major'], 'VI': [9, 'Major'],
    '♯IV': [6, 'Diminished'],
  },
  minor: {
```

- [ ] **Step 4: Add `resolveJazzQuality()`**

Insert immediately before `function getExpectedPCs(key) {`:

```javascript
// Suffix + degree marker (from a jazz-extended numeral like "Imaj7", "V13", "viiø7") -> a quality
// string Tonal.Chord.getChord() understands. isUpper/degreeMarker come from splitting the numeral
// in getExpectedPCs()'s func branch -- see the comment there for why they're passed separately
// rather than re-derived from a combined base string.
function resolveJazzQuality(degreeMarker, isUpper, suffix) {
  if (degreeMarker === 'ø' && suffix === '7') return 'm7b5';
  if (degreeMarker === '°' && suffix === '7') return 'dim7';
  if (/^\d+(sus\d?)?$/.test(suffix)) return (isUpper ? '' : 'm') + suffix;
  return suffix.replace(/♯/g, '#').replace(/♭/g, 'b');
}
```

- [ ] **Step 5: Add the fallback to `getExpectedPCs()`'s `func` branch**

Current code (`script.js`):

```javascript
  if (type === 'func') {
    const fullPattern = parts[3];
    const steps       = fullPattern.split('–');
    const stepIndex   = parseInt(parts[4]) || 0;
    const numeral     = steps[stepIndex];
    if (!numeral) return null;
    const rootIdx = (NOTE_TO_PC[parts[1]] ?? -1);
    const modeKey = parts[2] === 'Major' ? 'major' : 'minor';
    const entry   = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (rootIdx === -1 || !entry) return null;
    const [offset, quality] = entry;
    const chordRootPC = (rootIdx + offset) % 12;
    const intervals   = CHORD_INTERVALS[quality];
    if (!intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
  }
```

Replace with:

```javascript
  if (type === 'func') {
    const fullPattern = parts[3];
    const steps       = fullPattern.split('–');
    const stepIndex   = parseInt(parts[4]) || 0;
    const numeral     = steps[stepIndex];
    if (!numeral) return null;
    const rootIdx = (NOTE_TO_PC[parts[1]] ?? -1);
    const modeKey = parts[2] === 'Major' ? 'major' : 'minor';
    if (rootIdx === -1) return null;
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
    }
    // Fallback: a numeral with an explicit jazz quality suffix (e.g. "Imaj7", "V13", "viiø7"),
    // not a bare token FUNCTIONAL_NUMERALS already knows. Split off the base numeral and hand the
    // actual chord construction to Tonal instead of another hand-built lookup table. The degree
    // marker (°/ø) is parsed separately from the numeral-letters lookup because the table stores
    // some entries WITH the degree symbol baked into the key (vii°, ii°) and others without --
    // try the bare accidental+letters form first, then that form with ° appended.
    const jazzMatch = numeral.match(/^(♭|♯)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°|ø)?(.+)$/);
    if (!jazzMatch) return null;
    const accLetters   = (jazzMatch[1] || '') + jazzMatch[2];
    const degreeMarker = jazzMatch[3] || '';
    const suffix        = jazzMatch[4];
    const isUpper        = jazzMatch[2] === jazzMatch[2].toUpperCase();
    const baseEntry = FUNCTIONAL_NUMERALS[modeKey][accLetters] || FUNCTIONAL_NUMERALS[modeKey][accLetters + '°'];
    if (!baseEntry) return null;
    const rootNote = NOTES[(rootIdx + baseEntry[0]) % 12];
    const quality  = resolveJazzQuality(degreeMarker, isUpper, suffix);
    const chord    = Tonal.Chord.getChord(quality, rootNote);
    if (!chord || chord.empty || !chord.notes.length) return null;
    return { type: 'chord', pcs: chord.notes.map(n => Tonal.Note.chroma(n)) };
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node test-jazz-numeral-resolution.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Run the existing progression regression tests**

```bash
node test-borrowed-numerals-resolution.cjs
node test-borrowed-checkbox-gating.cjs
node test-progression-filtering.cjs
node test-more-progressions.cjs
```

Expected: `RESULT: PASS` on all four — confirms the fallback addition doesn't change behavior for any of the 110 existing bare-numeral entries.

- [ ] **Step 8: Commit**

```bash
git add script.js test-jazz-numeral-resolution.cjs
git commit -m "Add jazz-quality-suffix fallback to the numeral resolver, backed by Tonal"
```

---

### Task 3: Add the 31 jazz-extended progressions and their checkboxes

**Files:**
- Modify: `script.js` (`FUNCTIONAL.major`)
- Modify: `index.html` (`functionalOptions` panel — append 31 checkboxes)
- Test: `test-jazz-progressions-content.cjs`

**Interfaces:**
- Consumes: `FUNCTIONAL_NUMERALS`/`resolveJazzQuality`/the `getExpectedPCs()` fallback (Task 2), `checkboxGatedPatterns()`/`enabledProgressions()` (already handle any dash-containing pattern correctly, no changes needed).
- Produces: the final `FUNCTIONAL.major` (110 entries). Task 4's Learning Path stages reference these pattern strings by exact name.

- [ ] **Step 1: Write the failing test**

Create `test-jazz-progressions-content.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const NEW_ENTRIES = ['I–VI7–ii–V','Imaj7–iii7–vi7–ii7–V7','iii7–vi7–ii7–V7–Imaj7','vi7–ii7–V7–Imaj7','Imaj7–VI7–ii7–V7','Imaj7–vi7–IVmaj7–V13','vi9–V13–Imaj9–IVmaj9','ii9–V13–Imaj9','IVmaj7–V7–iii7–vi7–ii7–V7','Imaj7–IVmaj7–ii7–V13','Imaj7–iii7–IVmaj7–iv7','Imaj7–♭VIImaj7–IVmaj7','Imaj9–VI7–ii9–V13','Imaj9–VI13–ii11–V13','Imaj9–♯IV°7–ii9–V13','Imaj7–IIImaj7–vi9–IVmaj7','Imaj9–♭IImaj7–vi11–V13♯11','Imaj9–♭IIImaj7–IVmaj9–iv7','Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13','I–III7–vi–II7–ii–V–I','iii–VI7–ii–V–I','vi–II7–ii–V–I','I–III7–vi','vi–II7–V','ii–♭II7–I','♭II7–I','V–vi','V–IV','Imaj7–viiø7–iii7–vi7','Imaj7♯11–IImaj7','Imaj7♯11–♭VIImaj7'];

  const dataCheck = await page.evaluate((entries) => ({
    hasAll: entries.every(p => FUNCTIONAL.major.includes(p)),
    majorCount: FUNCTIONAL.major.length,
  }), NEW_ENTRIES);
  checkTrue('FUNCTIONAL.major contains all 31 new jazz-extended entries', dataCheck.hasAll, null);
  check('FUNCTIONAL.major has 110 entries total (79 existing + 31 new)', dataCheck.majorCount, 110);

  const checkboxCheck = await page.evaluate((entries) =>
    entries.map(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return { pattern: p, exists: !!el, checked: el ? el.checked : null };
    }), NEW_ENTRIES);
  checkTrue('all 31 new checkboxes exist', checkboxCheck.every(c => c.exists), JSON.stringify(checkboxCheck.filter(c => !c.exists).map(c => c.pattern)));
  checkTrue('all 31 new checkboxes are UNCHECKED by default', checkboxCheck.every(c => c.checked === false), JSON.stringify(checkboxCheck.filter(c => c.checked !== false).map(c => c.pattern)));

  const originalCheck = await page.evaluate(() => {
    const sample = ['ii–V–I', 'I–IV–V', 'I–VI–ii–V', 'i–♭II–VII–i'];
    return sample.every(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return el && el.checked === true;
    });
  });
  checkTrue('a sample of pre-existing progression checkboxes are unaffected (still checked)', originalCheck, null);

  // Integration: enabledProgressions() correctly gates real new content, and applyStage-style
  // checking makes a jazz progression's steps actually playable end to end.
  const integration = await page.evaluate(() => {
    const pattern = 'Imaj7–iii7–vi7–ii7–V7';
    const before = enabledProgressions('major').includes(pattern);
    document.querySelector(`input[data-pattern="${pattern}"]`).checked = true;
    const after = enabledProgressions('major').includes(pattern);
    document.querySelector(`input[data-pattern="${pattern}"]`).checked = false; // reset
    return { before, after };
  });
  check('a new jazz progression is excluded from enabledProgressions() by default (unchecked)', integration.before, false);
  check('a new jazz progression is included in enabledProgressions() once checked', integration.after, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-jazz-progressions-content.cjs`
Expected: FAIL on every check involving the 31 new entries and checkboxes (none of it exists yet).

- [ ] **Step 3: Update `FUNCTIONAL.major`**

Current code (`script.js`, end of the `major` array — this is a very long single line; only the final entries are shown for anchoring, match the exact trailing text):

```javascript
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV', 'iv', '♭II', '♭III', '♭VI', '♭VII', 'II', 'III', 'VI', 'I–iv–I', 'I–♭VII–IV', 'I–♭III–IV', 'I–♭VI–IV', 'I–♭III', 'I–♭VI', 'I–♭VII', 'I–♭II', 'I–iv', '♭III–I', '♭VI–I', '♭VII–I', '♭II–I', 'I–♭III–I', 'I–♭VI–I', 'IV–♭VII–I', 'ii–♭VII–I', 'iv–♭VII–I', 'I–IV–♭VII', 'V–♭VI', 'V–♭III', 'vi–IV–I', 'V–ii', 'I–♭VI–♭VII–I', 'I–♭III–♭VI', 'I–iv–♭VII–I', 'I–♭III–♭VI–IV', 'I–♭VII–♭VI–V', 'I–ii–♭III–IV', 'I–iii–IV–iv', 'I–♭III–IV–iv', 'I–♭III–IV–V', 'I–vi–ii–♭II', 'I–♭II–vi', 'I–III–♭II–vi', 'I–♭II–IV–III', 'I–VI–ii–V', 'I–III–vi–II–ii–V–I', 'iii–VI–ii–V–I', 'vi–II–ii–V–I', 'I–III', 'I–VI', 'III–♭VI', 'I–III–vi–IV', 'I–III–♭VI–IV'],
```

Replace with:

```javascript
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV', 'iv', '♭II', '♭III', '♭VI', '♭VII', 'II', 'III', 'VI', 'I–iv–I', 'I–♭VII–IV', 'I–♭III–IV', 'I–♭VI–IV', 'I–♭III', 'I–♭VI', 'I–♭VII', 'I–♭II', 'I–iv', '♭III–I', '♭VI–I', '♭VII–I', '♭II–I', 'I–♭III–I', 'I–♭VI–I', 'IV–♭VII–I', 'ii–♭VII–I', 'iv–♭VII–I', 'I–IV–♭VII', 'V–♭VI', 'V–♭III', 'vi–IV–I', 'V–ii', 'I–♭VI–♭VII–I', 'I–♭III–♭VI', 'I–iv–♭VII–I', 'I–♭III–♭VI–IV', 'I–♭VII–♭VI–V', 'I–ii–♭III–IV', 'I–iii–IV–iv', 'I–♭III–IV–iv', 'I–♭III–IV–V', 'I–vi–ii–♭II', 'I–♭II–vi', 'I–III–♭II–vi', 'I–♭II–IV–III', 'I–VI–ii–V', 'I–III–vi–II–ii–V–I', 'iii–VI–ii–V–I', 'vi–II–ii–V–I', 'I–III', 'I–VI', 'III–♭VI', 'I–III–vi–IV', 'I–III–♭VI–IV', 'I–VI7–ii–V', 'Imaj7–iii7–vi7–ii7–V7', 'iii7–vi7–ii7–V7–Imaj7', 'vi7–ii7–V7–Imaj7', 'Imaj7–VI7–ii7–V7', 'Imaj7–vi7–IVmaj7–V13', 'vi9–V13–Imaj9–IVmaj9', 'ii9–V13–Imaj9', 'IVmaj7–V7–iii7–vi7–ii7–V7', 'Imaj7–IVmaj7–ii7–V13', 'Imaj7–iii7–IVmaj7–iv7', 'Imaj7–♭VIImaj7–IVmaj7', 'Imaj9–VI7–ii9–V13', 'Imaj9–VI13–ii11–V13', 'Imaj9–♯IV°7–ii9–V13', 'Imaj7–IIImaj7–vi9–IVmaj7', 'Imaj9–♭IImaj7–vi11–V13♯11', 'Imaj9–♭IIImaj7–IVmaj9–iv7', 'Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13', 'I–III7–vi–II7–ii–V–I', 'iii–VI7–ii–V–I', 'vi–II7–ii–V–I', 'I–III7–vi', 'vi–II7–V', 'ii–♭II7–I', '♭II7–I', 'V–vi', 'V–IV', 'Imaj7–viiø7–iii7–vi7', 'Imaj7♯11–IImaj7', 'Imaj7♯11–♭VIImaj7'],
```

- [ ] **Step 4: Add the 31 new checkboxes to `index.html`**

Current code (`index.html`, end of the `functionalOptions` panel):

```html
                <label><input type="checkbox" data-pattern="I–VI"> I–VI</label>
                <label><input type="checkbox" data-pattern="III–♭VI"> III–♭VI</label>
                <label><input type="checkbox" data-pattern="I–III–vi–IV"> I–III–vi–IV</label>
                <label><input type="checkbox" data-pattern="I–III–♭VI–IV"> I–III–♭VI–IV</label>
                <div class="option-divider">Minor — ♭II</div>
                <label><input type="checkbox" data-pattern="i–♭II–VII–i"> i–♭II–VII–i</label>
              </div>
```

Replace with:

```html
                <label><input type="checkbox" data-pattern="I–VI"> I–VI</label>
                <label><input type="checkbox" data-pattern="III–♭VI"> III–♭VI</label>
                <label><input type="checkbox" data-pattern="I–III–vi–IV"> I–III–vi–IV</label>
                <label><input type="checkbox" data-pattern="I–III–♭VI–IV"> I–III–♭VI–IV</label>
                <div class="option-divider">Minor — ♭II</div>
                <label><input type="checkbox" data-pattern="i–♭II–VII–i"> i–♭II–VII–i</label>
                <div class="option-divider">Jazz 7th Chords</div>
                <label><input type="checkbox" data-pattern="I–VI7–ii–V"> I–VI7–ii–V</label>
                <label><input type="checkbox" data-pattern="Imaj7–iii7–vi7–ii7–V7"> Imaj7–iii7–vi7–ii7–V7</label>
                <label><input type="checkbox" data-pattern="iii7–vi7–ii7–V7–Imaj7"> iii7–vi7–ii7–V7–Imaj7</label>
                <label><input type="checkbox" data-pattern="vi7–ii7–V7–Imaj7"> vi7–ii7–V7–Imaj7</label>
                <label><input type="checkbox" data-pattern="Imaj7–VI7–ii7–V7"> Imaj7–VI7–ii7–V7</label>
                <label><input type="checkbox" data-pattern="Imaj7–vi7–IVmaj7–V13"> Imaj7–vi7–IVmaj7–V13</label>
                <label><input type="checkbox" data-pattern="vi9–V13–Imaj9–IVmaj9"> vi9–V13–Imaj9–IVmaj9</label>
                <label><input type="checkbox" data-pattern="ii9–V13–Imaj9"> ii9–V13–Imaj9</label>
                <div class="option-divider">Extended 9ths, 11ths &amp; 13ths</div>
                <label><input type="checkbox" data-pattern="IVmaj7–V7–iii7–vi7–ii7–V7"> IVmaj7–V7–iii7–vi7–ii7–V7</label>
                <label><input type="checkbox" data-pattern="Imaj7–IVmaj7–ii7–V13"> Imaj7–IVmaj7–ii7–V13</label>
                <label><input type="checkbox" data-pattern="Imaj7–iii7–IVmaj7–iv7"> Imaj7–iii7–IVmaj7–iv7</label>
                <label><input type="checkbox" data-pattern="Imaj7–♭VIImaj7–IVmaj7"> Imaj7–♭VIImaj7–IVmaj7</label>
                <label><input type="checkbox" data-pattern="Imaj9–VI7–ii9–V13"> Imaj9–VI7–ii9–V13</label>
                <label><input type="checkbox" data-pattern="Imaj9–VI13–ii11–V13"> Imaj9–VI13–ii11–V13</label>
                <label><input type="checkbox" data-pattern="Imaj9–♯IV°7–ii9–V13"> Imaj9–♯IV°7–ii9–V13</label>
                <label><input type="checkbox" data-pattern="Imaj7–IIImaj7–vi9–IVmaj7"> Imaj7–IIImaj7–vi9–IVmaj7</label>
                <label><input type="checkbox" data-pattern="Imaj9–♭IImaj7–vi11–V13♯11"> Imaj9–♭IImaj7–vi11–V13♯11</label>
                <label><input type="checkbox" data-pattern="Imaj9–♭IIImaj7–IVmaj9–iv7"> Imaj9–♭IIImaj7–IVmaj9–iv7</label>
                <label><input type="checkbox" data-pattern="Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13"> Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13</label>
                <div class="option-divider">Circle of Fifths &amp; Applied Chords</div>
                <label><input type="checkbox" data-pattern="I–III7–vi–II7–ii–V–I"> I–III7–vi–II7–ii–V–I</label>
                <label><input type="checkbox" data-pattern="iii–VI7–ii–V–I"> iii–VI7–ii–V–I</label>
                <label><input type="checkbox" data-pattern="vi–II7–ii–V–I"> vi–II7–ii–V–I</label>
                <label><input type="checkbox" data-pattern="I–III7–vi"> I–III7–vi</label>
                <label><input type="checkbox" data-pattern="vi–II7–V"> vi–II7–V</label>
                <label><input type="checkbox" data-pattern="ii–♭II7–I"> ii–♭II7–I</label>
                <label><input type="checkbox" data-pattern="♭II7–I"> ♭II7–I</label>
                <div class="option-divider">Cadences &amp; Color Chords</div>
                <label><input type="checkbox" data-pattern="V–vi"> V–vi</label>
                <label><input type="checkbox" data-pattern="V–IV"> V–IV</label>
                <label><input type="checkbox" data-pattern="Imaj7–viiø7–iii7–vi7"> Imaj7–viiø7–iii7–vi7</label>
                <label><input type="checkbox" data-pattern="Imaj7♯11–IImaj7"> Imaj7♯11–IImaj7</label>
                <label><input type="checkbox" data-pattern="Imaj7♯11–♭VIImaj7"> Imaj7♯11–♭VIImaj7</label>
              </div>
```

Note: none of the 31 new `<input>` elements have a `checked` attribute — unchecked by default, per the global constraint.

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-jazz-progressions-content.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Commit**

```bash
git add script.js index.html test-jazz-progressions-content.cjs
git commit -m "Add 31 jazz-extended progressions with checkboxes"
```

---

### Task 4: 4 new Learning Path stages

**Files:**
- Modify: `script.js` (`LEARNING_PATH` — insert 4 stages between `'Minor Borrowed — ♭II'` and `'Functional, Nat. Keys'`; `LEARNING_PATH_PHASES` — `'Functional harmony'` count 22→26)
- Modify: `test-all-paths-popup-redesign.cjs`, `test-audit-fixes-extended-chords-phase.cjs`, `test-audit-fixes-scales-phase.cjs` (the 3 dedicated cross-cutting absolute-total assertions)
- Test: `test-jazz-progressions-learning-path.cjs`

**Interfaces:**
- Consumes: the 31 new `FUNCTIONAL.major` entries (Task 3), `applyStage()`/`getStageMastery()` (unchanged mechanism — `getStageMastery()` already tracks any `stage.progressions` entry generically via the `variations` bucket keyed by the full pattern string, same as every prior tier; no left-hand-style isolation issue here).
- Produces: nothing other tasks depend on — this is the last task.

- [ ] **Step 1: Write the failing test**

Create `test-jazz-progressions-learning-path.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const stageData = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Jazz 7th Chords');
    const stages = LEARNING_PATH.slice(idx, idx + 4);
    return {
      afterMinorBorrowed: LEARNING_PATH[idx - 1]?.name === 'Minor Borrowed — ♭II',
      beforeNatKeys: LEARNING_PATH[idx + 4]?.name === 'Functional, Nat. Keys',
      names: stages.map(s => s.name),
      counts: stages.map(s => (s.progressions || []).length),
      notes: stages.map(s => s.notes),
      timers: stages.map(s => s.timer),
    };
  });
  checkTrue('the 4 new stages start right after "Minor Borrowed — ♭II"', stageData.afterMinorBorrowed, JSON.stringify(stageData.names));
  checkTrue('"Functional, Nat. Keys" immediately follows the 4 new stages', stageData.beforeNatKeys, null);
  check('stage names in order', stageData.names, [
    'Jazz 7th Chords', 'Extended 9ths, 11ths & 13ths', 'Circle of Fifths & Applied Chords', 'Cadences & Color Chords',
  ]);
  check('cumulative progression counts (81 base + 8/19/26/31)', stageData.counts, [89, 100, 107, 112]);
  check('all 4 stages are timer off', stageData.timers, ['off', 'off', 'off', 'off']);
  check('all 4 stages are C only (no key ramp needed here)', stageData.notes, [['C'], ['C'], ['C'], ['C']]);

  const contentSpotCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Jazz 7th Chords');
    const [s1, s2, s3, s4] = LEARNING_PATH.slice(idx, idx + 4);
    return {
      s1HasOwn: ['I–VI7–ii–V', 'ii9–V13–Imaj9'].every(p => s1.progressions.includes(p)),
      s2LacksS3Only: !s2.progressions.includes('I–III7–vi–II7–ii–V–I'),
      s2HasOwn: ['Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13'].every(p => s2.progressions.includes(p)),
      s3HasOwn: ['I–III7–vi–II7–ii–V–I', '♭II7–I'].every(p => s3.progressions.includes(p)),
      s4HasOwn: ['V–vi', 'V–IV', 'Imaj7–viiø7–iii7–vi7', 'Imaj7♯11–IImaj7', 'Imaj7♯11–♭VIImaj7'].every(p => s4.progressions.includes(p)),
    };
  });
  checkTrue('stage 1 has its own jazz-7th content', contentSpotCheck.s1HasOwn, null);
  checkTrue('stage 2 does not yet have stage-3-only content', contentSpotCheck.s2LacksS3Only, null);
  checkTrue('stage 2 has its own extended-9/11/13 content', contentSpotCheck.s2HasOwn, null);
  checkTrue('stage 3 has its own Circle-of-Fifths/applied-chord content', contentSpotCheck.s3HasOwn, null);
  checkTrue('stage 4 has all 5 of its own cadence/color-chord entries', contentSpotCheck.s4HasOwn, null);

  const applyStageCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Jazz 7th Chords');
    applyStage(idx);
    return {
      ownChecked: document.querySelector('input[data-pattern="Imaj7–iii7–vi7–ii7–V7"]').checked,
      laterStageUnchecked: document.querySelector('input[data-pattern="V–vi"]').checked, // stage 4 only
    };
  });
  check('applyStage() on "Jazz 7th Chords" checks its own content', applyStageCheck.ownChecked, true);
  check('applyStage() leaves stage-4-only content unchecked', applyStageCheck.laterStageUnchecked, false);

  const phaseCheck = await page.evaluate(() => ({
    functionalHarmonyCount: LEARNING_PATH_PHASES.find(p => p.name === 'Functional harmony').count,
    phaseCount: LEARNING_PATH_PHASES.length,
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  check('Functional harmony phase count is 26 (22 + 4 new stages)', phaseCheck.functionalHarmonyCount, 26);
  check('LEARNING_PATH_PHASES still has 18 entries (no new phase, just a bigger existing one)', phaseCheck.phaseCount, 18);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 124 stages total (120 + 4 new)', phaseCheck.totalStages, 124);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-jazz-progressions-learning-path.cjs`
Expected: FAIL — `'Jazz 7th Chords'` doesn't exist yet, cascading into failures on every subsequent check.

- [ ] **Step 3: Insert the 4 new stages**

Current code (`script.js`):

```javascript
  { name: 'Minor Borrowed — ♭II',             hint: 'The Neapolitan chord in a minor key — same borrowed relationship, different tonic mode',          cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

Replace with:

```javascript
  { name: 'Minor Borrowed — ♭II',             hint: 'The Neapolitan chord in a minor key — same borrowed relationship, different tonic mode',          cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i'], timer: 'off' },
  { name: 'Jazz 7th Chords',                  hint: 'Roman numerals with jazz 7th-chord qualities — maj7, m7, and dominant 7',                        cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i','I–VI7–ii–V','Imaj7–iii7–vi7–ii7–V7','iii7–vi7–ii7–V7–Imaj7','vi7–ii7–V7–Imaj7','Imaj7–VI7–ii7–V7','Imaj7–vi7–IVmaj7–V13','vi9–V13–Imaj9–IVmaj9','ii9–V13–Imaj9'], timer: 'off' },
  { name: 'Extended 9ths, 11ths & 13ths',     hint: '9th, 11th, and 13th chord extensions on the same familiar roman numerals',                        cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i','I–VI7–ii–V','Imaj7–iii7–vi7–ii7–V7','iii7–vi7–ii7–V7–Imaj7','vi7–ii7–V7–Imaj7','Imaj7–VI7–ii7–V7','Imaj7–vi7–IVmaj7–V13','vi9–V13–Imaj9–IVmaj9','ii9–V13–Imaj9','IVmaj7–V7–iii7–vi7–ii7–V7','Imaj7–IVmaj7–ii7–V13','Imaj7–iii7–IVmaj7–iv7','Imaj7–♭VIImaj7–IVmaj7','Imaj9–VI7–ii9–V13','Imaj9–VI13–ii11–V13','Imaj9–♯IV°7–ii9–V13','Imaj7–IIImaj7–vi9–IVmaj7','Imaj9–♭IImaj7–vi11–V13♯11','Imaj9–♭IIImaj7–IVmaj9–iv7','Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13'], timer: 'off' },
  { name: 'Circle of Fifths & Applied Chords',hint: 'Longer sequences moving through the circle of fifths, plus dominant-7-flavored borrowed chords',   cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i','I–VI7–ii–V','Imaj7–iii7–vi7–ii7–V7','iii7–vi7–ii7–V7–Imaj7','vi7–ii7–V7–Imaj7','Imaj7–VI7–ii7–V7','Imaj7–vi7–IVmaj7–V13','vi9–V13–Imaj9–IVmaj9','ii9–V13–Imaj9','IVmaj7–V7–iii7–vi7–ii7–V7','Imaj7–IVmaj7–ii7–V13','Imaj7–iii7–IVmaj7–iv7','Imaj7–♭VIImaj7–IVmaj7','Imaj9–VI7–ii9–V13','Imaj9–VI13–ii11–V13','Imaj9–♯IV°7–ii9–V13','Imaj7–IIImaj7–vi9–IVmaj7','Imaj9–♭IImaj7–vi11–V13♯11','Imaj9–♭IIImaj7–IVmaj9–iv7','Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13','I–III7–vi–II7–ii–V–I','iii–VI7–ii–V–I','vi–II7–ii–V–I','I–III7–vi','vi–II7–V','ii–♭II7–I','♭II7–I'], timer: 'off' },
  { name: 'Cadences & Color Chords',          hint: 'Deceptive cadences, a half-diminished passing chord, and Lydian-flavored color chords',           cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i','I–VI7–ii–V','Imaj7–iii7–vi7–ii7–V7','iii7–vi7–ii7–V7–Imaj7','vi7–ii7–V7–Imaj7','Imaj7–VI7–ii7–V7','Imaj7–vi7–IVmaj7–V13','vi9–V13–Imaj9–IVmaj9','ii9–V13–Imaj9','IVmaj7–V7–iii7–vi7–ii7–V7','Imaj7–IVmaj7–ii7–V13','Imaj7–iii7–IVmaj7–iv7','Imaj7–♭VIImaj7–IVmaj7','Imaj9–VI7–ii9–V13','Imaj9–VI13–ii11–V13','Imaj9–♯IV°7–ii9–V13','Imaj7–IIImaj7–vi9–IVmaj7','Imaj9–♭IImaj7–vi11–V13♯11','Imaj9–♭IIImaj7–IVmaj9–iv7','Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13','I–III7–vi–II7–ii–V–I','iii–VI7–ii–V–I','vi–II7–ii–V–I','I–III7–vi','vi–II7–V','ii–♭II7–I','♭II7–I','V–vi','V–IV','Imaj7–viiø7–iii7–vi7','Imaj7♯11–IImaj7','Imaj7♯11–♭VIImaj7'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

- [ ] **Step 4: Update `LEARNING_PATH_PHASES`**

Current code (`script.js`):

```javascript
  { name: 'Functional harmony', count: 22 },
```

Replace with:

```javascript
  { name: 'Functional harmony', count: 26 },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-jazz-progressions-learning-path.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Update the 3 dedicated cross-cutting absolute-total test files**

In `test-all-paths-popup-redesign.cjs`, change:

```javascript
  check('LEARNING_PATH.length matches the expected 120 stages', phaseData.stageCount, 120);
```
to:
```javascript
  check('LEARNING_PATH.length matches the expected 124 stages', phaseData.stageCount, 124);
```

Change:
```javascript
  check('all 120 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 120);
```
to:
```javascript
  check('all 124 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 124);
```

(The `18 entries`/`18 phase headers`/`18 phase bodies` assertions in this file are unchanged — this batch does not add a new phase.)

In `test-audit-fixes-extended-chords-phase.cjs`, change:
```javascript
  check('LEARNING_PATH has 120 stages (125 - 10 trimmed by the key-ramp audit + 5 new Left-Hand stages)', data.totalStages, 120);
```
to:
```javascript
  check('LEARNING_PATH has 124 stages (120 + 4 new jazz-extended progression stages)', data.totalStages, 124);
```

In `test-audit-fixes-scales-phase.cjs`, change:
```javascript
  check('LEARNING_PATH has the expected 120 stages', data.totalStages, 120);
```
to:
```javascript
  check('LEARNING_PATH has the expected 124 stages', data.totalStages, 124);
```

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-tonal-vendored.cjs
node test-jazz-numeral-resolution.cjs
node test-jazz-progressions-content.cjs
node test-jazz-progressions-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-more-progressions.cjs
node test-progression-curriculum-fix.cjs
node test-borrowed-numerals-resolution.cjs
node test-borrowed-checkbox-gating.cjs
node test-borrowed-chords-content.cjs
node test-borrowed-chords-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-learning-stage-persistence.cjs
```

Expected: `RESULT: PASS` on all seventeen.

- [ ] **Step 8: Commit**

```bash
git add script.js test-jazz-progressions-learning-path.cjs test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs
git commit -m "Add 4 Learning Path stages teaching jazz-extended progressions"
```
