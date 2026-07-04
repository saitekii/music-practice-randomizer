const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const CHORD_TYPES = [
  { id: 'chordMajor',      label: 'Major',       seventh: false },
  { id: 'chordMinor',      label: 'Minor',       seventh: false },
  { id: 'chordDiminished', label: 'Diminished',  seventh: false },
  { id: 'chordAugmented',  label: 'Augmented',   seventh: false },
  { id: 'chordMaj7',       label: 'Major 7',     seventh: true  },
  { id: 'chordMin7',       label: 'Minor 7',     seventh: true  },
  { id: 'chordDom7',       label: 'Dominant 7',  seventh: true  },
  // Jazz extensions
  { id: 'chordSus2',    label: 'sus2',         seventh: false },
  { id: 'chordSus4',    label: 'sus4',         seventh: false },
  { id: 'chord7sus4',   label: '7sus4',        seventh: true  },
  { id: 'chordDom9',    label: 'Dominant 9',   seventh: true  },
  { id: 'chordMaj9',    label: 'Major 9',      seventh: true  },
  { id: 'chordMin9',    label: 'Minor 9',      seventh: true  },
  { id: 'chordDom13',   label: 'Dominant 13',  seventh: true  },
  { id: 'chord7b9',     label: '7♭9',          seventh: true  },
  { id: 'chord7s9',     label: '7♯9',          seventh: true  },
  { id: 'chord7s11',    label: '7♯11',         seventh: true  },
  { id: 'chordHalfDim', label: 'Minor 7♭5',    seventh: true  },
  { id: 'chordDim7',    label: 'Diminished 7', seventh: true  },
];

const TRIAD_INVERSIONS   = ['Root position', '1st inversion', '2nd inversion'];
const SEVENTH_INVERSIONS = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

const SCALE_TYPES = [
  { id: 'scaleMajor',     label: 'Major'            },
  { id: 'scaleNatMinor',  label: 'Natural minor'    },
  { id: 'scaleHarmMinor', label: 'Harmonic minor'   },
  { id: 'scaleMelMinor',  label: 'Melodic minor'    },
  { id: 'scaleMajPent',   label: 'Major pentatonic' },
  { id: 'scaleMinPent',   label: 'Minor pentatonic' },
  { id: 'scaleModes',     label: null               },
];

const MODES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];

const INTERVALS = [
  { id: 'intMin2',  label: 'Minor 2nd'   },
  { id: 'intMaj2',  label: 'Major 2nd'   },
  { id: 'intMin3',  label: 'Minor 3rd'   },
  { id: 'intMaj3',  label: 'Major 3rd'   },
  { id: 'intPerf4', label: 'Perfect 4th' },
  { id: 'intTT',    label: 'Tritone'     },
  { id: 'intPerf5', label: 'Perfect 5th' },
  { id: 'intMin6',  label: 'Minor 6th'   },
  { id: 'intMaj6',  label: 'Major 6th'   },
  { id: 'intMin7',  label: 'Minor 7th'   },
  { id: 'intMaj7',  label: 'Major 7th'   },
  { id: 'intOct',   label: 'Octave'      },
];

const DIATONIC = {
  major: {
    intervals: [0, 2, 4, 5, 7, 9, 11],
    qualities: ['Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished'],
    numerals:  ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  },
  minor: {
    intervals: [0, 2, 3, 5, 7, 8, 10],
    qualities: ['Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major'],
    numerals:  ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
  },
};

const FUNCTIONAL = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V'],
};

const CHORD_INTERVALS = {
  'Major':        [0, 4, 7],
  'Minor':        [0, 3, 7],
  'Diminished':   [0, 3, 6],
  'Augmented':    [0, 4, 8],
  'Major 7':      [0, 4, 7, 11],
  'Minor 7':      [0, 3, 7, 10],
  'Dominant 7':   [0, 4, 7, 10],
  'sus2':         [0, 2, 7],
  'sus4':         [0, 5, 7],
  '7sus4':        [0, 5, 7, 10],
  'Dominant 9':   [0, 2, 4, 7, 10],
  'Major 9':      [0, 2, 4, 7, 11],
  'Minor 9':      [0, 2, 3, 7, 10],
  'Dominant 13':  [0, 2, 4, 7, 9, 10],
  '7♭9':          [0, 1, 4, 7, 10],
  '7♯9':          [0, 3, 4, 7, 10],
  '7♯11':         [0, 4, 6, 7, 10],
  'Minor 7♭5':    [0, 3, 6, 10],
  'Diminished 7': [0, 3, 6, 9],
};

