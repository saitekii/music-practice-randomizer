const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ENHARMONIC_NOTES = ['Db', 'D#', 'Gb', 'G#', 'A#'];
const NOTE_TO_PC = {
  'C':0, 'C#':1, 'Db':1, 'D':2, 'D#':3, 'Eb':3,
  'E':4, 'F':5, 'F#':6, 'Gb':6, 'G':7, 'G#':8, 'Ab':8,
  'A':9, 'A#':10, 'Bb':10, 'B':11,
};

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

const JAZZ_SYMBOLS = {
  chordMajor:      ['', 'M'],
  chordMinor:      ['-', 'm'],
  chordDiminished: ['°', 'dim'],
  chordAugmented:  ['+', 'aug'],
  chordMaj7:       ['△', 'M7', 'Maj7', '△7', 'maj7'],
  chordMin7:       ['-7', 'm7', 'min7'],
  chordDom7:       ['7'],
  chordHalfDim:    ['ø', 'ø7', 'm7♭5'],
  chordDim7:       ['°7', 'dim7'],
  chordSus2:       ['sus2'],
  chordSus4:       ['sus', 'sus4'],
  chord7sus4:      ['7sus4', '7sus'],
  chordDom9:       ['9'],
  chordMaj9:       ['△9', 'M9', 'Maj9'],
  chordMin9:       ['-9', 'm9'],
  chordDom13:      ['13'],
  chord7b9:        ['7♭9'],
  chord7s9:        ['7♯9'],
  chord7s11:       ['7♯11'],
};

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
  'Minor 2nd': 1,  'Major 2nd': 2,  'Minor 3rd': 3,   'Major 3rd': 4,
  'Perfect 4th': 5, 'Tritone': 6,  'Perfect 5th': 7,  'Minor 6th': 8,
  'Major 6th': 9,  'Minor 7th': 10, 'Major 7th': 11,  'Octave': 12,
  'Minor 9th': 13, 'Major 9th': 14,
  'Perfect 11th': 17, 'Augmented 11th': 18,
  'Minor 13th': 20,   'Major 13th': 21,
};

