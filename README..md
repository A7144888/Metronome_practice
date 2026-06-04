# Pro Metronome — Editable Rhythm Metronome

https://metronome-practice.vercel.app/

[中文說明](README.md)

Built out of personal interest and guitar practice needs. There’s still plenty of room to improve — thanks for your patience.

**(The UI is not fully optimized for mobile yet.)**

A browser-based metronome with a preset library, rhythm editor, and minimal performance mode. All logic runs on the frontend — no backend required.

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React 19 (JSX) |
| Build | Vite 8 |
| Styling | Tailwind CSS 3 + PostCSS + Autoprefixer |
| State | Zustand 5 |
| Audio | Web Audio API |
| Design | Material Design 3 |

## Features

### Three Views

**Presets**
<img width="1809" height="912" alt="Presets view screenshot" src="https://github.com/user-attachments/assets/3a7cf279-ebe3-4060-96fe-d3acfd6f45dd" />

- Built-in classic rhythm presets (standard 4/4, compound 6/8, etc.)
- Save, favorite, and delete custom rhythms
- Search by name or tags; filter by time signature
- Recently used list (up to 10 entries)
- Status bar shows current BPM, time signature, elapsed time, and measure count

**Editor**
<img width="1812" height="912" alt="Editor view screenshot" src="https://github.com/user-attachments/assets/742deec8-72ff-4ae8-b29b-7f1ecd468675" />

- **BPM**: 20–300 via slider, step buttons, or direct input; tempo names (Largo, Andante, Allegro, Presto, etc.)
- **Tap Tempo**: derive BPM from consecutive taps
- **Time signature**: common presets (4/4, 3/4, 6/8, 5/4, 7/8, 2/4) plus custom signatures
- **Rhythm editing**: measure → beat → subdivision hierarchy
- **Tabs**
  - **Beat**: proportional timeline (`SequenceGrid`) plus per-beat subdivision editor; capacity bar and overflow warnings
  - **Mixer**: master volume, accent volume, and sound set
- **Accents**: strong / medium / normal / none
- Dotted notes and ties
- Playback requires every beat’s subdivisions to fill exactly (prevents drift)
- Export / import rhythm as `.json` (format produced by this app)

**Performance**
<img width="1786" height="922" alt="Performance view screenshot" src="https://github.com/user-attachments/assets/3f63b16e-d3d1-4594-8dae-eb2902d97dd4" />

- Minimal stage UI with large BPM display
- Circular metronome with subdivision dots and accent markers
- Tap the circle to play / pause
- Sequence grid along the bottom

### Audio Engine

- Web Audio API lookahead scheduler (25 ms lookahead, 100 ms schedule window)
- Four sound sets: woodblock (default), electronic click, rimshot, classic beep
- Separate accent and master volume; live updates while playing
- Pause, resume, and stop

### Rhythm Model

- 480 ticks per quarter note
- Whole through thirty-second notes, plus triplets
- Beat-capacity validation so patterns stay rhythmically correct

## Install & Run (local)

### Requirements

- [Node.js](https://nodejs.org/) (includes npm)

### Setup

```bash
git clone <repository-url>
cd Metronome_practice
npm install
```

### Development server

```bash
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173/**).

> **Note:** Browser autoplay policies require a user gesture (e.g. a click) before `AudioContext` can start.

### Other scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |

## Project Structure

```
Metronome_practice/
├── public/                       # Static assets (served as-is)
│   ├── favicon.svg
│   └── icons.svg                 # Material Symbols sprite
├── src/
│   ├── main.jsx                  # React entry
│   ├── App.jsx                   # Renders view from store.view
│   ├── App.css                   # App-level styles
│   ├── index.css                 # Tailwind + MD3 component styles
│   ├── assets/                   # Images and other frontend assets
│   ├── engine/                   # Rhythm theory & audio (UI-agnostic)
│   │   ├── musicTheory.js        # Tick math, capacity validation, playback entries
│   │   └── audioEngine.js        # Web Audio singleton lookahead scheduler
│   ├── hooks/
│   │   ├── useMetronome.js       # Play / pause / stop transport
│   │   ├── useTapTempo.js        # Tap tempo BPM calculation
│   │   └── useMediaQuery.js      # Responsive media-query helper
│   ├── store/
│   │   └── metronomeStore.js     # Zustand single source of truth (rhythm, transport, presets)
│   ├── pages/
│   │   ├── PresetsPage.jsx       # Preset library
│   │   ├── EditorPage.jsx        # Rhythm editor (desktop + mobile layouts)
│   │   └── PerformancePage.jsx   # Performance mode
│   └── components/
│       ├── LibraryMenu.jsx       # Side nav (Presets / Editor / Performance)
│       ├── BpmControl.jsx        # BPM slider, steps, tap tempo
│       ├── TimeSignatureControl.jsx
│       ├── SequenceGrid.jsx      # Proportional timeline (Beat tab)
│       ├── SubdivisionEditor.jsx # Per-beat subdivision editing
│       ├── MixerPanel.jsx        # Volume & sound set (Mixer tab)
│       ├── PlaybackControls.jsx  # Play / pause / stop and stats
│       ├── BeatIndicator.jsx     # Current beat highlight
│       ├── PresetCard.jsx        # Preset card
│       └── Icon.jsx              # Material Symbols wrapper
├── index.html                    # HTML shell
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── package.json
└── PROJECT_CONTEXT.md            # Developer handoff notes (not a runtime dependency)
```

**Architecture notes**

- **No router library**: `metronomeStore.view` (`presets` | `editor` | `performance`) drives which page `App.jsx` renders.
- **Separation of concerns**: UI and preset logic live in `store/`; tick math in `engine/musicTheory.js`; sound in `engine/audioEngine.js`.
- **Shared navigation**: `LibraryMenu` appears on Presets, Editor, and Performance for global view switching.

## Data Model

```
timeSignature: { beats, noteValue }
measures: [
  {
    id,
    beats: [
      {
        id,
        subdivisions: [
          { id, value, dotted, tie, accent }
        ],
        carryOver
      }
    ]
  }
]
```

- **value**: note length (`quarter`, `eighth`, `sixteenth`, etc.)
- **dotted**: dotted note (×1.5 duration)
- **tie**: tied into the next note in the same beat
- **accent**: `strong` | `medium` | `normal` | `none`

## Workflow

1. **Open the app** — lands on Presets
2. **Pick or create a rhythm** — load a built-in preset or **New Preset** (blank 4/4)
3. **Edit** — adjust BPM, time signature, subdivisions, and accents in the editor
4. **Audition** — when every beat is full, press play
5. **Save** — save as a preset or export JSON
6. **Perform** — switch to Performance for a minimal practice / stage UI

## Roadmap

1. Account login and cloud persistence (backend + database)
2. Drum machine and more click sounds
3. More rhythm templates
4. Custom UI theming
5. Multiple measures with ties across bar lines

## Caveats

- Data lives in browser memory only — **a refresh drops custom presets**. Use **Export JSON** to back up.
- Changing time signature **resets** to one default measure.
- Leaving Editor or Performance stops audio and resets transport.
- Defaults: BPM 120, 4/4, woodblock sound set, master volume 0.8.

## License

For learning and personal practice only.