const SCALE_INTERVALS = {
  'Major':            [0, 2, 4, 5, 7, 9, 11],
  'Natural minor':    [0, 2, 3, 5, 7, 8, 10],
  'Harmonic minor':   [0, 2, 3, 5, 7, 8, 11],
  'Melodic minor':    [0, 2, 3, 5, 7, 9, 11],
  'Major pentatonic': [0, 2, 4, 7, 9],
  'Minor pentatonic': [0, 3, 5, 7, 10],
  'Ionian':           [0, 2, 4, 5, 7, 9, 11],
  'Dorian':           [0, 2, 3, 5, 7, 9, 10],
  'Phrygian':         [0, 1, 3, 5, 7, 8, 10],
  'Lydian':           [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian':       [0, 2, 4, 5, 7, 9, 10],
  'Aeolian':          [0, 2, 3, 5, 7, 8, 10],
  'Locrian':          [0, 1, 3, 5, 6, 8, 10],
};

const INTERVAL_SEMITONES = {
  'Minor 2nd': 1, 'Major 2nd': 2, 'Minor 3rd': 3,  'Major 3rd': 4,
  'Perfect 4th': 5, 'Tritone': 6, 'Perfect 5th': 7, 'Minor 6th': 8,
  'Major 6th': 9,  'Minor 7th': 10, 'Major 7th': 11, 'Octave': 12,
};

const LEARNING_PATH = [
  // Phase 1: Note Finder
  { name: 'Find C',            hint: 'Just find C on your instrument — nothing else',          cats: ['catNotes'], notes: ['C'],                                                                       chords: [],                                                             scales: [],                            timer: 'off' },
  { name: 'C and D',           hint: 'Two notes',                                              cats: ['catNotes'], notes: ['C','D'],                                                                   chords: [],                                                             scales: [],                            timer: 'off' },
  { name: 'Add E',             hint: 'C, D and E',                                             cats: ['catNotes'], notes: ['C','D','E'],                                                               chords: [],                                                             scales: [],                            timer: 'off' },
  { name: 'Add F',             hint: 'C, D, E, F',                                             cats: ['catNotes'], notes: ['C','D','E','F'],                                                           chords: [],                                                             scales: [],                            timer: 'off' },
  { name: 'Add G',             hint: 'C through G — the first five natural notes',             cats: ['catNotes'], notes: ['C','D','E','F','G'],                                                       chords: [],                                                             scales: [],                            timer: 'off' },
  { name: 'Add A',             hint: 'C, D, E, F, G, A',                                       cats: ['catNotes'], notes: ['C','D','E','F','G','A'],                                                   chords: [],                                                             scales: [],                            timer: 'off' },
  { name: 'All Natural Notes', hint: 'All seven natural notes — C through B',                  cats: ['catNotes'], notes: ['C','D','E','F','G','A','B'],                                               chords: [],                                                             scales: [],                            timer: 'off' },
  // Phase 2: Major chords, natural keys, no timer
  { name: 'First Chord',        hint: 'Just C Major',                                           cats: ['catChords'], notes: ['C'],                                                                     chords: ['chordMajor'],                                                 scales: [],                            timer: 'off' },
  { name: 'Two Chords',         hint: 'C Major and G Major',                                    cats: ['catChords'], notes: ['C','G'],                                                                  chords: ['chordMajor'],                                                 scales: [],                            timer: 'off' },
  { name: 'Three Chords',       hint: 'C, F and G — the backbone of most songs',                cats: ['catChords'], notes: ['C','F','G'],                                                              chords: ['chordMajor'],                                                 scales: [],                            timer: 'off' },
  { name: 'Add D Major',        hint: 'C, D, F, G Major',                                       cats: ['catChords'], notes: ['C','D','F','G'],                                                          chords: ['chordMajor'],                                                 scales: [],                            timer: 'off' },
  { name: 'Add A Major',        hint: 'C, D, F, G, A Major',                                    cats: ['catChords'], notes: ['C','D','F','G','A'],                                                      chords: ['chordMajor'],                                                 scales: [],                            timer: 'off' },
  { name: 'Add E Major',        hint: 'C, D, E, F, G, A Major',                                 cats: ['catChords'], notes: ['C','D','E','F','G','A'],                                                  chords: ['chordMajor'],                                                 scales: [],                            timer: 'off' },
  { name: 'All Natural Majors', hint: 'Major chord across all seven natural keys',              cats: ['catChords'], notes: ['C','D','E','F','G','A','B'],                                              chords: ['chordMajor'],                                                 scales: [],                            timer: 'off' },
  // Phase 3: Introduce minor
  { name: 'First Minor',        hint: 'C + A — a relative pair (Major and Minor)',              cats: ['catChords'], notes: ['C','A'],                                                                   chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: 'off' },
  { name: 'More Minors',        hint: 'Six chords: C/G/F Major + A/E/D Minor',                  cats: ['catChords'], notes: ['C','D','E','F','G','A'],                                                  chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: 'off' },
  { name: 'All Natural Minor',  hint: 'Major and Minor in every natural key',                   cats: ['catChords'], notes: ['C','D','E','F','G','A','B'],                                              chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: 'off' },
  // Phase 4: Add timer pressure
  { name: 'Add a Timer',        hint: 'Same chords — 15 seconds to respond',                    cats: ['catChords'], notes: ['C','D','E','F','G','A','B'],                                              chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '15' },
  { name: 'A Bit Faster',       hint: '10 seconds',                                             cats: ['catChords'], notes: ['C','D','E','F','G','A','B'],                                              chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '10' },
  { name: 'Faster Still',       hint: '5 seconds',                                              cats: ['catChords'], notes: ['C','D','E','F','G','A','B'],                                              chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '5'  },
  // Phase 5: Accidentals one at a time
  { name: 'Add F♯',        hint: 'First accidental — F sharp',                             cats: ['catChords'], notes: ['C','D','E','F','F#','G','A','B'],                                         chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '10' },
  { name: 'Add B♭',        hint: 'B flat added',                                           cats: ['catChords'], notes: ['C','D','E','F','F#','G','A','Bb','B'],                                    chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '10' },
  { name: 'Add E♭',        hint: 'E flat added',                                           cats: ['catChords'], notes: ['C','D','Eb','E','F','F#','G','A','Bb','B'],                               chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '10' },
  { name: 'Add A♭',        hint: 'A flat added',                                           cats: ['catChords'], notes: ['C','D','Eb','E','F','F#','G','Ab','A','Bb','B'],                          chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '10' },
  { name: 'Add C♯',        hint: 'Last accidental — all 12 keys now',                      cats: ['catChords'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],                     chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '10' },
  { name: 'Speed Up',           hint: 'All 12 keys, 5 seconds',                                 cats: ['catChords'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],                     chords: ['chordMajor','chordMinor'],                                     scales: [],                            timer: '5'  },
  // Phase 6: Major scales
  { name: 'First Scale',        hint: 'C Major scale — no timer, take your time',               cats: ['catScales'], notes: ['C'],                                                                     chords: [],                                                             scales: ['scaleMajor'],                timer: 'off' },
  { name: 'Add G Major Scale',  hint: 'C and G Major scales',                                   cats: ['catScales'], notes: ['C','G'],                                                                  chords: [],                                                             scales: ['scaleMajor'],                timer: 'off' },
  { name: 'Add F Major Scale',  hint: 'C, G and F',                                             cats: ['catScales'], notes: ['C','F','G'],                                                              chords: [],                                                             scales: ['scaleMajor'],                timer: 'off' },
  { name: 'Common Majors',      hint: 'Six keys: C, G, D, F, A, E Major scales',                cats: ['catScales'], notes: ['C','D','E','F','G','A'],                                                  chords: [],                                                             scales: ['scaleMajor'],                timer: 'off' },
  { name: 'All Natural Scales', hint: 'Major scale across all seven natural notes',             cats: ['catScales'], notes: ['C','D','E','F','G','A','B'],                                              chords: [],                                                             scales: ['scaleMajor'],                timer: 'off' },
  { name: 'Scale Timer',        hint: 'Natural keys, 15 seconds',                               cats: ['catScales'], notes: ['C','D','E','F','G','A','B'],                                              chords: [],                                                             scales: ['scaleMajor'],                timer: '15' },
  { name: 'All 12 Scales',      hint: 'Every key, 15 seconds',                                  cats: ['catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],                     chords: [],                                                             scales: ['scaleMajor'],                timer: '15' },
  // Phase 7: Combine chords + scales
  { name: 'Mix Chords + Scales',hint: 'Major chords and scales together — natural keys, 15s',  cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                   chords: ['chordMajor','chordMinor'],                                     scales: ['scaleMajor'],                timer: '15' },
  { name: 'All 12 Combined',    hint: 'Chords and scales in every key, 10 seconds',             cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],          chords: ['chordMajor','chordMinor'],                                     scales: ['scaleMajor'],                timer: '10' },
  { name: 'Add Minor Scale',    hint: 'Natural Minor scale added to the mix',                   cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],          chords: ['chordMajor','chordMinor'],                                     scales: ['scaleMajor','scaleNatMinor'],timer: '10' },
  // Phase 8: Seventh chords
  { name: 'Add Major 7',        hint: 'Introduce Major 7 chords — natural keys',                cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                   chords: ['chordMajor','chordMinor','chordMaj7'],                         scales: ['scaleMajor','scaleNatMinor'],timer: '10' },
  { name: 'Add Minor 7',        hint: 'Minor 7 added',                                          cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                   chords: ['chordMajor','chordMinor','chordMaj7','chordMin7'],             scales: ['scaleMajor','scaleNatMinor'],timer: '10' },
  { name: 'Add Dominant 7',     hint: 'Dominant 7 — now you have the core jazz chords',         cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                   chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7'], scales: ['scaleMajor','scaleNatMinor'],timer: '10' },
  { name: '7ths in All Keys',   hint: 'All seventh chord types across all 12 keys',             cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],          chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7'], scales: ['scaleMajor','scaleNatMinor'],timer: '10' },
  // Full foundation
  { name: 'Full Foundation',    hint: 'Everything — all 12 keys, all core chords, both scales, 5 seconds', cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7'], scales: ['scaleMajor','scaleNatMinor'], timer: '5' },
];

// ── DOM ───────────────────────────────────────────────────────────────────────

const promptLine1    = document.getElementById('promptLine1');
const promptLine2    = document.getElementById('promptLine2');
const promptCard     = document.getElementById('promptCard');
const nextBtn        = document.getElementById('nextBtn');
const backBtn        = document.getElementById('backBtn');
const holdBtn        = document.getElementById('holdBtn');
const timerDisplay   = document.getElementById('timerDisplay');
const customTimer    = document.getElementById('customTimer');
const customTimerRow = document.getElementById('customTimerRow');
const metroBpmInput  = document.getElementById('metroBpm');
const tapBtn         = document.getElementById('tapBtn');
const metroPanel     = document.getElementById('metroPanel');

const pathStart          = document.getElementById('pathStart');
const pathActive         = document.getElementById('pathActive');
const pathStageNum       = document.getElementById('pathStageNum');
const pathStageName      = document.getElementById('pathStageName');
const pathStageHint      = document.getElementById('pathStageHint');
const pathProgressFill   = document.getElementById('pathProgressFill');
const startPathBtn       = document.getElementById('startPathBtn');
const stagePrevBtn       = document.getElementById('stagePrevBtn');
const stageNextBtn       = document.getElementById('stageNextBtn');
const leavePathBtn       = document.getElementById('leavePathBtn');
const learningHeaderLabel = document.getElementById('learningHeaderLabel');
const midiBtn             = document.getElementById('midiBtn');
const midiStatus          = document.getElementById('midiStatus');
const synthVolWrap        = document.getElementById('synthVolWrap');
const synthVolumeSlider   = document.getElementById('synthVolume');
const synthPresetSelect   = document.getElementById('synthPreset');
const rtDisplay           = document.getElementById('rtDisplay');
const midiStats           = document.getElementById('midiStats');
const pianoKeyboard       = document.getElementById('pianoKeyboard');
const hearBtn             = document.getElementById('hearBtn');
const helpBtn             = document.getElementById('helpBtn');
const helpModal           = document.getElementById('helpModal');
const helpClose           = document.getElementById('helpClose');
const statsModal          = document.getElementById('statsModal');
const statsClose          = document.getElementById('statsClose');

// ── State ─────────────────────────────────────────────────────────────────────

let lastPromptKey  = null;
let timerInterval  = null;
let timerRemaining = 0;

let promptHistory = [];
let historyIndex  = 0;
let isHeld        = false;

let metroIntervalId = null;
let metroBeat       = 0;  // position within bar (0-indexed)
let metroCount      = 0;  // quarter-note beats since last chord change
let tapTimes        = [];
let audioCtx        = null;

let prevSettings  = null;
let undoTimeout   = null;
let learningStage = -1;

let currentPromptKey  = '';
let midiEnabled       = false;
let midiAccess        = null;
let heldNotes         = new Set();
let scaleNotesPlayed  = new Set();
let midiCheckTimer    = null;
let midiSuccessActive = false;

let synthMasterGain    = null;
const synthNotes       = new Map();
let currentSynthPreset = localStorage.getItem('mpr_synth_preset') || 'Rhodes';

let promptStartTime = null;
let responseTimes   = [];
const keyElements   = new Map(); // midiNote → DOM element
let rtFadeTimer     = null;

let pedalDown      = false;
let sustainedNotes = new Set();

const demoNotes = new Set();
let hearItActive = false;

let adaptWeights = (() => {
  try { return JSON.parse(localStorage.getItem('mpr_weights')) || { roots: {}, types: {} }; }
  catch (_) { return { roots: {}, types: {} }; }
})();

let wakeLock = null;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (_) {}
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

function syncWakeLock() {
  const active = timerInterval || metroIntervalId || sessionInterval;
  if (active) acquireWakeLock(); else releaseWakeLock();
}

// Re-acquire after tab becomes visible again (OS releases the lock on hide)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncWakeLock();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function enabledNotes() {
  return NOTES.filter(n => document.querySelector(`input[data-note="${n}"]`).checked);
}

function checked(id) {
  return document.getElementById(id).checked;
}

function getTimerMode() {
  return document.querySelector('input[name="timer"]:checked')?.value ?? 'off';
}

// ── Adaptive weighting ────────────────────────────────────────────────────────

function adaptiveOn() {
  return document.getElementById('adaptiveToggle')?.checked ?? false;
}

function saveAdaptWeights() {
  localStorage.setItem('mpr_weights', JSON.stringify(adaptWeights));
}

function updateAdaptWeight(dim, key, ms) {
  const g = adaptWeights[dim];
  if (!g[key]) g[key] = { ema: ms, count: 1 };
  else { g[key].ema = 0.3 * ms + 0.7 * g[key].ema; g[key].count = Math.min(g[key].count + 1, 9999); }
}

function weightedPick(items, dim) {
  if (!adaptiveOn() || items.length <= 1) return pick(items);
  const g = adaptWeights[dim];
  const emas = items.map(item => { const e = g[item]; return (e && e.count >= 3) ? e.ema : null; });
  const withData = emas.filter(v => v !== null);
  const mean = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : null;
  const weights = emas.map(v => (mean && v) ? Math.max(0.5, Math.min(3.0, v / mean)) : 1.0);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function renderStats() {
  const rootEntries = Object.entries(adaptWeights.roots);
  const typeEntries = Object.entries(adaptWeights.types);

  if (!rootEntries.length && !typeEntries.length) {
    return `<p class="stats-empty">No data yet. Play prompts with MIDI enabled — each correct answer starts building your profile.</p>`;
  }

  const totalAnswers = rootEntries.reduce((s, [, e]) => s + e.count, 0);
  const summaryHtml = `<p class="stats-summary">${totalAnswers} answer${totalAnswers === 1 ? '' : 's'} tracked across ${rootEntries.length} root${rootEntries.length === 1 ? '' : 's'} and ${typeEntries.length} type${typeEntries.length === 1 ? '' : 's'}</p>
  <div class="stats-legend">
    <span class="legend-item"><span class="legend-dot" style="background:hsl(120deg 58% 48%)"></span>Fast</span>
    <span class="legend-item"><span class="legend-dot" style="background:hsl(30deg 90% 52%)"></span>Medium</span>
    <span class="legend-item"><span class="legend-dot" style="background:hsl(0deg 70% 55%)"></span>Needs work</span>
    <span class="legend-item dim"><span class="legend-dot" style="background:var(--text-dim)"></span>Fewer than 3 answers</span>
  </div>`;

  function buildSection(entries, title) {
    if (!entries.length) return '';
    const sorted = [...entries].sort(([, a], [, b]) => b.ema - a.ema);
    const withData = sorted.filter(([, e]) => e.count >= 3);
    const maxEma = withData.length ? Math.max(...withData.map(([, e]) => e.ema)) : null;
    const minEma = withData.length ? Math.min(...withData.map(([, e]) => e.ema)) : null;
    const emaDelta = maxEma !== null && maxEma !== minEma ? maxEma - minEma : null;

    const rows = sorted.map(([key, entry]) => {
      const hasData = entry.count >= 3;
      const secs = (entry.ema / 1000).toFixed(1) + 's';

      let barHtml, badgeHtml = '';
      if (hasData && maxEma !== null) {
        const mastery = emaDelta ? (maxEma - entry.ema) / emaDelta : 0.5;
        const pct    = Math.round(mastery * 76 + 12);
        const hue    = Math.round(mastery * 120);
        barHtml = `<div class="stats-bar-track"><div class="stats-bar-fill" style="width:${pct}%;background:hsl(${hue}deg 65% 50%)"></div></div>`;
        if (mastery < 0.25)      badgeHtml = `<span class="stats-badge needs-work">needs work</span>`;
        else if (mastery > 0.75) badgeHtml = `<span class="stats-badge strong">strong</span>`;
      } else {
        barHtml = `<div class="stats-bar-track"><div class="stats-bar-fill building"></div></div>`;
        badgeHtml = `<span class="stats-badge building">${entry.count}/3</span>`;
      }

      return `<div class="stats-row${hasData ? '' : ' dim-row'}">
        <span class="stats-key">${key}</span>
        ${barHtml}
        <span class="stats-time">${secs}</span>
        <span class="stats-count">${entry.count}×</span>
        ${badgeHtml}
      </div>`;
    }).join('');

    return `<div class="stats-section"><h3 class="stats-section-title">${title}</h3>${rows}</div>`;
  }

  return summaryHtml + buildSection(rootEntries, 'Root Notes') + buildSection(typeEntries, 'Types');
}

function recordAdaptiveResult(key, ms) {
  if (!adaptiveOn()) return;
  const parts = key.split('|');
  const type  = parts[0];
  if      (type === 'note')     { updateAdaptWeight('roots', parts[1], ms); }
  else if (type === 'chord')    { updateAdaptWeight('roots', parts[1], ms); updateAdaptWeight('types', parts[2], ms); }
  else if (type === 'scale')    { updateAdaptWeight('roots', parts[1], ms); updateAdaptWeight('types', parts[2], ms); }
  else if (type === 'interval') { updateAdaptWeight('roots', parts[2], ms); updateAdaptWeight('types', parts[1], ms); }
  else if (type === 'func')     { updateAdaptWeight('roots', parts[1], ms); }
  saveAdaptWeights();
}

// ── Audio ─────────────────────────────────────────────────────────────────────

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playClick(accented) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = accented ? 1100 : 800;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(accented ? 0.55 : 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (_) {}
}

const SYNTH_PRESETS = {
  'Rhodes': {
    build(ctx, freq, vel, dest) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const now  = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vel * 0.7,  now + 0.006);
      gain.gain.exponentialRampToValueAtTime(vel * 0.35, now + 0.45);
      osc.connect(gain); gain.connect(dest); osc.start(now);
      return { gain, oscs: [osc], release: 0.55 };
    },
  },
  'Organ': {
    build(ctx, freq, vel, dest) {
      const gain = ctx.createGain();
      gain.gain.value = vel * 0.45;
      gain.connect(dest);
      const oscs = [[1, 0.5], [2, 0.28], [3, 0.14], [4, 0.08]].map(([h, lvl]) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq * h; g.gain.value = lvl;
        osc.connect(g); g.connect(gain); osc.start();
        return osc;
      });
      return { gain, oscs, release: 0.03 };
    },
  },
  'Pad': {
    build(ctx, freq, vel, dest) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 1600; filter.Q.value = 0.8;
      const gain = ctx.createGain();
      const now  = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vel * 0.55, now + 0.1);
      filter.connect(gain); gain.connect(dest);
      const oscs = [-8, 8].map(detune => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth'; osc.frequency.value = freq; osc.detune.value = detune;
        osc.connect(filter); osc.start(now);
        return osc;
      });
      return { gain, oscs, release: 1.2 };
    },
  },
  'Bell': {
    build(ctx, freq, vel, dest) {
      const gain = ctx.createGain();
      const now  = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vel * 0.65, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
      gain.connect(dest);
      const oscs = [[1, 0.7], [2.756, 0.3]].map(([h, lvl]) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq * h; g.gain.value = lvl;
        osc.connect(g); g.connect(gain); osc.start(now); osc.stop(now + 4);
        return osc;
      });
      return { gain, oscs, release: 0, freeDecay: true };
    },
  },
  'Pluck': {
    build(ctx, freq, vel, dest) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(5000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.4);
      const gain = ctx.createGain();
      const now  = ctx.currentTime;
      gain.gain.setValueAtTime(vel * 0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.start(now); osc.stop(now + 1.1);
      return { gain, oscs: [osc], release: 0, freeDecay: true };
    },
  },
};

