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

let synthMasterGain = null;
const synthNotes    = new Map();

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

function getSynthMasterGain() {
  if (synthMasterGain) return synthMasterGain;
  const ctx  = getAudioCtx();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value      = 10;
  comp.ratio.value     = 6;
  comp.attack.value    = 0.003;
  comp.release.value   = 0.15;
  comp.connect(ctx.destination);
  synthMasterGain = ctx.createGain();
  synthMasterGain.gain.value = (parseInt(localStorage.getItem('mpr_synth_vol') ?? '70')) / 100;
  synthMasterGain.connect(comp);
  return synthMasterGain;
}

function synthNoteOn(noteNumber, velocity) {
  synthNoteOff(noteNumber);
  try {
    const ctx  = getAudioCtx();
    const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
    const vel  = velocity / 127;
    const now  = ctx.currentTime;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vel * 0.7,  now + 0.006);
    gain.gain.exponentialRampToValueAtTime(vel * 0.35, now + 0.45);

    osc.connect(gain);
    gain.connect(getSynthMasterGain());
    osc.start(now);
    synthNotes.set(noteNumber, { osc, gain });
  } catch (_) {}
}

function synthNoteOff(noteNumber) {
  const note = synthNotes.get(noteNumber);
  if (!note) return;
  synthNotes.delete(noteNumber);
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(Math.max(note.gain.gain.value, 0.001), now);
    note.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    note.osc.stop(now + 0.6);
  } catch (_) {}
}

// ── Generators ───────────────────────────────────────────────────────────────

function genChord() {
  const types = CHORD_TYPES.filter(c => checked(c.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const type   = pick(types);
  const note   = pick(notes);
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

  const type  = pick(types);
  const note  = pick(notes);
  const label = type.label === null ? pick(MODES) : type.label;

  return {
    line1: `${note} ${label}`,
    line2: '',
    key:   `scale|${note}|${label}`,
  };
}

function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const note    = pick(notes);
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

  const interval = pick(types);
  const note     = pick(notes);
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
  const note = pick(notes);
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
  renderPrompt(prev);
  updateBackBtn();
}

function showPrompt() {
  const prompt = generatePrompt();
  currentPromptKey = prompt ? prompt.key : '';
  scaleNotesPlayed.clear();
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
  if (cmd === 0x90 && velocity > 0) {
    heldNotes.add(note);
    scaleNotesPlayed.add(note % 12);
    synthNoteOn(note, velocity);
    clearTimeout(midiCheckTimer);
    midiCheckTimer = setTimeout(checkMidi, 100);
  } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
    heldNotes.delete(note);
    synthNoteOff(note);
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
  promptCard.classList.add('midi-success');
  setTimeout(() => {
    promptCard.classList.remove('midi-success');
    midiSuccessActive = false;
    showPrompt();
  }, 700);
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
  scaleNotesPlayed.clear();
  [...synthNotes.keys()].forEach(n => synthNoteOff(n));
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
  } else {
    midiBtn.textContent = 'MIDI';
    midiBtn.classList.remove('active');
    midiStatus.textContent = '';
    synthVolWrap.classList.add('hidden');
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

synthVolumeSlider.value = localStorage.getItem('mpr_synth_vol') ?? '70';
synthVolumeSlider.addEventListener('input', () => {
  const vol = parseInt(synthVolumeSlider.value) / 100;
  if (synthMasterGain) synthMasterGain.gain.value = vol;
  localStorage.setItem('mpr_synth_vol', synthVolumeSlider.value);
});

if (localStorage.getItem('mpr_midi') === '1') enableMidi();
