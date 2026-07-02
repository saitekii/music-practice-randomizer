const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const CHORD_TYPES = [
  { id: 'chordMajor',      label: 'Major',       seventh: false },
  { id: 'chordMinor',      label: 'Minor',       seventh: false },
  { id: 'chordDiminished', label: 'Diminished',  seventh: false },
  { id: 'chordAugmented',  label: 'Augmented',   seventh: false },
  { id: 'chordMaj7',       label: 'Major 7',     seventh: true  },
  { id: 'chordMin7',       label: 'Minor 7',     seventh: true  },
  { id: 'chordDom7',       label: 'Dominant 7',  seventh: true  },
];

const TRIAD_INVERSIONS   = ['Root position', '1st inversion', '2nd inversion'];
const SEVENTH_INVERSIONS = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

const SCALE_TYPES = [
  { id: 'scaleMajor',    label: 'Major'             },
  { id: 'scaleNatMinor', label: 'Natural minor'     },
  { id: 'scaleHarmMinor',label: 'Harmonic minor'    },
  { id: 'scaleMelMinor', label: 'Melodic minor'     },
  { id: 'scaleMajPent',  label: 'Major pentatonic'  },
  { id: 'scaleMinPent',  label: 'Minor pentatonic'  },
  { id: 'scaleModes',    label: null                }, // special — picks a mode name
];

const MODES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];

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

// DOM
const promptLine1  = document.getElementById('promptLine1');
const promptLine2  = document.getElementById('promptLine2');
const promptCard   = document.getElementById('promptCard');
const nextBtn      = document.getElementById('nextBtn');
const timerDisplay = document.getElementById('timerDisplay');
const customTimer  = document.getElementById('customTimer');

let lastPromptKey  = null;
let timerInterval  = null;
let timerRemaining = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function enabledNotes() {
  return NOTES.filter(n => document.querySelector(`input[data-note="${n}"]`).checked);
}

function checked(id) {
  return document.getElementById(id).checked;
}

// ── Generators ───────────────────────────────────────────────────────────────