function getSynthMasterGain() {
  if (synthMasterGain) return synthMasterGain;
  const ctx  = getAudioCtx();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 10;
  comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
  comp.connect(ctx.destination);
  synthMasterGain = ctx.createGain();
  synthMasterGain.gain.value = (parseInt(localStorage.getItem('mpr_synth_vol') ?? '70')) / 100;
  synthMasterGain.connect(comp);
  return synthMasterGain;
}

async function synthNoteOn(noteNumber, velocity) {
  synthNoteOff(noteNumber);
  try {
    const ctx = getAudioCtx();
    if (ctx.state !== 'running') await ctx.resume();
    const freq   = 440 * Math.pow(2, (noteNumber - 69) / 12);
    const vel    = velocity / 127;
    const preset = SYNTH_PRESETS[currentSynthPreset] || SYNTH_PRESETS['Rhodes'];
    const note   = preset.build(ctx, freq, vel, getSynthMasterGain());
    synthNotes.set(noteNumber, note);
  } catch (_) {}
}

function synthNoteOff(noteNumber) {
  const note = synthNotes.get(noteNumber);
  if (!note) return;
  synthNotes.delete(noteNumber);
  if (note.freeDecay) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const rel = note.release ?? 0.55;
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(Math.max(note.gain.gain.value, 0.001), now);
    note.gain.gain.exponentialRampToValueAtTime(0.0001, now + rel);
    note.oscs.forEach(o => { try { o.stop(now + rel + 0.05); } catch (_) {} });
  } catch (_) {}
}