const LEARNING_PATH = [
  // ── Phase 1: Note Finder ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Find C',              hint: 'Just find C on your instrument — nothing else',                                                            cats: ['catNotes'],              notes: ['C'],                                                            chords: [],                                                                              scales: [],                             timer: 'off' },
  { name: 'C and D',             hint: 'Two notes',                                                                                               cats: ['catNotes'],              notes: ['C','D'],                                                        chords: [],                                                                              scales: [],                             timer: 'off' },
  { name: 'Add E',               hint: 'C, D and E',                                                                                             cats: ['catNotes'],              notes: ['C','D','E'],                                                    chords: [],                                                                              scales: [],                             timer: 'off' },
  { name: 'Add F',               hint: 'C, D, E, F',                                                                                             cats: ['catNotes'],              notes: ['C','D','E','F'],                                                chords: [],                                                                              scales: [],                             timer: 'off' },
  { name: 'Add G',               hint: 'C through G — the first five natural notes',                                                              cats: ['catNotes'],              notes: ['C','D','E','F','G'],                                            chords: [],                                                                              scales: [],                             timer: 'off' },
  { name: 'Add A',               hint: 'C, D, E, F, G, A',                                                                                       cats: ['catNotes'],              notes: ['C','D','E','F','G','A'],                                        chords: [],                                                                              scales: [],                             timer: 'off' },
  { name: 'All Natural Notes',   hint: 'All seven natural notes — C through B',                                                                   cats: ['catNotes'],              notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                              scales: [],                             timer: 'off' },
  // ── Phase 2: Major chords, natural keys, no timer ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Chord',         hint: 'Just C Major',                                                                                            cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor'],                                                                  scales: [],                             timer: 'off' },
  { name: 'Two Chords',          hint: 'C Major and G Major',                                                                                     cats: ['catChords'],             notes: ['C','G'],                                                        chords: ['chordMajor'],                                                                  scales: [],                             timer: 'off' },
  { name: 'Three Chords',        hint: 'C, F and G — the backbone of most songs',                                                                 cats: ['catChords'],             notes: ['C','F','G'],                                                    chords: ['chordMajor'],                                                                  scales: [],                             timer: 'off' },
  { name: 'Add D Major',         hint: 'C, D, F, G Major',                                                                                        cats: ['catChords'],             notes: ['C','D','F','G'],                                                chords: ['chordMajor'],                                                                  scales: [],                             timer: 'off' },
  { name: 'Add A Major',         hint: 'C, D, F, G, A Major',                                                                                     cats: ['catChords'],             notes: ['C','D','F','G','A'],                                            chords: ['chordMajor'],                                                                  scales: [],                             timer: 'off' },
  { name: 'Add E Major',         hint: 'C, D, E, F, G, A Major',                                                                                  cats: ['catChords'],             notes: ['C','D','E','F','G','A'],                                        chords: ['chordMajor'],                                                                  scales: [],                             timer: 'off' },
  { name: 'All Natural Majors',  hint: 'Major chord across all seven natural keys',                                                               cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor'],                                                                  scales: [],                             timer: 'off' },
  // ── Phase 3: Introduce minor ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Minor',         hint: 'C + A — a relative pair (Major and Minor)',                                                               cats: ['catChords'],             notes: ['C','A'],                                                        chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: 'off' },
  { name: 'More Minors',         hint: 'Six chords: C/G/F Major + A/E/D Minor',                                                                   cats: ['catChords'],             notes: ['C','D','E','F','G','A'],                                        chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: 'off' },
  { name: 'All Natural Minor',   hint: 'Major and Minor in every natural key',                                                                    cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: 'off' },
  // ── Phase 4: Add timer pressure ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Add a Timer',         hint: 'Same chords — 15 seconds to respond',                                                                     cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '15' },
  { name: 'A Bit Faster',        hint: '10 seconds',                                                                                              cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '10' },
  { name: 'Faster Still',        hint: '5 seconds',                                                                                               cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 5: Accidentals one at a time ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Add F♯',              hint: 'First accidental — F sharp',                                                                              cats: ['catChords'],             notes: ['C','D','E','F','F#','G','A','B'],                               chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '10' },
  { name: 'Add B♭',              hint: 'B flat added',                                                                                            cats: ['catChords'],             notes: ['C','D','E','F','F#','G','A','Bb','B'],                          chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '10' },
  { name: 'Add E♭',              hint: 'E flat added',                                                                                            cats: ['catChords'],             notes: ['C','D','Eb','E','F','F#','G','A','Bb','B'],                     chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '10' },
  { name: 'Add A♭',              hint: 'A flat added',                                                                                            cats: ['catChords'],             notes: ['C','D','Eb','E','F','F#','G','Ab','A','Bb','B'],                chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '10' },
  { name: 'Add C♯',              hint: 'Last accidental — all 12 keys now',                                                                       cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '10' },
  { name: 'Speed Up',            hint: 'All 12 keys, Major + Minor root position — 5 seconds',                                                    cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 6: Triad inversions ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet Inversions',     hint: 'C Major in all three positions — root, 1st, and 2nd inversion. Same notes, different bass note',          cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
  { name: 'Two Keys, Inverted',  hint: 'C and G Major — any inversion, no timer',                                                                 cats: ['catChords'],             notes: ['C','G'],                                                        chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
  { name: 'Natural Majors Inv.', hint: 'All seven natural keys — Major chord, any inversion',                                                     cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
  { name: 'Add Minor Inversions',hint: 'Major and Minor chords — any inversion, natural keys',                                                    cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','inversions'],                                        scales: [],                             timer: 'off' },
  { name: 'Inversion Timer',     hint: 'Major + Minor inversions — 15 seconds',                                                                   cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','inversions'],                                        scales: [],                             timer: '15' },
  { name: 'Inversions, 10 Sec',  hint: '10 seconds',                                                                                              cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','inversions'],                                        scales: [],                             timer: '10' },
  { name: 'All 12, Inverted',    hint: 'All 12 keys — Major and Minor, any inversion, 10 seconds',                                                cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','inversions'],                                        scales: [],                             timer: '10' },
  { name: 'Add Dim & Aug',       hint: 'Diminished and Augmented triads added — all inversions, 10 seconds',                                      cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '10' },
  { name: 'Triad Mastery',       hint: 'All triads, all inversions, all 12 keys — 5 seconds',                                                     cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '5'  },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Scale',         hint: 'C Major scale — no timer, take your time',                                                                cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'Add G Major Scale',   hint: 'C and G Major scales',                                                                                    cats: ['catScales'],             notes: ['C','G'],                                                        chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'Add F Major Scale',   hint: 'C, G and F',                                                                                              cats: ['catScales'],             notes: ['C','F','G'],                                                    chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'Common Majors',       hint: 'Six keys: C, G, D, F, A, E Major scales',                                                                 cats: ['catScales'],             notes: ['C','D','E','F','G','A'],                                        chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'All Natural Scales',  hint: 'Major scale across all seven natural notes',                                                              cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'Scale Timer',         hint: 'Natural keys, 15 seconds',                                                                                cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                              scales: ['scaleMajor'],                 timer: '15' },
  { name: 'All 12 Scales',       hint: 'Every key, 15 seconds',                                                                                   cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                              scales: ['scaleMajor'],                 timer: '15' },
  // ── Phase 8: Combine chords + scales (inversions carry forward) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Mix Chords + Scales', hint: 'Chords with inversions and Major scales — natural keys, 15s',                                             cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','inversions'],                                        scales: ['scaleMajor'],                 timer: '15' },
  { name: 'All 12 Combined',     hint: 'Chords and scales in every key, 10 seconds',                                                              cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','inversions'],                                        scales: ['scaleMajor'],                 timer: '10' },
  { name: 'Add Minor Scale',     hint: 'Natural Minor scale added to the mix',                                                                    cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','inversions'],                                        scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  // ── Phase 9: Seventh chords — root position (inversions off to focus on new chord quality) ──────────────────────────────────────────────────────────────────────────────────
  { name: 'Add Major 7',         hint: 'Major 7 chord introduced — root position only for now, natural keys',                                     cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7'],                                         scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  { name: 'Add Minor 7',         hint: 'Minor 7 added',                                                                                           cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7','chordMin7'],                             scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  { name: 'Add Dominant 7',      hint: 'Dominant 7 — now you have the core jazz chords',                                                          cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7'],                 scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  { name: '7ths in All Keys',    hint: 'All seventh chord types across all 12 keys',                                                              cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7'],                 scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  // ── Phase 10: Seventh chord inversions ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First 7th Inversion', hint: 'C Major 7 in all four positions — root, 1st, 2nd, 3rd inversion',                                        cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMaj7','inversions'],                                                      scales: [],                             timer: 'off' },
  { name: '7th Inv., Nat. Keys', hint: 'Major 7 and Minor 7 — all inversions, natural keys, no timer',                                           cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMaj7','chordMin7','inversions'],                                          scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
  { name: 'Add Dom 7 Inv.',      hint: 'All three 7th types — any inversion, 15 seconds',                                                         cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMaj7','chordMin7','chordDom7','inversions'],                              scales: ['scaleMajor','scaleNatMinor'], timer: '15' },
  { name: '7th Inv. Full Mix',   hint: 'Triads and sevenths, all inversions — natural keys, 15s',                                                 cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'],    scales: ['scaleMajor','scaleNatMinor'], timer: '15' },
  { name: '7th Inv. All Keys',   hint: 'Everything — all 12 keys, all sevenths with inversions, 10 seconds',                                     cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'],    scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  // ── Phase 11: Full Foundation ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Full Foundation',     hint: 'All 12 keys, all core chords + 7ths, all inversions, both scales — 5 seconds',                           cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'],    scales: ['scaleMajor','scaleNatMinor'], timer: '5'  },
  // ── Phase 12: Scales beyond natural minor ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Harmonic Minor — C',       hint: 'The raised 7th gives harmonic minor its classical drama — one note changes everything',                  cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                                                scales: ['scaleHarmMinor'],                       timer: 'off' },
  { name: 'Harmonic Minor, Nat. Keys',hint: 'Harmonic minor across the seven natural keys',                                                           cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleHarmMinor'],                       timer: 'off' },
  { name: 'Harmonic Minor, All 12',   hint: 'Every key — 10 seconds',                                                                                cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleHarmMinor'],                       timer: '10'  },
  { name: 'Melodic Minor — C',        hint: 'Raised 6th and 7th ascending — jazz\'s favourite scale',                                                cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                                                scales: ['scaleMelMinor'],                        timer: 'off' },
  { name: 'Melodic Minor, Nat. Keys', hint: 'Melodic minor across the seven natural keys',                                                           cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleMelMinor'],                        timer: 'off' },
  { name: 'Three Minors',             hint: 'Natural, harmonic and melodic minor — hear the difference between each in all 12 keys',                cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleNatMinor','scaleHarmMinor','scaleMelMinor'], timer: '10' },
  { name: 'Major Pentatonic — C',     hint: 'Five notes, no half steps — open and singable',                                                        cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                                                scales: ['scaleMajPent'],                         timer: 'off' },
  { name: 'Both Pentatonics, Nat.',   hint: 'Major and minor pentatonic — the backbone of blues and rock across natural keys',                       cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleMajPent','scaleMinPent'],           timer: 'off' },
  { name: 'Pentatonics, All 12',      hint: 'Both pentatonic shapes in every key — 10 seconds',                                                     cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleMajPent','scaleMinPent'],           timer: '10'  },
  { name: 'Meet the Modes',           hint: 'Seven modes of the major scale — Ionian through Locrian, each with its own flavour',                   cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                                                scales: ['scaleModes'],                           timer: 'off' },
  { name: 'All Scales, All Keys',     hint: 'Every scale type in every key — 10 seconds',                                                           cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleMajor','scaleNatMinor','scaleHarmMinor','scaleMelMinor','scaleMajPent','scaleMinPent','scaleModes'], timer: '10' },
  // ── Phase 12b: Enharmonic spellings ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet Enharmonics',         hint: 'F# and Gb are the same key — same finger, two names. Same for C# / Db. Play them both.',               cats: ['catChords','catNotes'],  notes: ['C','C#','Db','D','E','F','F#','Gb','G','A','B'],                chords: ['chordMajor','chordMinor'],                                                                        scales: [],                                       timer: 'off' },
  { name: 'Flat-Key Spellings',       hint: 'Practice chords named with flats: Db, Eb, Gb, Ab, Bb — same pitches as C#, D#, F#, G#, A#',          cats: ['catChords','catScales'], notes: ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'],                       scales: ['scaleMajor','scaleNatMinor'],            timer: '10'  },
  { name: 'Any Spelling, All Keys',   hint: 'All 17 note spellings — see any name, play the right key regardless of sharp or flat',                cats: ['catChords','catScales'], notes: ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  // ── Phase 13: Extended chords ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet Sus Chords',          hint: 'Sus2 and sus4 replace the 3rd — open and unresolved, wanting to move',                                 cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordSus2','chordSus4'],                                                scales: [],                                       timer: 'off' },
  { name: 'Sus + 7sus4, All Keys',    hint: '7sus4 adds the flat 7 — common in funk and jazz, all 12 keys',                                         cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordSus2','chordSus4','chord7sus4'],                                   scales: [],                                       timer: '10'  },
  { name: 'Add Half-Dim & Dim7',      hint: 'Half-diminished (m7♭5) lives in jazz; fully diminished (dim7) in classical and horror — all 12 keys', cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordHalfDim','chordDim7','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  { name: 'Meet Dominant 9',          hint: 'Dominant 7 + major 9th — bigger, richer version of the V chord',                                       cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordDom7','chordDom9'],                                                scales: [],                                       timer: 'off' },
  { name: 'Add Major 9 & Minor 9',    hint: 'Three flavours of 9th chord — dominant, major, and minor',                                             cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordDom9','chordMaj9','chordMin9'],scales: [],                                       timer: 'off' },
  { name: '9th Chords, All Keys',     hint: 'All three 9th chord types in every key — 10 seconds',                                                  cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordDom9','chordMaj9','chordMin9','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  { name: 'Add Dominant 13',          hint: 'The full V chord — dominant 13 spans six notes and defines jazz harmony',                              cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordDom9','chordMaj9','chordMin9','chordDom13','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  { name: 'Jazz Alterations',         hint: '7♭9, 7♯9, and 7♯11 — altered dominants create tension and colour in jazz',                           cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordDom7','chord7b9','chord7s9','chord7s11'],                          scales: [],                                       timer: 'off' },
  { name: 'All Extensions, All Keys', hint: 'Every chord type — triads, sevenths, sus, 9ths, 13ths, alterations — 10 seconds',                     cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','chordMaj7','chordMin7','chordDom7','chordSus2','chordSus4','chord7sus4','chordDom9','chordMaj9','chordMin9','chordDom13','chord7b9','chord7s9','chord7s11','chordHalfDim','chordDim7','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
  // ── Phase 14: Functional harmony ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Functional Harmony — C',   hint: 'I, ii, iii, IV, V, vi, vii°, ii–V–I… play chord functions in the key of C',                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
  { name: 'Functional, All 12',       hint: 'Every key — functional harmony in 10 seconds',                                                         cats: ['catFunctional'],         notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: [],                                       timer: '10'  },
  { name: 'Functional + Chords',      hint: 'Roman numeral patterns alongside specific chord voicings — the bridge between theory and playing',     cats: ['catFunctional','catChords'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],        chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7'],                                    scales: [],                                       timer: '10'  },
  { name: 'Full Functional Mix',      hint: 'Functional harmony with chords and scales — complete theory workout',                                   cats: ['catFunctional','catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'],                        scales: ['scaleMajor','scaleNatMinor'],            timer: '10'  },
  // ── Phase 15: Interval reading ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Perfect Intervals',        hint: 'Perfect 5th, 4th, and Octave — the strongest consonances, ascending from natural notes',               cats: ['catIntervals'],          notes: ['C','D','E','F','G','A','B'],                                    chords: [],   intervals: ['intPerf5','intPerf4','intOct'],                                                                   scales: [],   intDirs: ['up'],        timer: 'off' },
  { name: 'Add Thirds',               hint: 'Major 3rd (bright) and Minor 3rd (dark) — the colour of harmony',                                     cats: ['catIntervals'],          notes: ['C','D','E','F','G','A','B'],                                    chords: [],   intervals: ['intPerf5','intPerf4','intOct','intMaj3','intMin3'],                                          scales: [],   intDirs: ['up'],        timer: 'off' },
  { name: 'Add 2nds and 6ths',        hint: 'Filling in the diatonic intervals — seven interval types, ascending',                                  cats: ['catIntervals'],          notes: ['C','D','E','F','G','A','B'],                                    chords: [],   intervals: ['intPerf5','intPerf4','intOct','intMaj3','intMin3','intMaj6','intMin6','intMaj2'],             scales: [],   intDirs: ['up'],        timer: 'off' },
  { name: 'All Simple Intervals',     hint: 'All 12 chromatic intervals — ascending from every natural note',                                       cats: ['catIntervals'],          notes: ['C','D','E','F','G','A','B'],                                    chords: [],   intervals: ['intMin2','intMaj2','intMin3','intMaj3','intPerf4','intTT','intPerf5','intMin6','intMaj6','intMin7','intMaj7','intOct'], scales: [], intDirs: ['up'], timer: 'off' },
  { name: 'Add Descending',           hint: 'Now identify intervals going DOWN — the same distance but a different sound image',                    cats: ['catIntervals'],          notes: ['C','D','E','F','G','A','B'],                                    chords: [],   intervals: ['intMin2','intMaj2','intMin3','intMaj3','intPerf4','intTT','intPerf5','intMin6','intMaj6','intMin7','intMaj7','intOct'], scales: [], intDirs: ['up','down'], timer: 'off' },
  { name: 'Intervals, All 12 Notes',  hint: 'Both directions from all 12 chromatic roots — 10 seconds',                                            cats: ['catIntervals'],          notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],   intervals: ['intMin2','intMaj2','intMin3','intMaj3','intPerf4','intTT','intPerf5','intMin6','intMaj6','intMin7','intMaj7','intOct'], scales: [], intDirs: ['up','down'], timer: '10' },
  { name: 'Intervals + Chords',       hint: 'Interval reading mixed with chord identification — both skills at once',                               cats: ['catIntervals','catChords'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],         chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7'], intervals: ['intMin2','intMaj2','intMin3','intMaj3','intPerf4','intTT','intPerf5','intMin6','intMaj6','intMin7','intMaj7','intOct'], scales: [], intDirs: ['up','down'], timer: '10' },
  // ── Phase 16: Diatonic chords ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Diatonic Chords — C Maj',  hint: 'I through vii° in C Major — every diatonic chord and its Roman numeral',                             cats: ['catDiatonic'],           notes: ['C'],                                                            chords: [],                                                                                                scales: [],   diatonicKey: 'C', diatonicMode: 'major', timer: 'off' },
  { name: 'Diatonic, Major Keys',     hint: 'Explore major keys — change the root selector to practice different keys',                            cats: ['catDiatonic'],           notes: ['C'],                                                            chords: [],                                                                                                scales: [],   diatonicKey: 'G', diatonicMode: 'major', timer: 'off' },
  { name: 'Diatonic Minor Mode',      hint: 'i through VII in natural minor — the darker set of diatonic functions',                               cats: ['catDiatonic'],           notes: ['C'],                                                            chords: [],                                                                                                scales: [],   diatonicKey: 'A', diatonicMode: 'minor', timer: 'off' },
  { name: 'Diatonic + Functional',    hint: 'Chord functions alongside Roman numeral patterns — connect the two levels of theory',                  cats: ['catDiatonic','catFunctional'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],     chords: [],                                                                                                scales: [],   diatonicKey: 'C', diatonicMode: 'major', timer: '10'  },
  { name: 'Full Theory Workout',      hint: 'Diatonic chords, functional patterns, chord voicings, and scales — everything together',              cats: ['catDiatonic','catFunctional','catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'], scales: ['scaleMajor','scaleNatMinor'], diatonicKey: 'C', diatonicMode: 'major', timer: '10' },
];

// ── Ear Training constants ────────────────────────────────────────────────────

const EAR_INT_MAP = {
  earIntMin2:    'Minor 2nd',       earIntMaj2:    'Major 2nd',
  earIntMin3:    'Minor 3rd',       earIntMaj3:    'Major 3rd',
  earIntPerf4:   'Perfect 4th',     earIntTT:      'Tritone',
  earIntPerf5:   'Perfect 5th',     earIntMin6:    'Minor 6th',
  earIntMaj6:    'Major 6th',       earIntMin7:    'Minor 7th',
  earIntMaj7:    'Major 7th',       earIntOct:     'Octave',
  earIntMin9:    'Minor 9th',       earIntMaj9:    'Major 9th',
  earIntPerf11:  'Perfect 11th',    earIntAug11:   'Augmented 11th',
  earIntMin13:   'Minor 13th',      earIntMaj13:   'Major 13th',
};

const EAR_CHORD_MAP = {
  earChordMajor: 'Major',        earChordMinor:   'Minor',
  earChordDim:   'Diminished',   earChordAug:     'Augmented',
  earChordMaj7:  'Major 7',      earChordMin7:    'Minor 7',
  earChordDom7:  'Dominant 7',   earChordSus2:    'sus2',
  earChordSus4:  'sus4',         earChordHalfDim: 'Minor 7♭5',
  earChordDim7:  'Diminished 7',
};

const EAR_SCALE_MAP = {
  earScaleMajor:     'Major',            earScaleNatMinor:  'Natural minor',
  earScaleHarmMinor: 'Harmonic minor',   earScaleMelMinor:  'Melodic minor',
  earScaleMajPent:   'Major pentatonic', earScaleMinPent:   'Minor pentatonic',
  earScaleModes:     null,
};

// ── Radial wheel constants ────────────────────────────────────────────────────

const SPOKE_DATA = {
  'Octave':          { angle: 0,   ring: 'inner' },
  'Minor 2nd':       { angle: 30,  ring: 'inner' }, 'Minor 9th':      { angle: 30,  ring: 'outer' },
  'Major 2nd':       { angle: 60,  ring: 'inner' }, 'Major 9th':      { angle: 60,  ring: 'outer' },
  'Minor 3rd':       { angle: 90,  ring: 'inner' },
  'Major 3rd':       { angle: 120, ring: 'inner' },
  'Perfect 4th':     { angle: 150, ring: 'inner' }, 'Perfect 11th':   { angle: 150, ring: 'outer' },
  'Tritone':         { angle: 180, ring: 'inner' }, 'Augmented 11th': { angle: 180, ring: 'outer' },
  'Perfect 5th':     { angle: 210, ring: 'inner' },
  'Minor 6th':       { angle: 240, ring: 'inner' }, 'Minor 13th':     { angle: 240, ring: 'outer' },
  'Major 6th':       { angle: 270, ring: 'inner' }, 'Major 13th':     { angle: 270, ring: 'outer' },
  'Minor 7th':       { angle: 300, ring: 'inner' },
  'Major 7th':       { angle: 330, ring: 'inner' },
};

const INTERVAL_ABBR = {
  'Minor 2nd':'m2',     'Major 2nd':'M2',     'Minor 3rd':'m3',    'Major 3rd':'M3',
  'Perfect 4th':'P4',   'Tritone':'TT',       'Perfect 5th':'P5',  'Minor 6th':'m6',
  'Major 6th':'M6',     'Minor 7th':'m7',     'Major 7th':'M7',    'Octave':'8ve',
  'Minor 9th':'m9',     'Major 9th':'M9',
  'Perfect 11th':'P11', 'Augmented 11th':'A11',
  'Minor 13th':'m13',   'Major 13th':'M13',
};

const INTERVAL_FAMILY_COLOR = {
  'Minor 2nd':'#4c9cf1',  'Major 2nd':'#4c9cf1',
  'Minor 9th':'#4c9cf1',  'Major 9th':'#4c9cf1',
  'Minor 3rd':'#4ade80',  'Major 3rd':'#4ade80',
  'Perfect 4th':'#a78bfa','Perfect 11th':'#a78bfa',
  'Tritone':'#fb923c',    'Augmented 11th':'#fb923c',
  'Perfect 5th':'#22d3ee',
  'Minor 6th':'#f472b6',  'Major 6th':'#f472b6',
  'Minor 13th':'#f472b6', 'Major 13th':'#f472b6',
  'Minor 7th':'#fbbf24',  'Major 7th':'#fbbf24',
  'Octave':'#e2e8f0',
};

const ALL_SIMPLE_INTERVALS = ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th','Major 2nd','Minor 2nd','Tritone','Major 7th','Minor 7th'];
const ALL_COMPOUND_INTERVALS = ['Major 9th','Minor 9th','Perfect 11th','Augmented 11th','Minor 13th','Major 13th'];
const DIR_ASC  = ['earDirAscending'];
const DIR_BOTH = ['earDirAscending','earDirDescending'];
const DIR_ALL  = ['earDirAscending','earDirDescending','earDirHarmonic'];

const EAR_TRAINING_PATH = [
  // ── Phase 1: Simple intervals, ascending only ─────────────────────────────
  { name: 'Octave & Perfect 5th',      hint: 'Start with the two most distinctive interval sounds.',                                              dirs: DIR_ASC,  intervals: ['Octave','Perfect 5th'],                                                                                                                                           chords: [], scales: [] },
  { name: 'Add the Perfect 4th',        hint: 'The 4th feels stable but slightly tenser than the 5th.',                                          dirs: DIR_ASC,  intervals: ['Octave','Perfect 5th','Perfect 4th'],                                                                                                                             chords: [], scales: [] },
  { name: 'Add the Major 3rd',          hint: 'Bright and happy — the sound of major chords.',                                                   dirs: DIR_ASC,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd'],                                                                                                                chords: [], scales: [] },
  { name: 'Minor vs Major 3rd',         hint: 'Minor 3rd is darker — hear the same distance, different colour.',                                 dirs: DIR_ASC,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd'],                                                                                                    chords: [], scales: [] },
  { name: 'Add the Major 6th',          hint: 'Relaxed and open — think "My Bonnie Lies Over the Ocean".',                                       dirs: DIR_ASC,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th'],                                                                                      chords: [], scales: [] },
  { name: 'Minor vs Major 6th',         hint: 'Six intervals — you\'re building strong ears.',                                                   dirs: DIR_ASC,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th'],                                                                          chords: [], scales: [] },
  { name: 'Add the Major 2nd',          hint: 'The whole step — neighbouring scale notes.',                                                      dirs: DIR_ASC,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th','Major 2nd'],                                                              chords: [], scales: [] },
  // ── Phase 2: Add descending direction ────────────────────────────────────
  { name: 'Half vs Whole Step',         hint: 'Minor 2nd = half step — the smallest interval. Now hear them going DOWN too.',                    dirs: DIR_BOTH, intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th','Major 2nd','Minor 2nd'],                                              chords: [], scales: [] },
  { name: 'Add the Tritone',            hint: 'Exactly halfway through the octave — unstable and dissonant. Ascending and descending.',          dirs: DIR_BOTH, intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th','Major 2nd','Minor 2nd','Tritone'],                                      chords: [], scales: [] },
  { name: 'Add the Major 7th',          hint: 'One semitone below the octave — tense, wants to resolve up.',                                    dirs: DIR_BOTH, intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th','Major 2nd','Minor 2nd','Tritone','Major 7th'],                         chords: [], scales: [] },
  { name: 'All 12 Intervals',           hint: 'All 12 chromatic intervals — ascending, descending, and harmonic (both notes at once).',          dirs: DIR_ALL,  intervals: ALL_SIMPLE_INTERVALS,                                                                                                                                              chords: [], scales: [] },
  // ── Phase 3: Compound intervals ───────────────────────────────────────────
  { name: 'Meet the 9ths',              hint: 'Major 9th and Minor 9th — like a 2nd but an octave wider. Ascending only to start.',             dirs: DIR_ASC,  intervals: ['Major 9th','Minor 9th'],                                                                                                                                          chords: [], scales: [] },
  { name: '9ths in Context',            hint: 'All 12 simple intervals plus the 9ths — can you hear the octave leap?',                           dirs: DIR_ASC,  intervals: [...ALL_SIMPLE_INTERVALS,'Major 9th','Minor 9th'],                                                                                                                 chords: [], scales: [] },
  { name: 'Add 11ths & 13ths',          hint: 'The full set of compound intervals — 9ths, 11ths, and 13ths together.',                           dirs: DIR_ASC,  intervals: [...ALL_SIMPLE_INTERVALS,...ALL_COMPOUND_INTERVALS],                                                                                                               chords: [], scales: [] },
  { name: 'Compound, Descending',       hint: 'All 18 intervals — now practise hearing them going down as well.',                                dirs: DIR_BOTH, intervals: [...ALL_SIMPLE_INTERVALS,...ALL_COMPOUND_INTERVALS],                                                                                                               chords: [], scales: [] },
  { name: 'All Intervals, All Directions', hint: 'All 18 intervals — ascending, descending, and harmonic. Full interval mastery.',              dirs: DIR_ALL,  intervals: [...ALL_SIMPLE_INTERVALS,...ALL_COMPOUND_INTERVALS],                                                                                                               chords: [], scales: [] },
  // ── Phase 4: Chords ───────────────────────────────────────────────────────
  { name: 'Major vs Minor Chord',       hint: 'The most fundamental distinction. Major = bright, Minor = dark.',                                 dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor'],                                                                                                                                       scales: [] },
  { name: 'Add Diminished',             hint: 'Stacked minor thirds — tense and ambiguous.',                                                     dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','Diminished'],                                                                                                                           scales: [] },
  { name: 'Add Augmented',              hint: 'Stacked major thirds — strange and dreamlike.',                                                   dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','Diminished','Augmented'],                                                                                                               scales: [] },
  { name: 'Add Dominant 7',             hint: 'Jazz and blues foundation. Wants to resolve.',                                                    dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','Diminished','Augmented','Dominant 7'],                                                                                               scales: [] },
  { name: 'Dom 7 vs Major 7',           hint: 'Major 7 is lush and jazzy — one note different from Dominant 7.',                                dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','Diminished','Augmented','Dominant 7','Major 7'],                                                                                   scales: [] },
  { name: 'Add Minor 7',                hint: 'Melancholy and smooth — workhorse of jazz and R&B.',                                              dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','Diminished','Augmented','Dominant 7','Major 7','Minor 7'],                                                                         scales: [] },
  { name: 'Add Half-Dim & Dim 7',       hint: 'Two diminished 7th flavours: half-dim (jazz), full dim7 (classical).',                           dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','Dominant 7','Major 7','Minor 7','Minor 7♭5','Diminished 7'],                                                                    scales: [] },
  { name: 'Meet Sus Chords',            hint: 'Sus2 and sus4 suspend the 3rd — open and ambiguous, wanting to resolve.',                          dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','sus2','sus4'],                                                                                                                     scales: [] },
  { name: 'All Triads + Sus',           hint: 'Major, minor, dim, aug — now with sus2 and sus4. Six triad qualities.',                            dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','Diminished','Augmented','sus2','sus4'],                                                                                         scales: [] },
  // ── Phase 5: Scales ───────────────────────────────────────────────────────
  { name: 'Major vs Natural Minor',     hint: 'Same notes, different start. Hear the colour change.',                                            dirs: DIR_ASC,  intervals: [], chords: [], scales: ['Major','Natural minor'] },
  { name: 'Add Pentatonic Scales',      hint: 'The pentatonic — 5-note scale, backbone of blues and rock.',                                     dirs: DIR_ASC,  intervals: [], chords: [], scales: ['Major','Natural minor','Major pentatonic','Minor pentatonic'] },
  { name: 'Add Harmonic Minor',         hint: 'Raised 7th gives harmonic minor its dramatic, classical sound.',                                  dirs: DIR_ASC,  intervals: [], chords: [], scales: ['Major','Natural minor','Harmonic minor','Major pentatonic','Minor pentatonic'] },
  { name: 'Add Melodic Minor',          hint: 'Jazz\'s workhorse. Raised 6th and 7th.',                                                         dirs: DIR_ASC,  intervals: [], chords: [], scales: ['Major','Natural minor','Harmonic minor','Melodic minor','Major pentatonic','Minor pentatonic'] },
  { name: 'Add the Modes',              hint: 'Seven modes of the major scale — each has a unique flavour.',                                     dirs: DIR_ASC,  intervals: [], chords: [], scales: ['Major','Natural minor','Harmonic minor','Melodic minor','Major pentatonic','Minor pentatonic','Modes'] },
  // ── Phase 6: Mixed — all directions for interval-containing stages ────────
  { name: 'Mixed: Intervals & Chords',  hint: 'Interval recognition combined with chord quality — all directions.',                              dirs: DIR_ALL,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Tritone'], chords: ['Major','Minor','Dominant 7'],                                            scales: [] },
  { name: 'Mixed: Chords & Scales',     hint: 'Tell apart chord arpeggios from ascending scale patterns.',                                       dirs: DIR_ASC,  intervals: [], chords: ['Major','Minor','Major 7','Minor 7','Dominant 7'],           scales: ['Major','Natural minor','Major pentatonic','Minor pentatonic'] },
  { name: 'Mixed: Intervals & Scales',  hint: 'Single intervals alongside full scale patterns — all directions.',                                dirs: DIR_ALL,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th','Tritone'], chords: [], scales: ['Major','Natural minor','Harmonic minor','Major pentatonic','Minor pentatonic'] },
  { name: 'Full Mixed — Foundation',    hint: 'Intervals, chords, and scales together — core vocabulary, all directions.',                       dirs: DIR_ALL,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th','Tritone'], chords: ['Major','Minor','Diminished','Dominant 7','Major 7','Minor 7'], scales: ['Major','Natural minor','Major pentatonic','Minor pentatonic'] },
  { name: 'Full Mixed — Extended',      hint: 'All chord types added, all interval directions.',                                                 dirs: DIR_ALL,  intervals: ['Octave','Perfect 5th','Perfect 4th','Major 3rd','Minor 3rd','Major 6th','Minor 6th','Major 2nd','Tritone'], chords: ['Major','Minor','Diminished','Augmented','Dominant 7','Major 7','Minor 7','Minor 7♭5','Diminished 7'], scales: ['Major','Natural minor','Harmonic minor','Major pentatonic','Minor pentatonic'] },
  { name: 'Complete Vocabulary',        hint: 'All intervals (including compound), all chord types, all scales.',                                dirs: DIR_ALL,  intervals: [...ALL_SIMPLE_INTERVALS,...ALL_COMPOUND_INTERVALS], chords: ['Major','Minor','Diminished','Augmented','Dominant 7','Major 7','Minor 7','Minor 7♭5','Diminished 7'], scales: ['Major','Natural minor','Harmonic minor','Melodic minor','Major pentatonic','Minor pentatonic'] },
  { name: 'Master Level',               hint: 'Everything enabled — all 18 intervals, all directions. The ultimate ear training challenge.',     dirs: DIR_ALL,  intervals: [...ALL_SIMPLE_INTERVALS,...ALL_COMPOUND_INTERVALS], chords: ['Major','Minor','Diminished','Augmented','Dominant 7','Major 7','Minor 7','sus2','sus4','Minor 7♭5','Diminished 7'], scales: ['Major','Natural minor','Harmonic minor','Melodic minor','Major pentatonic','Minor pentatonic','Modes'] },
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

// Ear training DOM
const earHearBtn          = document.getElementById('earHearBtn');
const earChoices          = document.getElementById('earChoices');
const earRadialDiv        = document.getElementById('earRadial');
const earRadialSvg        = document.getElementById('earRadialSvg');
const earLabelToggle      = document.getElementById('earLabelToggle');
const earLine1            = document.getElementById('earLine1');
const earLine2            = document.getElementById('earLine2');
const earSessionStats     = document.getElementById('earSessionStats');
const earScoreDisplay     = document.getElementById('earScoreDisplay');
const earStreakDisplay    = document.getElementById('earStreakDisplay');
const earPathStart        = document.getElementById('earPathStart');
const earPathActive       = document.getElementById('earPathActive');
const earPathStageNum     = document.getElementById('earPathStageNum');
const earPathStageName    = document.getElementById('earPathStageName');
const earPathStageHint    = document.getElementById('earPathStageHint');
const earPathProgressFill = document.getElementById('earPathProgressFill');
const earPathHeaderLabel  = document.getElementById('earPathHeaderLabel');
const earStartPathBtn     = document.getElementById('earStartPathBtn');
const earStagePrevBtn     = document.getElementById('earStagePrevBtn');
const earStageNextBtn     = document.getElementById('earStageNextBtn');
const earLeavePathBtn     = document.getElementById('earLeavePathBtn');

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

let earAdaptWeights = (() => {
  try { return JSON.parse(localStorage.getItem('mpr_weights_ear')) || { types: {} }; }
  catch (_) { return { types: {} }; }
})();

let earTabActive      = false;
let earCurrentPrompt  = null;
let earAnswered       = false;
let earSessionCorrect = 0;
let earSessionTotal   = 0;
let earStreak         = 0;
let earLearningStage  = -1;
let earPromptStartTime = null;
let earSessionMsSum   = 0;
let earSessionCount   = 0;
let statsActiveTab    = 'playing';
let earShowLabels     = false;

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
  return [...NOTES, ...ENHARMONIC_NOTES].filter(n => {
    const el = document.querySelector(`input[data-note="${n}"]`);
    return el && el.checked;
  });
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
  if (!g[key]) {
    g[key] = { ema: ms, ema_slow: ms, count: 1 };
  } else {
    g[key].ema      = 0.3  * ms + 0.7  * g[key].ema;
    g[key].ema_slow = 0.07 * ms + 0.93 * (g[key].ema_slow ?? g[key].ema);
    g[key].count    = Math.min(g[key].count + 1, 9999);
  }
}

function loadDailyLog() {
  try { return JSON.parse(localStorage.getItem('mpr_daily')) || []; }
  catch (_) { return []; }
}

function updateDailyLog(ms, isEar = false) {
  const log   = loadDailyLog();
  const today = new Date().toISOString().slice(0, 10);
  const idx   = log.findIndex(e => e.date === today);
  if (idx >= 0) {
    const e = log[idx];
    if (isEar) {
      const ea = e.earAnswers ?? 0;
      e.earAvgMs  = Math.round(((e.earAvgMs ?? ms) * ea + ms) / (ea + 1));
      e.earAnswers = ea + 1;
    } else {
      e.avgMs  = Math.round((e.avgMs * e.answers + ms) / (e.answers + 1));
      e.answers++;
    }
  } else {
    if (isEar) {
      log.push({ date: today, answers: 0, avgMs: 0, earAnswers: 1, earAvgMs: ms });
    } else {
      log.push({ date: today, answers: 1, avgMs: ms });
    }
  }
  while (log.length > 30) log.shift();
  localStorage.setItem('mpr_daily', JSON.stringify(log));
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

function renderDailyChart(log) {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ dateStr, entry: log.find(e => e.date === dateStr) || null, isToday: i === 0 });
  }
  const withEntry = days.filter(d => d.entry);
  if (!withEntry.length) return '';
  const maxMs = Math.max(...withEntry.map(d => d.entry.avgMs));

  const cols = days.map(({ dateStr, entry, isToday }) => {
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    const lbl = isToday ? 'today' : ['Su','Mo','Tu','We','Th','Fr','Sa'][dow];
    if (!entry) {
      return `<div class="chart-col"><div class="chart-bar-area"></div><span class="chart-day">${lbl}</span></div>`;
    }
    const h   = Math.max(4, Math.round((entry.avgMs / maxMs) * 60));
    const tip = `${(entry.avgMs / 1000).toFixed(1)}s avg · ${entry.answers} answer${entry.answers === 1 ? '' : 's'}`;
    return `<div class="chart-col">
      <div class="chart-bar-area"><div class="chart-bar${isToday ? ' today' : ''}" style="height:${h}px" title="${tip}"></div></div>
      <span class="chart-day${isToday ? ' today' : ''}">${lbl}</span>
    </div>`;
  }).join('');

  return `<div class="stats-chart-wrap">
    <h3 class="stats-section-title">14-Day Avg Response Time <span class="chart-note">shorter = faster</span></h3>
    <div class="stats-chart">${cols}</div>
  </div>`;
}

function getTrend(entry) {
  if (!entry.ema_slow || entry.count < 6) return '';
  const r = entry.ema / entry.ema_slow;
  if (r < 0.88) return `<span class="trend up" title="Getting faster">▲</span>`;
  if (r > 1.12) return `<span class="trend down" title="Getting slower">▼</span>`;
  return `<span class="trend flat" title="Stable">—</span>`;
}

function renderStats() {
  const rootEntries = Object.entries(adaptWeights.roots);
  const typeEntries = Object.entries(adaptWeights.types);
  const log         = loadDailyLog();
  const today       = new Date().toISOString().slice(0, 10);
  const todayEntry  = log.find(e => e.date === today);
  const totalAns    = log.reduce((s, e) => s + e.answers, 0);

  if (!rootEntries.length && !typeEntries.length && !log.length) {
    return `<p class="stats-empty">No data yet. Play prompts with MIDI enabled — each correct answer starts building your profile.</p>`;
  }

  const headerHtml = `<div class="stats-header-row">
    <div class="stats-header-stat">
      <span class="stats-header-num">${totalAns}</span>
      <span class="stats-header-lbl">answers (30 days)</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${log.length}</span>
      <span class="stats-header-lbl">days practiced</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${todayEntry ? todayEntry.answers : 0}</span>
      <span class="stats-header-lbl">today</span>
    </div>
  </div>`;

  const legendHtml = `<div class="stats-legend">
    <span class="legend-item"><span class="legend-dot" style="background:hsl(120deg 58% 48%)"></span>Fast</span>
    <span class="legend-item"><span class="legend-dot" style="background:hsl(30deg 90% 52%)"></span>Medium</span>
    <span class="legend-item"><span class="legend-dot" style="background:hsl(0deg 70% 55%)"></span>Needs work</span>
    <span class="legend-item"><span class="trend up">▲</span>&nbsp;improving</span>
    <span class="legend-item"><span class="trend down">▼</span>&nbsp;slowing</span>
    <span class="legend-item dim"><span class="legend-dot" style="background:var(--text-dim)"></span>&lt;3 answers</span>
  </div>`;

  const chartHtml = log.length >= 2 ? renderDailyChart(log) : '';

  function buildSection(entries, title) {
    if (!entries.length) return '';
    const sorted   = [...entries].sort(([, a], [, b]) => b.ema - a.ema);
    const withData = sorted.filter(([, e]) => e.count >= 3);
    const maxEma   = withData.length ? Math.max(...withData.map(([, e]) => e.ema)) : null;
    const minEma   = withData.length ? Math.min(...withData.map(([, e]) => e.ema)) : null;
    const delta    = (maxEma && minEma && maxEma !== minEma) ? maxEma - minEma : null;

    const rows = sorted.map(([key, entry]) => {
      const hasData = entry.count >= 3;
      const secs    = (entry.ema / 1000).toFixed(1) + 's';
      const trend   = hasData ? getTrend(entry) : '';
      let barHtml, badgeHtml = '';
      if (hasData && maxEma !== null) {
        const mastery = delta ? (maxEma - entry.ema) / delta : 0.5;
        const pct = Math.round(mastery * 76 + 12);
        const hue = Math.round(mastery * 120);
        barHtml   = `<div class="stats-bar-track"><div class="stats-bar-fill" style="width:${pct}%;background:hsl(${hue}deg 65% 50%)"></div></div>`;
        if (mastery < 0.25)      badgeHtml = `<span class="stats-badge needs-work">needs work</span>`;
        else if (mastery > 0.75) badgeHtml = `<span class="stats-badge strong">strong</span>`;
      } else {
        barHtml   = `<div class="stats-bar-track"><div class="stats-bar-fill building"></div></div>`;
        badgeHtml = `<span class="stats-badge building">${entry.count}/3</span>`;
      }
      return `<div class="stats-row${hasData ? '' : ' dim-row'}">
        <span class="stats-key">${key}</span>
        ${barHtml}
        <span class="stats-time">${secs}</span>
        <span class="stats-count">${entry.count}×</span>
        <span class="stats-trend">${trend}</span>
        ${badgeHtml}
      </div>`;
    }).join('');

    return `<div class="stats-section"><h3 class="stats-section-title">${title}</h3>${rows}</div>`;
  }

  return headerHtml + legendHtml + chartHtml
    + buildSection(rootEntries, 'Root Notes')
    + buildSection(typeEntries, 'Types');
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

// ── Ear training adaptive weights ─────────────────────────────────────────────

function saveEarAdaptWeights() {
  localStorage.setItem('mpr_weights_ear', JSON.stringify(earAdaptWeights));
}

function updateEarAdaptWeight(label, ms) {
  const g = earAdaptWeights.types;
  if (!g[label]) {
    g[label] = { ema: ms, ema_slow: ms, count: 1 };
  } else {
    g[label].ema      = 0.3  * ms + 0.7  * g[label].ema;
    g[label].ema_slow = 0.07 * ms + 0.93 * (g[label].ema_slow ?? g[label].ema);
    g[label].count    = Math.min(g[label].count + 1, 9999);
  }
}

function weightedPickEar(items) {
  const g      = earAdaptWeights.types;
  const emas   = items.map(item => { const e = g[item]; return (e && e.count >= 3) ? e.ema : null; });
  const withData = emas.filter(v => v !== null);
  const mean   = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : null;
  const weights = emas.map(v => (mean && v) ? Math.max(0.5, Math.min(3.0, v / mean)) : 1.0);
  const total  = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function recordEarResult(label, ms) {
  updateEarAdaptWeight(label, ms);
  saveEarAdaptWeights();
}

// ── Ear training helpers ───────────────────────────────────────────────────────

const EAR_DIR_MAP = {
  earDirAscending:  { key: 'above',    label: '↑ ascending'  },
  earDirDescending: { key: 'below',    label: '↓ descending' },
  earDirHarmonic:   { key: 'harmonic', label: '↕ harmonic'   },
};

function enabledEarDirections() {
  return Object.entries(EAR_DIR_MAP)
    .filter(([id]) => document.getElementById(id)?.checked)
    .map(([, d]) => d);
}

function enabledEarIntervals() {
  return Object.entries(EAR_INT_MAP)
    .filter(([id]) => document.getElementById(id)?.checked)
    .map(([, label]) => label);
}

function enabledEarChordTypes() {
  return Object.entries(EAR_CHORD_MAP)
    .filter(([id]) => document.getElementById(id)?.checked)
    .map(([, label]) => label);
}

function enabledEarScaleTypes() {
  return Object.entries(EAR_SCALE_MAP)
    .filter(([id]) => document.getElementById(id)?.checked)
    .flatMap(([, label]) => label === null ? MODES : [label]);
}

function getDistractors(correct, pool, count) {
  const others   = pool.filter(x => x !== correct);
  const shuffled = [...others];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function earPenaltyMs() {
  if (earSessionCount === 0) return 6000;
  return Math.max((earSessionMsSum / earSessionCount) * 2, 6000);
}

// ── Ear training generators ───────────────────────────────────────────────────

function genEarInterval() {
  const pool = enabledEarIntervals();
  if (pool.length < 2) return null;
  const dirs = enabledEarDirections();
  if (!dirs.length) return null;
  const correct     = weightedPickEar(pool);
  const root        = pick(NOTES);
  const dir         = pick(dirs);
  const distractors = getDistractors(correct, pool, Math.min(3, pool.length - 1));
  const choices     = [...distractors, correct].sort(() => Math.random() - 0.5);
  return {
    type: 'interval', correct, choices,
    line1: 'What interval?',
    line2: `Root: ${root} · ${dir.label}`,
    playKey: `interval|${correct}|${root}|${dir.key}`,
  };
}

function genEarChord() {
  const pool = enabledEarChordTypes();
  if (pool.length < 2) return null;
  const correct     = weightedPickEar(pool);
  const root        = pick(NOTES);
  const distractors = getDistractors(correct, pool, Math.min(3, pool.length - 1));
  const choices     = [...distractors, correct].sort(() => Math.random() - 0.5);
  return {
    type: 'chord', correct, choices,
    line1: root,
    line2: 'What chord quality?',
    playKey: `chord|${root}|${correct}|`,
  };
}

function genEarScale() {
  const pool = enabledEarScaleTypes();
  if (pool.length < 2) return null;
  const correct     = weightedPickEar(pool);
  const root        = pick(NOTES);
  const distractors = getDistractors(correct, pool, Math.min(3, pool.length - 1));
  const choices     = [...distractors, correct].sort(() => Math.random() - 0.5);
  return {
    type: 'scale', correct, choices,
    line1: root,
    line2: 'What scale type?',
    playKey: `scale|${root}|${correct}`,
  };
}

function genEarPrompt() {
  const gens = [];
  if (document.getElementById('earCatIntervals')?.checked && enabledEarIntervals().length >= 2)  gens.push(genEarInterval);
  if (document.getElementById('earCatChords')?.checked    && enabledEarChordTypes().length >= 2)  gens.push(genEarChord);
  if (document.getElementById('earCatScales')?.checked    && enabledEarScaleTypes().length >= 2)  gens.push(genEarScale);
  if (!gens.length) return null;
  return pick(gens)();
}

// ── Ear training UI ───────────────────────────────────────────────────────────

// ── Radial wheel ───────────────────────────────────────────────────────────────

const RADIAL_INNER_R = 70;
const RADIAL_OUTER_R = 112;
const RADIAL_NR      = { inner: 17, outer: 14 };

function radialXY(angleDeg, r) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return [r * Math.cos(rad), r * Math.sin(rad)];
}

function drawRadial(prompt) {
  const enabled = new Set(enabledEarIntervals());

  // Per-angle: outermost radius and color
  const spokeMax = {}, spokeCol = {};
  for (const [lbl, { angle, ring }] of Object.entries(SPOKE_DATA)) {
    if (!enabled.has(lbl)) continue;
    const r = ring === 'inner' ? RADIAL_INNER_R : RADIAL_OUTER_R;
    if (!spokeMax[angle] || r > spokeMax[angle]) spokeMax[angle] = r;
    spokeCol[angle] = INTERVAL_FAMILY_COLOR[lbl] || '#888';
  }
  const anyOuter = [...enabled].some(l => SPOKE_DATA[l]?.ring === 'outer');

  let h = '';

  // Spoke lines (behind everything)
  for (const [angle, maxR] of Object.entries(spokeMax)) {
    const col = spokeCol[angle];
    const [x0, y0] = radialXY(+angle, 25);
    const [x1, y1] = radialXY(+angle, maxR + RADIAL_NR.outer + 4);
    h += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${col}" stroke-width="1" stroke-opacity="0.2"/>`;
  }

  // Rings
  h += `<circle cx="0" cy="0" r="${RADIAL_INNER_R}" fill="none" stroke="var(--border-light)" stroke-width="1"/>`;
  if (anyOuter) h += `<circle cx="0" cy="0" r="${RADIAL_OUTER_R}" fill="none" stroke="var(--border-light)" stroke-width="1" stroke-opacity="0.6"/>`;

  // Nodes
  for (const [lbl, { angle, ring }] of Object.entries(SPOKE_DATA)) {
    if (!enabled.has(lbl)) continue;
    const r   = ring === 'inner' ? RADIAL_INNER_R : RADIAL_OUTER_R;
    const nr  = RADIAL_NR[ring];
    const col = INTERVAL_FAMILY_COLOR[lbl] || '#888';
    const [x, y] = radialXY(angle, r);
    const xs = x.toFixed(1), ys = y.toFixed(1);
    h += `<g class="radial-node" data-interval="${lbl}">`;
    h += `<circle cx="${xs}" cy="${ys}" r="${nr + 8}" fill="transparent"/>`;  // hit area
    h += `<circle cx="${xs}" cy="${ys}" r="${nr}" fill="${col}" fill-opacity="0.13" stroke="${col}" stroke-width="1.5" class="rnode-circle" data-interval="${lbl}"/>`;
    if (earShowLabels) {
      h += `<text x="${xs}" y="${ys}" text-anchor="middle" dominant-baseline="central" font-size="8.5" font-weight="700" fill="${col}" pointer-events="none" class="rnode-lbl">${INTERVAL_ABBR[lbl] || lbl}</text>`;
    }
    h += `</g>`;
  }

  // Center: root note
  const root = prompt.playKey.split('|')[2] || '';
  h += `<circle cx="0" cy="0" r="22" fill="var(--card)" stroke="var(--border-light)" stroke-width="2"/>`;
  h += `<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="var(--text)" pointer-events="none">${root}</text>`;

  earRadialSvg.innerHTML = h;
  earRadialSvg.classList.remove('answered');
}

function colorRadialNode(lbl, cls) {
  const circle = earRadialSvg.querySelector(`.rnode-circle[data-interval="${lbl}"]`);
  if (!circle) return;
  const fill = cls === 'correct' ? '#22c55e' : '#ef4444';
  circle.setAttribute('fill', fill);
  circle.setAttribute('fill-opacity', '0.8');
  circle.setAttribute('stroke', fill);
  const lblEl = circle.parentElement?.querySelector('.rnode-lbl');
  if (lblEl) lblEl.setAttribute('fill', '#fff');
}

function handleRadialAnswer(lbl) {
  if (earAnswered || !earCurrentPrompt) return;
  earAnswered = true;
  earRadialSvg.classList.add('answered');

  const isCorrect = lbl === earCurrentPrompt.correct;
  const ms        = Date.now() - earPromptStartTime;

  earSessionTotal++;
  earSessionMsSum += ms;
  earSessionCount++;
  if (isCorrect) { earSessionCorrect++; earStreak++; }
  else           { earStreak = 0; }

  colorRadialNode(lbl, isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) colorRadialNode(earCurrentPrompt.correct, 'correct');

  updateEarSessionStats();

  const recordMs = isCorrect ? ms : earPenaltyMs();
  recordEarResult(earCurrentPrompt.correct, recordMs);
  updateDailyLog(ms, true);

  if (!isCorrect) {
    setTimeout(async () => {
      await playPromptKey(earCurrentPrompt.playKey, earHearBtn);
      showEarPrompt();
    }, 450);
  } else {
    setTimeout(() => showEarPrompt(), 1000);
  }
}

function updateEarSessionStats() {
  if (earSessionTotal === 0) { earSessionStats.classList.add('hidden'); return; }
  earSessionStats.classList.remove('hidden');
  const pct = Math.round(earSessionCorrect / earSessionTotal * 100);
  earScoreDisplay.textContent  = `${earSessionCorrect}/${earSessionTotal} (${pct}%)`;
  earStreakDisplay.textContent  = earStreak >= 3 ? `🔥 ${earStreak}` : earStreak > 0 ? `streak ${earStreak}` : '';
}

async function showEarPrompt() {
  const prompt = genEarPrompt();
  if (!prompt) {
    earLine1.textContent = 'No categories ready';
    earLine2.textContent = 'Enable 2+ items in a category below';
    earChoices.innerHTML = '';
    earChoices.classList.remove('hidden');
    earRadialDiv.classList.add('hidden');
    earHearBtn.disabled  = true;
    return;
  }

  earCurrentPrompt   = prompt;
  earAnswered        = false;
  earPromptStartTime = Date.now();

  earLine1.textContent = prompt.line1;
  earLine2.textContent = prompt.line2;
  earHearBtn.disabled  = false;

  if (prompt.type === 'interval') {
    earChoices.classList.add('hidden');
    earRadialDiv.classList.remove('hidden');
    drawRadial(prompt);
  } else {
    earRadialDiv.classList.add('hidden');
    earChoices.classList.remove('hidden');
    earChoices.innerHTML = '';
    prompt.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className      = 'ear-choice-btn';
      btn.textContent    = choice;
      btn.dataset.choice = choice;
      btn.addEventListener('click', () => handleEarAnswer(choice));
      earChoices.appendChild(btn);
    });
  }

  await playPromptKey(prompt.playKey, earHearBtn);
}

function handleEarAnswer(chosen) {
  if (earAnswered || !earCurrentPrompt) return;
  earAnswered = true;

  const isCorrect = chosen === earCurrentPrompt.correct;
  const ms        = Date.now() - earPromptStartTime;

  earSessionTotal++;
  earSessionMsSum += ms;
  earSessionCount++;
  if (isCorrect) { earSessionCorrect++; earStreak++; }
  else           { earStreak = 0; }

  document.querySelectorAll('.ear-choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.choice === earCurrentPrompt.correct) btn.classList.add('correct');
    else if (btn.dataset.choice === chosen && !isCorrect)  btn.classList.add('wrong');
  });

  updateEarSessionStats();

  const recordMs = isCorrect ? ms : earPenaltyMs();
  recordEarResult(earCurrentPrompt.correct, recordMs);
  updateDailyLog(ms, true);

  if (!isCorrect) {
    setTimeout(async () => {
      await playPromptKey(earCurrentPrompt.playKey, earHearBtn);
      showEarPrompt();
    }, 450);
  } else {
    setTimeout(() => showEarPrompt(), 1000);
  }
}

// ── Ear training settings persistence ────────────────────────────────────────

function saveEarSettings() {
  const ids = [
    'earCatIntervals', 'earCatChords', 'earCatScales',
    ...Object.keys(EAR_DIR_MAP),
    ...Object.keys(EAR_INT_MAP),
    ...Object.keys(EAR_CHORD_MAP),
    ...Object.keys(EAR_SCALE_MAP),
  ];
  const checks = Object.fromEntries(ids.map(id => {
    const el = document.getElementById(id);
    return [id, el ? el.checked : false];
  }));
  localStorage.setItem('mpr_ear_settings', JSON.stringify({ checks, showLabels: earShowLabels }));
}

function loadEarSettings() {
  const raw = localStorage.getItem('mpr_ear_settings');
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (s.checks) {
      Object.entries(s.checks).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.checked = val;
      });
    }
    if (typeof s.showLabels === 'boolean') {
      earShowLabels = s.showLabels;
      earLabelToggle.textContent = earShowLabels ? 'Hide labels' : 'Show labels';
      earLabelToggle.classList.toggle('active', earShowLabels);
    }
  } catch (_) {}
}

function syncEarUI() {
  document.getElementById('earIntOptions').classList.toggle('disabled',   !document.getElementById('earCatIntervals').checked);
  document.getElementById('earChordOptions').classList.toggle('disabled', !document.getElementById('earCatChords').checked);
  document.getElementById('earScaleOptions').classList.toggle('disabled', !document.getElementById('earCatScales').checked);
}

// ── Ear training learning path ────────────────────────────────────────────────

function applyEarStage(idx) {
  const stage = EAR_TRAINING_PATH[idx];

  // Clear all ear settings
  Object.keys(EAR_INT_MAP).forEach(id   => { const el = document.getElementById(id);   if (el) el.checked = false; });
  Object.keys(EAR_CHORD_MAP).forEach(id => { const el = document.getElementById(id);   if (el) el.checked = false; });
  Object.keys(EAR_SCALE_MAP).forEach(id => { const el = document.getElementById(id);   if (el) el.checked = false; });
  Object.keys(EAR_DIR_MAP).forEach(id   => { const el = document.getElementById(id);   if (el) el.checked = false; });
  document.getElementById('earCatIntervals').checked = false;
  document.getElementById('earCatChords').checked    = false;
  document.getElementById('earCatScales').checked    = false;

  // Set directions
  const stageDirs = stage.dirs || DIR_ASC;
  stageDirs.forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });

  const intLabelToId   = Object.fromEntries(Object.entries(EAR_INT_MAP).map(([id, l])   => [l, id]));
  const chordLabelToId = Object.fromEntries(Object.entries(EAR_CHORD_MAP).map(([id, l]) => [l, id]));
  const scaleLabelToId = Object.fromEntries(
    Object.entries(EAR_SCALE_MAP).filter(([, l]) => l !== null).map(([id, l]) => [l, id])
  );

  if (stage.intervals.length) {
    document.getElementById('earCatIntervals').checked = true;
    stage.intervals.forEach(lbl => {
      const id = intLabelToId[lbl];
      if (id) document.getElementById(id).checked = true;
    });
  }
  if (stage.chords.length) {
    document.getElementById('earCatChords').checked = true;
    stage.chords.forEach(lbl => {
      const id = chordLabelToId[lbl];
      if (id) document.getElementById(id).checked = true;
    });
  }
  if (stage.scales.length) {
    document.getElementById('earCatScales').checked = true;
    stage.scales.forEach(lbl => {
      if (lbl === 'Modes') {
        document.getElementById('earScaleModes').checked = true;
      } else {
        const id = scaleLabelToId[lbl];
        if (id) document.getElementById(id).checked = true;
      }
    });
  }

  earLearningStage = idx;
  localStorage.setItem('mpr_ear_stage', idx);
  saveEarSettings();
  syncEarUI();
  updateEarPathUI();
  showEarPrompt();
}

function updateEarPathUI() {
  const total  = EAR_TRAINING_PATH.length;
  const active = earLearningStage >= 0 && earLearningStage < total;
  earPathStart.classList.toggle('hidden', active);
  earPathActive.classList.toggle('hidden', !active);

  if (active) {
    const stage = EAR_TRAINING_PATH[earLearningStage];
    earPathStageNum.textContent  = `Stage ${earLearningStage + 1} of ${total}`;
    earPathStageName.textContent = stage.name;
    earPathStageHint.textContent = stage.hint;
    earPathProgressFill.style.width = ((earLearningStage + 1) / total * 100) + '%';
    earStagePrevBtn.disabled = earLearningStage === 0;
    earStageNextBtn.disabled = earLearningStage === total - 1;
    earPathHeaderLabel.textContent = `· Stage ${earLearningStage + 1}`;
  } else {
    earPathHeaderLabel.textContent = '';
  }
}

// ── Ear training stats ────────────────────────────────────────────────────────

function renderEarStats() {
  const typeEntries = Object.entries(earAdaptWeights.types);
  const log         = loadDailyLog();
  const today       = new Date().toISOString().slice(0, 10);
  const todayEntry  = log.find(e => e.date === today);
  const totalAns    = log.reduce((s, e) => s + (e.earAnswers ?? 0), 0);

  if (!typeEntries.length && !totalAns) {
    return `<p class="stats-empty">No ear training data yet. Open Ear Training and start identifying intervals, chords, and scales.</p>`;
  }

  const headerHtml = `<div class="stats-header-row">
    <div class="stats-header-stat">
      <span class="stats-header-num">${totalAns}</span>
      <span class="stats-header-lbl">ear answers (30 days)</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${log.filter(e => (e.earAnswers ?? 0) > 0).length}</span>
      <span class="stats-header-lbl">days trained</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${todayEntry?.earAnswers ?? 0}</span>
      <span class="stats-header-lbl">today</span>
    </div>
  </div>`;

  const legendHtml = `<div class="stats-legend">
    <span class="legend-item"><span class="legend-dot" style="background:hsl(120deg 58% 48%)"></span>Fast</span>
    <span class="legend-item"><span class="legend-dot" style="background:hsl(30deg 90% 52%)"></span>Medium</span>
    <span class="legend-item"><span class="legend-dot" style="background:hsl(0deg 70% 55%)"></span>Needs work</span>
    <span class="legend-item dim"><span class="legend-dot" style="background:var(--text-dim)"></span>&lt;3 answers</span>
  </div>`;

  function buildEarSection(entries, title) {
    if (!entries.length) return '';
    const sorted   = [...entries].sort(([, a], [, b]) => b.ema - a.ema);
    const withData = sorted.filter(([, e]) => e.count >= 3);
    const maxEma   = withData.length ? Math.max(...withData.map(([, e]) => e.ema)) : null;
    const minEma   = withData.length ? Math.min(...withData.map(([, e]) => e.ema)) : null;
    const delta    = (maxEma && minEma && maxEma !== minEma) ? maxEma - minEma : null;

    const rows = sorted.map(([key, entry]) => {
      const hasData = entry.count >= 3;
      const secs    = (entry.ema / 1000).toFixed(1) + 's';
      const trend   = hasData ? getTrend(entry) : '';
      let barHtml, badgeHtml = '';
      if (hasData && maxEma !== null) {
        const mastery = delta ? (maxEma - entry.ema) / delta : 0.5;
        const pct = Math.round(mastery * 76 + 12);
        const hue = Math.round(mastery * 120);
        barHtml   = `<div class="stats-bar-track"><div class="stats-bar-fill" style="width:${pct}%;background:hsl(${hue}deg 65% 50%)"></div></div>`;
        if (mastery < 0.25)      badgeHtml = `<span class="stats-badge needs-work">needs work</span>`;
        else if (mastery > 0.75) badgeHtml = `<span class="stats-badge strong">strong</span>`;
      } else {
        barHtml   = `<div class="stats-bar-track"><div class="stats-bar-fill building"></div></div>`;
        badgeHtml = `<span class="stats-badge building">${entry.count}/3</span>`;
      }
      return `<div class="stats-row${hasData ? '' : ' dim-row'}">
        <span class="stats-key">${key}</span>
        ${barHtml}
        <span class="stats-time">${secs}</span>
        <span class="stats-count">${entry.count}×</span>
        <span class="stats-trend">${trend}</span>
        ${badgeHtml}
      </div>`;
    }).join('');

    return `<div class="stats-section"><h3 class="stats-section-title">${title}</h3>${rows}</div>`;
  }

  return headerHtml + legendHtml + buildEarSection(typeEntries, 'Recognition Types');
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

  let display;
  if (checked('jazzSymbols') && JAZZ_SYMBOLS[type.id]) {
    const sym = pick(JAZZ_SYMBOLS[type.id]);
    display = `${note}${sym}`;
  } else {
    display = `${note} ${type.label}`;
  }

  return {
    line1: display,
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
  const rootIdx = (NOTE_TO_PC[root] ?? -1);
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
  if (timerInterval === null) return;
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
    'inversions', 'jazzSymbols',
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
    notes:            Object.fromEntries([...NOTES, ...ENHARMONIC_NOTES].map(n => [n, document.querySelector(`input[data-note="${n}"]`)?.checked ?? false])),
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
      [...NOTES, ...ENHARMONIC_NOTES].forEach(n => {
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
  [...NOTES, ...ENHARMONIC_NOTES].forEach(n => { const el = document.querySelector(`input[data-note="${n}"]`); if (el) el.checked = onNotes.has(n); });

  const stageInts    = stage.intervals ?? (onCats.has('catIntervals') ? INTERVALS.map(i => i.id) : []);
  INTERVALS.forEach(i => { const el = document.getElementById(i.id); if (el) el.checked = stageInts.includes(i.id); });
  const stageIntDirs = stage.intDirs ?? (onCats.has('catIntervals') ? ['up'] : []);
  const elDirUp      = document.getElementById('intDirUp');
  const elDirDown    = document.getElementById('intDirDown');
  if (elDirUp)   elDirUp.checked   = stageIntDirs.includes('up');
  if (elDirDown) elDirDown.checked = stageIntDirs.includes('down');

  if (onCats.has('catDiatonic')) {
    const elDRoot = document.getElementById('diatonicRoot');
    const elDMode = document.getElementById('diatonicMode');
    if (elDRoot) elDRoot.value = stage.diatonicKey  ?? 'C';
    if (elDMode) elDMode.value = stage.diatonicMode ?? 'major';
  }

  stopTimer();
  stopMetronome();

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
    if (earTabActive) {
      if (earCurrentPrompt) playPromptKey(earCurrentPrompt.playKey, earHearBtn);
    } else {
      if (!isHeld) showPrompt();
    }
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
    const pc = (NOTE_TO_PC[parts[1]] ?? -1);
    return pc === -1 ? null : { type: 'note', pc };
  }

  if (type === 'chord') {
    const rootPC    = (NOTE_TO_PC[parts[1]] ?? -1);
    const intervals = CHORD_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (rootPC + i) % 12) };
  }

  if (type === 'scale') {
    const rootPC    = (NOTE_TO_PC[parts[1]] ?? -1);
    const intervals = SCALE_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    return { type: 'scale', pcs: intervals.map(i => (rootPC + i) % 12) };
  }

  if (type === 'interval') {
    const label     = parts[1];
    const rootPC    = (NOTE_TO_PC[parts[2]] ?? -1);
    const dir       = parts[3];
    const semitones = INTERVAL_SEMITONES[label];
    if (rootPC === -1 || semitones === undefined) return null;
    if (semitones === 12) return { type: 'octave', rootPC };
    const targetPC = dir === 'below'
      ? ((rootPC - semitones) % 12 + 12) % 12
      : (rootPC + semitones) % 12;           // 'above' or 'harmonic'
    return { type: 'interval', rootPC, targetPC };
  }

  if (type === 'diatonic') {
    const rootIdx    = (NOTE_TO_PC[parts[1]] ?? -1);
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
    const rootIdx = (NOTE_TO_PC[parts[1]] ?? -1);
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
    updateDailyLog(ms);
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

async function playPromptKey(key, btn) {
  if (hearItActive) return;
  const expected = getExpectedPCs(key);
  if (!expected) return;

  hearItActive = true;
  if (btn) btn.disabled = true;

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
      const parts    = key.split('|');
      const dir      = parts[3];
      const semis    = expected.type === 'octave' ? 12 : (INTERVAL_SEMITONES[parts[1]] ?? 0);
      const rootMidi = 60 + expected.rootPC;
      const tgtMidi  = dir === 'below' ? rootMidi - semis : rootMidi + semis;
      if (dir === 'harmonic') {
        await Promise.all([doPlay(rootMidi, 1400), doPlay(tgtMidi, 1400)]);
      } else {
        await doPlay(rootMidi, 650);
        await gap(80);
        await doPlay(tgtMidi, 900);
      }
    }

  } catch (_) {
  } finally {
    for (const n of [...demoNotes]) { demoNotes.delete(n); synthNoteOff(n); }
    updateKeyboard();
    hearItActive = false;
    if (btn) btn.disabled = false;
  }
}

async function hearIt() { await playPromptKey(currentPromptKey, hearBtn); }

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

// ── Tab switching ─────────────────────────────────────────────────────────────

function switchTab(tab) {
  earTabActive = (tab === 'ear');
  document.getElementById('practiceTab').classList.toggle('hidden', earTabActive);
  document.getElementById('earTab').classList.toggle('hidden', !earTabActive);
  document.getElementById('tabPractice').classList.toggle('active', !earTabActive);
  document.getElementById('tabEar').classList.toggle('active', earTabActive);

  if (earTabActive && !earCurrentPrompt) showEarPrompt();
}

document.getElementById('tabPractice').addEventListener('click', () => switchTab('practice'));
document.getElementById('tabEar').addEventListener('click',      () => switchTab('ear'));

midiBtn.addEventListener('click', () => { midiEnabled ? disableMidi() : enableMidi(); });
hearBtn.addEventListener('click', hearIt);
earHearBtn.addEventListener('click', () => {
  if (earCurrentPrompt) playPromptKey(earCurrentPrompt.playKey, earHearBtn);
});

helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
helpClose.addEventListener('click', () => helpModal.classList.add('hidden'));
helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.classList.add('hidden'); });

function exportJSON() {
  const data = { exported: new Date().toISOString(), adaptive_weights: adaptWeights, daily_log: loadDailyLog() };
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
    download: `mpr-backup-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click(); URL.revokeObjectURL(a.href);
}

function exportCSV() {
  const log = loadDailyLog();
  if (!log.length) return;
  const rows = [['Date','Answers','Avg Response Time (s)'],
    ...log.map(e => [e.date, e.answers, (e.avgMs / 1000).toFixed(2)])];
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })),
    download: `mpr-daily-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click(); URL.revokeObjectURL(a.href);
}

function openStats(tab = 'playing') {
  statsActiveTab = tab;
  document.getElementById('statsTabPlaying').classList.toggle('active', tab === 'playing');
  document.getElementById('statsTabEar').classList.toggle('active',     tab === 'ear');
  document.getElementById('statsContent').innerHTML = (tab === 'ear') ? renderEarStats() : renderStats();
  statsModal.classList.remove('hidden');
}

document.getElementById('viewStatsBtn').addEventListener('click', () => openStats('playing'));
document.getElementById('statsTabPlaying').addEventListener('click', () => openStats('playing'));
document.getElementById('statsTabEar').addEventListener('click',     () => openStats('ear'));

statsClose.addEventListener('click', () => statsModal.classList.add('hidden'));
statsModal.addEventListener('click', e => { if (e.target === statsModal) statsModal.classList.add('hidden'); });
function importJSON() {
  document.getElementById('importFileInput').click();
}

document.getElementById('importFileInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const restored = [];
      if (data.adaptive_weights) {
        adaptWeights = data.adaptive_weights;
        localStorage.setItem('mpr_weights', JSON.stringify(adaptWeights));
        restored.push('adaptive weights');
      }
      if (data.daily_log) {
        localStorage.setItem('mpr_daily', JSON.stringify(data.daily_log));
        restored.push('practice history');
      }
      const btn = document.getElementById('importJsonBtn');
      const orig = btn.textContent;
      btn.textContent = restored.length ? `Restored: ${restored.join(', ')}` : 'Nothing to restore';
      setTimeout(() => { btn.textContent = orig; }, 3000);
    } catch (_) {
      const btn = document.getElementById('importJsonBtn');
      const orig = btn.textContent;
      btn.textContent = 'Invalid file';
      setTimeout(() => { btn.textContent = orig; }, 3000);
    }
    this.value = '';
  };
  reader.readAsText(file);
});

document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
document.getElementById('importJsonBtn').addEventListener('click', importJSON);
document.getElementById('clearHistoryBtn').addEventListener('click', () => {
  localStorage.removeItem('mpr_daily');
  const btn = document.getElementById('clearHistoryBtn');
  btn.textContent = 'Cleared!';
  document.getElementById('statsContent').innerHTML = (statsActiveTab === 'ear') ? renderEarStats() : renderStats();
  setTimeout(() => { btn.textContent = 'Clear practice history'; }, 1800);
});

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

// ── Ear training init & listeners ─────────────────────────────────────────────

// Ear settings change → save + sync + refresh prompt if ear tab is open
document.querySelectorAll('#earTab input[type="checkbox"]').forEach(el => {
  el.addEventListener('change', () => {
    saveEarSettings();
    syncEarUI();
    if (earTabActive) showEarPrompt();
  });
});

// Radial wheel events
earLabelToggle.addEventListener('click', () => {
  earShowLabels = !earShowLabels;
  earLabelToggle.textContent = earShowLabels ? 'Hide labels' : 'Show labels';
  earLabelToggle.classList.toggle('active', earShowLabels);
  saveEarSettings();
  if (earCurrentPrompt?.type === 'interval' && !earAnswered) drawRadial(earCurrentPrompt);
});

earRadialSvg.addEventListener('click', e => {
  const node = e.target.closest('.radial-node');
  if (node) handleRadialAnswer(node.dataset.interval);
});

// Ear learning path buttons
earStartPathBtn.addEventListener('click', () => { earLearningStage = 0; applyEarStage(0); });
earStagePrevBtn.addEventListener('click', () => { if (earLearningStage > 0) applyEarStage(earLearningStage - 1); });
earStageNextBtn.addEventListener('click', () => { if (earLearningStage < EAR_TRAINING_PATH.length - 1) applyEarStage(earLearningStage + 1); });
earLeavePathBtn.addEventListener('click', () => {
  earLearningStage = -1;
  localStorage.removeItem('mpr_ear_stage');
  updateEarPathUI();
});

// Load ear settings and restore stage
loadEarSettings();
syncEarUI();
const _savedEarStage = parseInt(localStorage.getItem('mpr_ear_stage') ?? '-1');
if (!isNaN(_savedEarStage) && _savedEarStage >= 0 && _savedEarStage < EAR_TRAINING_PATH.length) {
  earLearningStage = _savedEarStage;
}
updateEarPathUI();