function genChord() {
  const types = CHORD_TYPES.filter(c => checked(c.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const type = pick(types);
  const note = pick(notes);
  const useInv = checked('inversions');
  const inv = useInv ? pick(type.seventh ? SEVENTH_INVERSIONS : TRIAD_INVERSIONS) : '';

  return {
    line1: `${note} ${type.label}`,
    line2: inv,
    key: `chord|${note}|${type.label}|${inv}`,
  };
}

function genScale() {
  const types = SCALE_TYPES.filter(s => checked(s.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const type = pick(types);
  const note = pick(notes);
  const label = type.label === null ? pick(MODES) : type.label;

  return {
    line1: `${note} ${label}`,
    line2: '',
    key: `scale|${note}|${label}`,
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
    key: `func|${note}|${mode}|${pattern}`,
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

function generatePrompt() {
  const pool = [];
  if (checked('catChords'))     pool.push(genChord);
  if (checked('catScales'))     pool.push(genScale);
  if (checked('catFunctional')) pool.push(genFunctional);
  if (checked('catDiatonic'))   pool.push(genDiatonic);

  if (!pool.length) return null;

  for (let i = 0; i < 12; i++) {
    const result = pick(pool)();
    if (result && result.key !== lastPromptKey) {
      lastPromptKey = result.key;
      return result;
    }
  }

  // Fallback if we can't avoid a repeat (very small pool)
  for (const fn of pool) {
    const result = fn();
    if (result) { lastPromptKey = result.key; return result; }
  }

  return null;
}

// ── Display ───────────────────────────────────────────────────────────────────

function showPrompt() {
  const prompt = generatePrompt();

  promptCard.classList.add('flash');

  setTimeout(() => {
    if (!prompt) {
      promptLine1.textContent = 'Enable a category and at least one note';
      promptLine2.textContent = '';
    } else {
      promptLine1.textContent = prompt.line1;
      promptLine2.textContent = prompt.line2;
    }
    promptCard.classList.remove('flash');
  }, 120);

  restartTimer();
}

// ── Timer ─────────────────────────────────────────────────────────────────────

function timerSeconds() {
  const val = document.querySelector('input[name="timer"]:checked')?.value ?? 'off';
  if (val === 'off') return 0;
  if (val === 'custom') return Math.max(1, parseInt(customTimer.value) || 10);
  return parseInt(val);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerDisplay.textContent = '';
  timerDisplay.className = 'timer-display';
}

function restartTimer() {
  stopTimer();
  const secs = timerSeconds();
  if (secs <= 0) return;

  timerRemaining = secs;
  timerDisplay.textContent = timerRemaining;

  timerInterval = setInterval(() => {
    timerRemaining -= 1;

    if (timerRemaining <= 0) {
      showPrompt(); // also calls restartTimer inside
    } else {
      timerDisplay.textContent = timerRemaining;
      timerDisplay.classList.toggle('warning', timerRemaining <= 3);
    }
  }, 1000);
}

// ── Settings persistence ──────────────────────────────────────────────────────

function saveSettings() {
  const timerVal = document.querySelector('input[name="timer"]:checked')?.value ?? 'off';

  const ids = [
    'catChords', 'catScales', 'catFunctional', 'catDiatonic',
    'chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented',
    'chordMaj7', 'chordMin7', 'chordDom7', 'inversions',
    'scaleMajor', 'scaleNatMinor', 'scaleHarmMinor', 'scaleMelMinor',
    'scaleMajPent', 'scaleMinPent', 'scaleModes',
  ];

  const settings = {
    timer: timerVal,
    customTimer: customTimer.value,
    checks: Object.fromEntries(ids.map(id => [id, checked(id)])),
    notes: Object.fromEntries(
      NOTES.map(n => [n, document.querySelector(`input[data-note="${n}"]`).checked])
    ),
    diatonicRoot: document.getElementById('diatonicRoot').value,
    diatonicMode: document.getElementById('diatonicMode').value,
  };

  localStorage.setItem('mpr_settings', JSON.stringify(settings));
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

    if (s.diatonicRoot) document.getElementById('diatonicRoot').value = s.diatonicRoot;
    if (s.diatonicMode) document.getElementById('diatonicMode').value = s.diatonicMode;

    if (s.notes) {
      NOTES.forEach(n => {
        const el = document.querySelector(`input[data-note="${n}"]`);
        if (el && s.notes[n] !== undefined) el.checked = s.notes[n];
      });
    }
  } catch (_) {
    // ignore corrupt data
  }
}

// ── UI sync ───────────────────────────────────────────────────────────────────

function syncUI() {
  document.getElementById('chordsOptions').classList.toggle('disabled', !checked('catChords'));
  document.getElementById('scalesOptions').classList.toggle('disabled', !checked('catScales'));
  document.getElementById('diatonicOptions').classList.toggle('disabled', !checked('catDiatonic'));
  customTimer.disabled = document.querySelector('input[name="timer"]:checked')?.value !== 'custom';
}

// ── Event listeners ───────────────────────────────────────────────────────────

nextBtn.addEventListener('click', showPrompt);

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    showPrompt();
  }
});

document.querySelectorAll('input').forEach(el => {
  el.addEventListener('change', () => {
    // Stop timer when timer setting changes so it doesn't fire mid-change
    const isTimerInput = el.name === 'timer' || el.id === 'customTimer';
    if (isTimerInput) stopTimer();

    saveSettings();
    syncUI();
  });
});

// Custom timer value changes should also save
customTimer.addEventListener('input', saveSettings);

document.querySelectorAll('select').forEach(el => {
  el.addEventListener('change', () => { saveSettings(); });
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadSettings();
syncUI();
showPrompt();