// ── Generators ───────────────────────────────────────────────────────────────

function genChord() {
  const types = CHORD_TYPES.filter(c => checked(c.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const typeLabel = weightedPick(types.map(t => t.label), 'types');
  const type      = types.find(t => t.label === typeLabel) || pick(types);
  const note      = weightedPick(notes, 'roots');
  const useInv = checked('inversions');
  const inv    = useInv ? pick(type.seventh ? SEVENTH_INVERSIONS : TRIAD_INVERSIONS) : '';

  return {
    line1: `${note} ${type.label}`,
    line2: inv,
    key:   `chord|${note}|${type.label}|${inv}`,
  };
}

function genScale() {
  const types = SCALE_TYPES.filter(s => checked(s.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  let label;
  if (adaptiveOn()) {
    const allLabels = types.flatMap(t => t.label === null ? MODES : [t.label]);
    label = weightedPick(allLabels, 'types');
  } else {
    const type = pick(types);
    label = type.label === null ? pick(MODES) : type.label;
  }
  const note = weightedPick(notes, 'roots');

  return {
    line1: `${note} ${label}`,
    line2: '',
    key:   `scale|${note}|${label}`,
  };
}

function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const note    = weightedPick(notes, 'roots');
  const isMinor = Math.random() < 0.5;
  const mode    = isMinor ? 'minor' : 'Major';
  const pattern = pick(FUNCTIONAL[isMinor ? 'minor' : 'major']);

  return {
    line1: `Key: ${note} ${mode}`,
    line2: `Play: ${pattern}`,
    key:   `func|${note}|${mode}|${pattern}`,
  };
}

function genInterval() {
  const types = INTERVALS.filter(i => checked(i.id));
  const notes = enabledNotes();
  const dirs  = [
    checked('intDirUp')   && 'above',
    checked('intDirDown') && 'below',
  ].filter(Boolean);

  if (!types.length || !notes.length || !dirs.length) return null;

  const intLabel = weightedPick(types.map(i => i.label), 'types');
  const interval = types.find(i => i.label === intLabel) || pick(types);
  const note     = weightedPick(notes, 'roots');
  const dir      = pick(dirs);

  return {
    line1: interval.label,
    line2: `${dir} ${note}`,
    key:   `interval|${interval.label}|${note}|${dir}`,
  };
}

function genDiatonic() {
  const root    = document.getElementById('diatonicRoot').value;
  const mode    = document.getElementById('diatonicMode').value;
  const data    = DIATONIC[mode];
  const rootIdx = NOTES.indexOf(root);
  const degree  = Math.floor(Math.random() * 7);

  const chordRoot = NOTES[(rootIdx + data.intervals[degree]) % 12];
  const quality   = data.qualities[degree];
  const numeral   = data.numerals[degree];
  const modeLabel = mode === 'major' ? 'Major' : 'Minor';

  return {
    line1: `${chordRoot} ${quality}`,
    line2: `${numeral} in ${root} ${modeLabel}`,
    key:   `diatonic|${root}|${mode}|${degree}`,
  };
}

function genNote() {
  const notes = enabledNotes();
  if (!notes.length) return null;
  const note = weightedPick(notes, 'roots');
  return {
    line1: 'Find',
    line2: note,
    key:   `note|${note}`,
  };
}

function generatePrompt() {
  const pool = [];
  if (checked('catNotes'))      pool.push(genNote);
  if (checked('catChords'))     pool.push(genChord);
  if (checked('catScales'))     pool.push(genScale);
  if (checked('catFunctional')) pool.push(genFunctional);
  if (checked('catIntervals'))  pool.push(genInterval);
  if (checked('catDiatonic'))   pool.push(genDiatonic);

  if (!pool.length) return null;

  for (let i = 0; i < 12; i++) {
    const result = pick(pool)();
    if (result && result.key !== lastPromptKey) {
      lastPromptKey = result.key;
      return result;
    }
  }

  for (const fn of pool) {
    const result = fn();
    if (result) { lastPromptKey = result.key; return result; }
  }

  return null;
}

// ── Display ───────────────────────────────────────────────────────────────────

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function renderPrompt(prompt) {
  const noMotion = reducedMotion.matches;
  if (!noMotion) promptCard.classList.add('flash');

  setTimeout(() => {
    promptCard.classList.toggle('empty', !prompt);
    promptLine1.textContent = prompt ? prompt.line1 : 'Enable a category and at least one note';
    promptLine2.textContent = prompt ? prompt.line2 : '';
    if (!noMotion) promptCard.classList.remove('flash');
  }, noMotion ? 0 : 120);
}

function addToHistory(prompt) {
  if (!prompt) return;
  promptHistory.push(prompt);
  if (promptHistory.length > 10) promptHistory.shift();
}

function updateBackBtn() {
  backBtn.disabled = historyIndex >= promptHistory.length - 1;
}

function goBack() {
  if (historyIndex >= promptHistory.length - 1) return;
  historyIndex++;
  const prev = promptHistory[promptHistory.length - 1 - historyIndex];
  currentPromptKey = prev ? prev.key : '';
  scaleNotesPlayed.clear();
  updateHearBtn();
  renderPrompt(prev);
  updateBackBtn();
}

function showPrompt() {
  const prompt = generatePrompt();
  currentPromptKey = prompt ? prompt.key : '';
  scaleNotesPlayed.clear();
  updateHearBtn();
  promptStartTime = Date.now();
  clearHold();
  historyIndex = 0;
  addToHistory(prompt);
  updateBackBtn();
  if (sessionInterval) sessionPromptCount++;
  renderPrompt(prompt);

  if (getTimerMode() === 'metronome') {
    holdBtn.classList.add('hidden');
    if (!metroIntervalId) {
      startMetronome();
    } else {
      metroBeat  = 0;
      metroCount = 0;
      pulseBeat(true);
    }
  } else {
    stopMetronome();
    restartTimer();
  }
}

// ── Seconds timer ─────────────────────────────────────────────────────────────

function timerSeconds() {
  const val = getTimerMode();
  if (val === 'off' || val === 'metronome') return 0;
  if (val === 'custom') return Math.max(1, parseInt(customTimer.value) || 10);
  return parseInt(val);
}

const HOLD_ICON_PAUSE = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
const HOLD_ICON_PLAY  = '<polygon points="5 3 19 12 5 21 5 3"/>';

function clearHold() {
  isHeld = false;
  holdBtn.setAttribute('aria-pressed', 'false');
  holdBtn.setAttribute('aria-label', 'Hold current prompt');
  holdBtn.classList.remove('active');
  holdBtn.querySelector('svg').innerHTML = HOLD_ICON_PAUSE;
}

function stopTimer() {
  clearHold();
  holdBtn.classList.add('hidden');
  clearInterval(timerInterval);
  timerInterval  = null;
  timerRemaining = 0;
  timerDisplay.textContent = '';
  timerDisplay.className   = 'timer-display';
  syncWakeLock();
}

function timerTick() {
  timerRemaining--;
  if (timerRemaining <= 0) {
    showPrompt();
  } else {
    timerDisplay.textContent = timerRemaining;
    timerDisplay.classList.toggle('warning', timerRemaining <= 3);
  }
}

function restartTimer() {
  stopTimer();
  const secs = timerSeconds();
  if (secs <= 0) return;

  timerRemaining = secs;
  timerDisplay.textContent = timerRemaining;
  holdBtn.classList.remove('hidden');

  timerInterval = setInterval(timerTick, 1000);
  syncWakeLock();
}

function holdTimer() {
  if (!timerRemaining || isHeld) return;
  isHeld = true;
  clearInterval(timerInterval);
  timerInterval = null;
  holdBtn.setAttribute('aria-pressed', 'true');
  holdBtn.setAttribute('aria-label', 'Resume timer');
  holdBtn.classList.add('active');
  holdBtn.querySelector('svg').innerHTML = HOLD_ICON_PLAY;
}

function resumeTimer() {
  if (!isHeld) return;
  clearHold();
  if (timerRemaining > 0) {
    timerInterval = setInterval(timerTick, 1000);
    syncWakeLock();
  }
}

// ── Metronome ─────────────────────────────────────────────────────────────────

function getBpm() {
  return Math.min(300, Math.max(20, parseInt(metroBpmInput.value) || 120));
}

function getBeatsPerBar() {
  return parseInt(document.getElementById('metroTimeSig').value) || 4;
}

function getBeatsPerChange() {
  return parseFloat(document.getElementById('metroNoteDuration').value) || 4;
}

function pulseBeat(accented) {
  // Remove and re-add class to retrigger CSS animation on every beat
  timerDisplay.className = 'timer-display';
  void timerDisplay.offsetWidth;
  timerDisplay.textContent = metroBeat + 1;
  timerDisplay.classList.add(accented ? 'metro-accent' : 'metro-beat');
}

function metroTick() {
  metroBeat = (metroBeat + 1) % getBeatsPerBar();
  metroCount++;

  const accented = metroBeat === 0;
  playClick(accented);
  pulseBeat(accented);

  if (metroCount >= getBeatsPerChange()) {
    metroCount = 0;
    renderPrompt(generatePrompt());
  }
}

function startMetronome() {
  stopTimer();
  stopMetronome();
  metroBeat  = 0;
  metroCount = 0;
  playClick(true);
  pulseBeat(true);
  metroIntervalId = setInterval(metroTick, 60000 / getBpm());
  syncWakeLock();
}

function stopMetronome() {
  clearInterval(metroIntervalId);
  metroIntervalId = null;
  metroBeat  = 0;
  metroCount = 0;
  timerDisplay.textContent = '';
  timerDisplay.className   = 'timer-display';
  syncWakeLock();
}

// ── Tap tempo ─────────────────────────────────────────────────────────────────

function handleTap() {
  const now = performance.now();

  // Discard taps older than 3 s — user paused and is starting fresh
  tapTimes = tapTimes.filter(t => now - t < 3000);
  tapTimes.push(now);

  if (tapTimes.length >= 2) {
    const gaps = [];
    for (let i = 1; i < tapTimes.length; i++) gaps.push(tapTimes[i] - tapTimes[i - 1]);
    const avg = gaps.reduce((a, b) => a + b) / gaps.length;
    const bpm = Math.round(60000 / avg);
    metroBpmInput.value = Math.min(300, Math.max(20, bpm));
    saveSettings();

    // Hot-swap interval if metronome is already running
    if (metroIntervalId) {
      clearInterval(metroIntervalId);
      metroIntervalId = setInterval(metroTick, 60000 / getBpm());
    }
  }
}

// ── Settings persistence ──────────────────────────────────────────────────────

function saveSettings() {
  const ids = [
    'catNotes',
    'catChords', 'catScales', 'catFunctional', 'catIntervals', 'catDiatonic',
    'chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented',
    'chordMaj7', 'chordMin7', 'chordDom7',
    'chordSus2', 'chordSus4', 'chord7sus4',
    'chordDom9', 'chordMaj9', 'chordMin9', 'chordDom13',
    'chord7b9', 'chord7s9', 'chord7s11', 'chordHalfDim', 'chordDim7',
    'inversions',
    'scaleMajor', 'scaleNatMinor', 'scaleHarmMinor', 'scaleMelMinor',
    'scaleMajPent', 'scaleMinPent', 'scaleModes',
    'intMin2', 'intMaj2', 'intMin3', 'intMaj3', 'intPerf4', 'intTT',
    'intPerf5', 'intMin6', 'intMaj6', 'intMin7', 'intMaj7', 'intOct',
    'intDirUp', 'intDirDown',
    'adaptiveToggle',
  ];

  localStorage.setItem('mpr_settings', JSON.stringify({
    timer:            getTimerMode(),
    customTimer:      customTimer.value,
    checks:           Object.fromEntries(ids.map(id => [id, checked(id)])),
    notes:            Object.fromEntries(NOTES.map(n => [n, document.querySelector(`input[data-note="${n}"]`).checked])),
    diatonicRoot:     document.getElementById('diatonicRoot').value,
    diatonicMode:     document.getElementById('diatonicMode').value,
    metroBpm:         metroBpmInput.value,
    metroNoteDuration:document.getElementById('metroNoteDuration').value,
    metroTimeSig:     document.getElementById('metroTimeSig').value,
  }));
}

function loadSettings() {
  const raw = localStorage.getItem('mpr_settings');
  if (!raw) return;

  try {
    const s = JSON.parse(raw);

    const radio = document.querySelector(`input[name="timer"][value="${s.timer}"]`);
    if (radio) radio.checked = true;
    if (s.customTimer) customTimer.value = s.customTimer;

    if (s.checks) {
      Object.entries(s.checks).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.checked = val;
      });
    }

    if (s.notes) {
      NOTES.forEach(n => {
        const el = document.querySelector(`input[data-note="${n}"]`);
        if (el && s.notes[n] !== undefined) el.checked = s.notes[n];
      });
    }

    if (s.diatonicRoot) document.getElementById('diatonicRoot').value = s.diatonicRoot;
    if (s.diatonicMode) document.getElementById('diatonicMode').value = s.diatonicMode;
    if (s.metroBpm)          metroBpmInput.value = s.metroBpm;
    if (s.metroNoteDuration) document.getElementById('metroNoteDuration').value = s.metroNoteDuration;
    if (s.metroTimeSig)      document.getElementById('metroTimeSig').value = s.metroTimeSig;
  } catch (_) {}
}

// ── UI sync ───────────────────────────────────────────────────────────────────

function syncUI() {
  document.getElementById('chordsOptions').classList.toggle('disabled', !checked('catChords'));
  document.getElementById('scalesOptions').classList.toggle('disabled', !checked('catScales'));
  document.getElementById('intervalsOptions').classList.toggle('disabled', !checked('catIntervals'));
  document.getElementById('diatonicOptions').classList.toggle('disabled', !checked('catDiatonic'));

  const mode = getTimerMode();
  customTimer.disabled = mode !== 'custom';
  customTimerRow.classList.toggle('hidden', mode !== 'custom');
  metroPanel.classList.toggle('hidden', mode !== 'metronome');
}

// ── Undo toast ────────────────────────────────────────────────────────────────

const undoToast = document.getElementById('undoToast');

function showUndoToast() {
  clearTimeout(undoTimeout);
  undoToast.classList.remove('visible');
  // Force reflow so the progress bar animation restarts cleanly
  void undoToast.offsetWidth;
  undoToast.classList.add('visible');
  undoTimeout = setTimeout(() => undoToast.classList.remove('visible'), 4000);
}

function hideUndoToast() {
  clearTimeout(undoTimeout);
  undoToast.classList.remove('visible');
}

document.getElementById('undoBtn').addEventListener('click', () => {
  if (prevSettings !== null) {
    localStorage.setItem('mpr_settings', prevSettings);
    loadSettings();
    syncUI();
    showPrompt();
    prevSettings = null;
  }
  hideUndoToast();
});

// ── Shuffle settings ─────────────────────────────────────────────────────────

function randomizeSettings() {
  if (learningStage >= 0) {
    learningStage = -1;
    localStorage.removeItem('mpr_learning_stage');
    updateLearningUI();
  }
  saveSettings();  // flush current UI state before capturing snapshot
  prevSettings = localStorage.getItem('mpr_settings');

  function pickN(arr, min, max) {
    const n = min + Math.floor(Math.random() * (max - min + 1));
    return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
  }

  // Categories — at least 1, up to 3
  const allCats = ['catChords', 'catScales', 'catFunctional', 'catIntervals', 'catDiatonic'];
  const onCats  = new Set(pickN(allCats, 1, 3));
  allCats.forEach(id => { document.getElementById(id).checked = onCats.has(id); });

  // Root notes — 30% chance of all 12, otherwise 4–10 random
  const allNoteNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const onNotes = Math.random() < 0.3 ? allNoteNames : pickN(allNoteNames, 4, 10);
  const onNoteSet = new Set(onNotes);
  allNoteNames.forEach(n => {
    document.querySelector(`input[data-note="${n}"]`).checked = onNoteSet.has(n);
  });

  // Chords
  if (onCats.has('catChords')) {
    const basic = ['chordMajor','chordMinor','chordDiminished','chordAugmented','chordMaj7','chordMin7','chordDom7'];
    const jazz  = ['chordSus2','chordSus4','chord7sus4','chordDom9','chordMaj9','chordMin9','chordDom13','chord7b9','chord7s9','chord7s11','chordHalfDim','chordDim7'];
    const onBasic = new Set(pickN(basic, 2, basic.length));
    basic.forEach(id => { document.getElementById(id).checked = onBasic.has(id); });
    const includeJazz = Math.random() < 0.4;
    const onJazz = includeJazz ? new Set(pickN(jazz, 1, 4)) : new Set();
    jazz.forEach(id => { document.getElementById(id).checked = onJazz.has(id); });
    document.getElementById('inversions').checked = Math.random() < 0.3;
  }

  // Scales
  if (onCats.has('catScales')) {
    const all = ['scaleMajor','scaleNatMinor','scaleHarmMinor','scaleMelMinor','scaleMajPent','scaleMinPent','scaleModes'];
    const on  = new Set(pickN(all, 2, all.length));
    all.forEach(id => { document.getElementById(id).checked = on.has(id); });
  }

  // Intervals
  if (onCats.has('catIntervals')) {
    const all = ['intMin2','intMaj2','intMin3','intMaj3','intPerf4','intTT','intPerf5','intMin6','intMaj6','intMin7','intMaj7','intOct'];
    const on  = new Set(pickN(all, 3, all.length));
    all.forEach(id => { document.getElementById(id).checked = on.has(id); });
    const dir = Math.random();
    document.getElementById('intDirUp').checked   = dir < 0.8;
    document.getElementById('intDirDown').checked = dir > 0.2;
  }

  // Diatonic key
  if (onCats.has('catDiatonic')) {
    document.getElementById('diatonicRoot').value = allNoteNames[Math.floor(Math.random() * 12)];
    document.getElementById('diatonicMode').value = Math.random() < 0.6 ? 'major' : 'minor';
  }

  saveSettings();
  syncUI();
  showPrompt();
  showUndoToast();
}

// ── Learning Path ────────────────────────────────────────────────────────────

function applyStage(idx) {
  const stage = LEARNING_PATH[idx];
  const ALL_CATS   = ['catNotes','catChords','catScales','catFunctional','catIntervals','catDiatonic'];
  const ALL_CHORDS = CHORD_TYPES.map(c => c.id).concat(['inversions']);
  const ALL_SCALES = SCALE_TYPES.map(s => s.id);
  const onCats   = new Set(stage.cats);
  const onChords = new Set(stage.chords);
  const onScales = new Set(stage.scales);
  const onNotes  = new Set(stage.notes);

  ALL_CATS.forEach(id   => { const el = document.getElementById(id);                              if (el) el.checked = onCats.has(id);   });
  ALL_CHORDS.forEach(id => { const el = document.getElementById(id);                              if (el) el.checked = onChords.has(id); });
  ALL_SCALES.forEach(id => { const el = document.getElementById(id);                              if (el) el.checked = onScales.has(id); });
  NOTES.forEach(n       => { const el = document.querySelector(`input[data-note="${n}"]`); if (el) el.checked = onNotes.has(n);  });

  const radio = document.querySelector(`input[name="timer"][value="${stage.timer}"]`);
  if (radio) radio.checked = true;

  saveSettings();
  syncUI();
  showPrompt();
}

function updateLearningUI() {
  const total  = LEARNING_PATH.length;
  const active = learningStage >= 0 && learningStage < total;
  pathStart.classList.toggle('hidden', active);
  pathActive.classList.toggle('hidden', !active);

  if (active) {
    const stage = LEARNING_PATH[learningStage];
    pathStageNum.textContent  = `Stage ${learningStage + 1} of ${total}`;
    pathStageName.textContent = stage.name;
    pathStageHint.textContent = stage.hint;
    pathProgressFill.style.width = ((learningStage + 1) / total * 100) + '%';
    stagePrevBtn.disabled = learningStage === 0;
    stageNextBtn.disabled = learningStage === total - 1;
    learningHeaderLabel.textContent = `· Stage ${learningStage + 1}`;
  } else {
    learningHeaderLabel.textContent = '';
  }
}

// ── Practice session timer ────────────────────────────────────────────────────

const sessionCountdown    = document.getElementById('sessionCountdown');
const sessionTimeDisplay  = document.getElementById('sessionTimeDisplay');
const sessionProgressFill = document.getElementById('sessionProgressFill');
const sessionCdMeta       = document.getElementById('sessionCdMeta');
const sessionStartBtn     = document.getElementById('sessionStartBtn');
const sessionStopBtn      = document.getElementById('sessionStopBtn');
const durationPills       = document.querySelectorAll('.duration-pill');

let sessionDuration    = 5 * 60;
let sessionRemaining   = 5 * 60;
let sessionInterval    = null;
let sessionPromptCount = 0;

function formatSessionTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function beepDone() {
  try {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    [[659, 0, 0.2], [784, 0.25, 0.2], [988, 0.5, 0.5]].forEach(([freq, start, dur]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, t + start);
      gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      osc.start(t + start);
      osc.stop(t + start + dur);
    });
  } catch (_) {}
}

function updateSessionDisplay() {
  sessionTimeDisplay.textContent = formatSessionTime(sessionRemaining);
  const pct = ((sessionDuration - sessionRemaining) / sessionDuration) * 100;
  sessionProgressFill.style.width = pct + '%';
}

function stopSession() {
  clearInterval(sessionInterval);
  sessionInterval = null;
  sessionCountdown.classList.add('hidden');
  sessionStartBtn.textContent = 'Start';
  sessionRemaining = sessionDuration;
  sessionPromptCount = 0;
  sessionProgressFill.style.width = '0%';
  sessionTimeDisplay.textContent = formatSessionTime(sessionDuration);
  sessionCdMeta.textContent = 'remaining';
  sessionStopBtn.classList.remove('hidden');
  syncWakeLock();
}

function startSession() {
  clearInterval(sessionInterval);
  sessionRemaining   = sessionDuration;
  sessionPromptCount = 0;
  updateSessionDisplay();
  sessionCdMeta.textContent = 'remaining';
  sessionStopBtn.classList.remove('hidden');
  sessionCountdown.classList.remove('hidden');
  sessionStartBtn.textContent = 'Restart';

  sessionInterval = setInterval(() => {
    sessionRemaining--;
    if (sessionRemaining <= 0) {
      clearInterval(sessionInterval);
      sessionInterval = null;
      sessionProgressFill.style.width = '100%';
      sessionTimeDisplay.textContent = 'Done!';
      const mins = Math.round(sessionDuration / 60);
      const p = sessionPromptCount;
      sessionCdMeta.textContent = `${p} prompt${p !== 1 ? 's' : ''} · ${mins} min`;
      sessionStopBtn.classList.add('hidden');
      beepDone();
      setTimeout(stopSession, 3500);
    } else {
      updateSessionDisplay();
    }
  }, 1000);
  syncWakeLock();
}

durationPills.forEach(pill => {
  pill.addEventListener('click', () => {
    durationPills.forEach(p => p.classList.remove('selected'));
    pill.classList.add('selected');
    sessionDuration  = parseInt(pill.dataset.mins) * 60;
    sessionRemaining = sessionDuration;
    if (sessionInterval) {
      startSession();
    } else {
      sessionTimeDisplay.textContent = formatSessionTime(sessionDuration);
    }
  });
});

sessionStartBtn.addEventListener('click', startSession);
sessionStopBtn.addEventListener('click', stopSession);

startPathBtn.addEventListener('click', () => {
  learningStage = 0;
  localStorage.setItem('mpr_learning_stage', '0');
  updateLearningUI();
  applyStage(0);
});

stagePrevBtn.addEventListener('click', () => {
  if (learningStage <= 0) return;
  learningStage--;
  localStorage.setItem('mpr_learning_stage', String(learningStage));
  updateLearningUI();
  applyStage(learningStage);
});

stageNextBtn.addEventListener('click', () => {
  if (learningStage >= LEARNING_PATH.length - 1) return;
  learningStage++;
  localStorage.setItem('mpr_learning_stage', String(learningStage));
  updateLearningUI();
  applyStage(learningStage);
});

leavePathBtn.addEventListener('click', () => {
  learningStage = -1;
  localStorage.removeItem('mpr_learning_stage');
  updateLearningUI();
});

// ── Event listeners ───────────────────────────────────────────────────────────

nextBtn.addEventListener('click', showPrompt);
backBtn.addEventListener('click', goBack);
holdBtn.addEventListener('click', () => { if (isHeld) resumeTimer(); else holdTimer(); });

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    showPrompt();
  }
});

document.querySelectorAll('input').forEach(el => {
  el.addEventListener('change', () => {
    if (el.name === 'timer' || el.id === 'customTimer') {
      stopTimer();
      stopMetronome();
    }
    saveSettings();
    syncUI();
  });
});

customTimer.addEventListener('input', saveSettings);

document.querySelectorAll('select').forEach(el => {
  el.addEventListener('change', () => { saveSettings(); });
});

tapBtn.addEventListener('click', handleTap);
document.getElementById('shuffleBtn').addEventListener('click', randomizeSettings);

metroBpmInput.addEventListener('input', () => {
  saveSettings();
  if (metroIntervalId) {
    clearInterval(metroIntervalId);
    metroIntervalId = setInterval(metroTick, 60000 / getBpm());
  }
});

// ── Theme toggle ──────────────────────────────────────────────────────────────

const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');

const ICON_SUN  = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
const ICON_MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]').setAttribute('content',
    theme === 'light' ? '#eef0f8' : '#0a0b12'
  );
  themeIcon.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
  themeToggle.setAttribute('aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
  localStorage.setItem('mpr_theme', theme);
}

// ── MIDI ──────────────────────────────────────────────────────────────────────

function getExpectedPCs(key) {
  if (!key) return null;
  const parts = key.split('|');
  const type  = parts[0];

  if (type === 'note') {
    const pc = NOTES.indexOf(parts[1]);
    return pc === -1 ? null : { type: 'note', pc };
  }

  if (type === 'chord') {
    const rootPC    = NOTES.indexOf(parts[1]);
    const intervals = CHORD_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (rootPC + i) % 12) };
  }

  if (type === 'scale') {
    const rootPC    = NOTES.indexOf(parts[1]);
    const intervals = SCALE_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    return { type: 'scale', pcs: intervals.map(i => (rootPC + i) % 12) };
  }

  if (type === 'interval') {
    const label     = parts[1];
    const rootPC    = NOTES.indexOf(parts[2]);
    const dir       = parts[3];
    const semitones = INTERVAL_SEMITONES[label];
    if (rootPC === -1 || semitones === undefined) return null;
    if (semitones === 12) return { type: 'octave', rootPC };
    const targetPC = dir === 'above'
      ? (rootPC + semitones) % 12
      : (rootPC - semitones + 12) % 12;
    return { type: 'interval', rootPC, targetPC };
  }

  if (type === 'diatonic') {
    const rootIdx    = NOTES.indexOf(parts[1]);
    const data       = DIATONIC[parts[2]];
    const degree     = parseInt(parts[3]);
    if (rootIdx === -1 || !data) return null;
    const chordRootPC = (rootIdx + data.intervals[degree]) % 12;
    const intervals   = CHORD_INTERVALS[data.qualities[degree]];
    if (!intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
  }

  if (type === 'func') {
    const pattern = parts[3];
    if (pattern.includes('–')) return null;
    const rootIdx = NOTES.indexOf(parts[1]);
    const modeKey = parts[2] === 'Major' ? 'major' : 'minor';
    const data    = DIATONIC[modeKey];
    let degree    = data.numerals.indexOf(pattern);
    let quality;
    if (degree === -1) {
      if (pattern === 'V' && modeKey === 'minor') { degree = 4; quality = 'Major'; }
      else return null;
    } else {
      quality = data.qualities[degree];
    }
    const chordRootPC = (rootIdx + data.intervals[degree]) % 12;
    const intervals   = CHORD_INTERVALS[quality];
    if (!intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
  }

  return null;
}

function onMidiMessage(e) {
  const [status, note, velocity] = e.data;
  const cmd = status & 0xf0;

  if (cmd === 0xb0 && note === 64) {
    if (velocity >= 64 && !pedalDown) {
      pedalDown = true;
    } else if (velocity < 64 && pedalDown) {
      pedalDown = false;
      for (const n of sustainedNotes) { heldNotes.delete(n); synthNoteOff(n); }
      sustainedNotes.clear();
      updateKeyboard();
    }
    return;
  }

  if (cmd === 0x90 && velocity > 0) {
    heldNotes.add(note);
    sustainedNotes.delete(note);
    scaleNotesPlayed.add(note % 12);
    synthNoteOn(note, velocity);
    updateKeyboard();
    clearTimeout(midiCheckTimer);
    midiCheckTimer = setTimeout(checkMidi, 100);
  } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
    if (pedalDown) {
      sustainedNotes.add(note);
    } else {
      heldNotes.delete(note);
      synthNoteOff(note);
      updateKeyboard();
    }
  }
}

function checkMidi() {
  if (!midiEnabled || midiSuccessActive || heldNotes.size === 0) return;
  const expected = getExpectedPCs(currentPromptKey);
  if (!expected) return;

  const heldPCs = new Set([...heldNotes].map(n => n % 12));
  let matched = false;

  if (expected.type === 'note') {
    matched = heldPCs.has(expected.pc);
  } else if (expected.type === 'chord') {
    matched = expected.pcs.every(pc => heldPCs.has(pc));
  } else if (expected.type === 'scale') {
    matched = expected.pcs.every(pc => scaleNotesPlayed.has(pc));
  } else if (expected.type === 'interval') {
    matched = heldPCs.has(expected.rootPC) && heldPCs.has(expected.targetPC);
  } else if (expected.type === 'octave') {
    const sorted = [...heldNotes].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i] % 12 === expected.rootPC && sorted[i + 1] - sorted[i] === 12) {
        matched = true; break;
      }
    }
  }

  if (matched) triggerMidiSuccess();
}

function triggerMidiSuccess() {
  midiSuccessActive = true;
  if (promptStartTime) {
    const ms = Date.now() - promptStartTime;
    responseTimes.push(ms);
    recordAdaptiveResult(currentPromptKey, ms);
    showResponseTime(ms);
    updateMidiStats();
  }
  promptCard.classList.add('midi-success');
  setTimeout(() => {
    promptCard.classList.remove('midi-success');
    midiSuccessActive = false;
    showPrompt();
  }, 700);
}

function showResponseTime(ms) {
  const s = (ms / 1000).toFixed(1);
  clearTimeout(rtFadeTimer);
  rtDisplay.textContent = s + 's';
  rtDisplay.classList.remove('fade-out');
  rtDisplay.classList.add('visible');
  rtFadeTimer = setTimeout(() => {
    rtDisplay.classList.add('fade-out');
    setTimeout(() => rtDisplay.classList.remove('visible', 'fade-out'), 500);
  }, 1800);
}

function updateMidiStats() {
  if (responseTimes.length < 2) { midiStats.classList.add('hidden'); return; }
  const avg  = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const best = Math.min(...responseTimes);
  midiStats.textContent = `avg ${(avg/1000).toFixed(1)}s · best ${(best/1000).toFixed(1)}s · ${responseTimes.length} correct`;
  midiStats.classList.remove('hidden');
}

const KEYBOARD_START = 36;  // C2
const KEYBOARD_END   = 84;  // C6
const IS_BLACK_KEY   = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const NOTE_NAMES_SHORT = ['C','','D','','E','F','','G','','A','','B'];

function buildKeyboard() {
  pianoKeyboard.innerHTML = '';
  keyElements.clear();
  let whiteCount = 0;
  for (let n = KEYBOARD_START; n <= KEYBOARD_END; n++) {
    const pc      = n % 12;
    const isBlack = IS_BLACK_KEY[pc];
    const key     = document.createElement('div');
    key.dataset.midi = n;
    if (!isBlack) {
      key.className = 'piano-key white-key';
      key.style.setProperty('--ki', whiteCount);
      if (pc === 0) {
        const label = document.createElement('span');
        label.className = 'key-label';
        label.textContent = 'C' + (Math.floor(n / 12) - 1);
        key.appendChild(label);
      }
      whiteCount++;
    } else {
      key.className = 'piano-key black-key';
      key.style.setProperty('--ki', whiteCount);
    }
    pianoKeyboard.appendChild(key);
    keyElements.set(n, key);
  }
  pianoKeyboard.style.setProperty('--white-count', whiteCount);
}

function isNoteWrong(pc, expected) {
  if (!expected) return false;
  switch (expected.type) {
    case 'note':     return pc !== expected.pc;
    case 'chord':    return !expected.pcs.includes(pc);
    case 'scale':    return !expected.pcs.includes(pc);
    case 'interval': return pc !== expected.rootPC && pc !== expected.targetPC;
    case 'octave':   return pc !== expected.rootPC;
    default:         return false;
  }
}

function updateKeyboard() {
  const expected = getExpectedPCs(currentPromptKey);
  for (const [n, el] of keyElements) {
    const isHeld  = heldNotes.has(n) || demoNotes.has(n);
    const isWrong = heldNotes.has(n) && isNoteWrong(n % 12, expected);
    el.classList.toggle('active', isHeld && !isWrong);
    el.classList.toggle('wrong',  isWrong);
  }
}

function updateHearBtn() {
  const expected = getExpectedPCs(currentPromptKey);
  hearBtn.classList.toggle('hidden', !expected);
}

async function hearIt() {
  if (hearItActive) return;
  const expected = getExpectedPCs(currentPromptKey);
  if (!expected) return;

  hearItActive = true;
  hearBtn.disabled = true;

  const gap = ms => new Promise(r => setTimeout(r, ms));

  const doPlay = async (midiNote, durationMs) => {
    demoNotes.add(midiNote);
    await synthNoteOn(midiNote, 85);
    updateKeyboard();
    await gap(durationMs);
    demoNotes.delete(midiNote);
    synthNoteOff(midiNote);
    updateKeyboard();
  };

  try {
    if (expected.type === 'note') {
      await doPlay(60 + expected.pc, 900);

    } else if (expected.type === 'chord') {
      const notes = expected.pcs.map(pc => 60 + pc).sort((a, b) => a - b);
      await Promise.all(notes.map(n => doPlay(n, 1600)));

    } else if (expected.type === 'scale') {
      const notes = expected.pcs.map(pc => 60 + pc).sort((a, b) => a - b);
      notes.push(notes[0] + 12);
      for (const n of notes) {
        demoNotes.add(n);
        await synthNoteOn(n, 85);
        updateKeyboard();
        await gap(240);
      }
      await gap(700);
      for (const n of [...demoNotes]) { demoNotes.delete(n); synthNoteOff(n); }
      updateKeyboard();

    } else if (expected.type === 'interval' || expected.type === 'octave') {
      const parts    = currentPromptKey.split('|');
      const dir      = parts[3];
      const semis    = expected.type === 'octave' ? 12 : (INTERVAL_SEMITONES[parts[1]] ?? 0);
      const rootMidi = 60 + expected.rootPC;
      const tgtMidi  = dir === 'above' ? rootMidi + semis : rootMidi - semis;
      await doPlay(rootMidi, 650);
      await gap(80);
      await doPlay(tgtMidi, 900);
    }

  } catch (_) {
  } finally {
    for (const n of [...demoNotes]) { demoNotes.delete(n); synthNoteOff(n); }
    updateKeyboard();
    hearItActive = false;
    hearBtn.disabled = false;
  }
}

function attachMidiListeners() {
  for (const input of midiAccess.inputs.values()) {
    input.onmidimessage = onMidiMessage;
  }
}

async function enableMidi() {
  if (!navigator.requestMIDIAccess) {
    midiStatus.textContent = 'Not supported in this browser';
    return;
  }
  // Initialize audio graph now while we still have the user-gesture context.
  // Without this, AudioContext is created later inside a MIDI message handler
  // where Chrome treats it as suspended and produces no sound.
  try { getSynthMasterGain(); } catch (_) {}
  try {
    midiAccess = await navigator.requestMIDIAccess();
    midiEnabled = true;
    attachMidiListeners();
    midiAccess.onstatechange = e => {
      if (e.port.type === 'input') attachMidiListeners();
      updateMidiUI();
    };
    localStorage.setItem('mpr_midi', '1');
  } catch (err) {
    midiStatus.textContent = 'Access denied';
  }
  updateMidiUI();
}

function disableMidi() {
  midiEnabled = false;
  heldNotes.clear();
  sustainedNotes.clear();
  pedalDown = false;
  scaleNotesPlayed.clear();
  [...synthNotes.keys()].forEach(n => synthNoteOff(n));
  responseTimes = [];
  updateKeyboard();
  localStorage.removeItem('mpr_midi');
  updateMidiUI();
}

function updateMidiUI() {
  const count = midiAccess ? midiAccess.inputs.size : 0;
  if (midiEnabled) {
    midiBtn.textContent = 'MIDI: On';
    midiBtn.classList.add('active');
    midiStatus.textContent = count === 1 ? '1 device' : count > 1 ? `${count} devices` : 'No devices';
    synthVolWrap.classList.remove('hidden');
    pianoKeyboard.classList.remove('hidden');
    buildKeyboard();
  } else {
    midiBtn.textContent = 'MIDI';
    midiBtn.classList.remove('active');
    midiStatus.textContent = '';
    synthVolWrap.classList.add('hidden');
    pianoKeyboard.classList.add('hidden');
    midiStats.classList.add('hidden');
  }
}

function initTheme() {
  const saved = localStorage.getItem('mpr_theme');
  const auto  = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(saved || auto);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Init ──────────────────────────────────────────────────────────────────────

// Collapsible settings groups
document.querySelectorAll('.group-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.nextElementSibling.classList.toggle('group-collapsed', expanded);
  });
});

initTheme();
loadSettings();
syncUI();

const _savedStage = parseInt(localStorage.getItem('mpr_learning_stage') ?? '-1');
if (!isNaN(_savedStage) && _savedStage >= 0 && _savedStage < LEARNING_PATH.length) {
  learningStage = _savedStage;
}
updateLearningUI();

showPrompt();

midiBtn.addEventListener('click', () => { midiEnabled ? disableMidi() : enableMidi(); });
hearBtn.addEventListener('click', hearIt);

helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
helpClose.addEventListener('click', () => helpModal.classList.add('hidden'));
helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.classList.add('hidden'); });

document.getElementById('viewStatsBtn').addEventListener('click', () => {
  document.getElementById('statsContent').innerHTML = renderStats();
  statsModal.classList.remove('hidden');
});
statsClose.addEventListener('click', () => statsModal.classList.add('hidden'));
statsModal.addEventListener('click', e => { if (e.target === statsModal) statsModal.classList.add('hidden'); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    helpModal.classList.add('hidden');
    statsModal.classList.add('hidden');
  }
});

document.getElementById('resetWeightsBtn').addEventListener('click', () => {
  adaptWeights = { roots: {}, types: {} };
  localStorage.removeItem('mpr_weights');
  const btn = document.getElementById('resetWeightsBtn');
  btn.textContent = 'Cleared!';
  setTimeout(() => { btn.textContent = 'Reset learning data'; }, 1800);
});

synthVolumeSlider.value = localStorage.getItem('mpr_synth_vol') ?? '70';
synthVolumeSlider.addEventListener('input', () => {
  const vol = parseInt(synthVolumeSlider.value) / 100;
  if (synthMasterGain) synthMasterGain.gain.value = vol;
  localStorage.setItem('mpr_synth_vol', synthVolumeSlider.value);
});

synthPresetSelect.value = currentSynthPreset;
synthPresetSelect.addEventListener('change', () => {
  currentSynthPreset = synthPresetSelect.value;
  localStorage.setItem('mpr_synth_preset', currentSynthPreset);
  [...synthNotes.keys()].forEach(n => synthNoteOff(n));
});

if (localStorage.getItem('mpr_midi') === '1') enableMidi();
