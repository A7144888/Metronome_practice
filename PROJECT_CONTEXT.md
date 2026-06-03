# Metronome Practice — Project Context

> Handoff document. Read this once at the start of a new chat and you'll know enough to make changes without re-reading the whole codebase.

---

## 1. What this app is

A browser-based practice metronome with three views:

| View | Purpose |
|---|---|
| **Presets** (`/presets`) | Browse / load / favorite saved rhythm presets. Landing page. |
| **Editor** (`/editor`) | Edit a rhythm: BPM, time signature, per-beat note subdivisions, accents, ties, mixer. Also contains the playback controls used while editing. |
| **Performance** (`/performance`) | Minimal full-screen playback UI for stage use: big BPM, beat number, spinning indicator, play/stop. |

"Routing" is a single `view` field in the Zustand store; `App.jsx` switches on it.

## 2. Tech stack

- **React 19** + **Vite 8** + **Tailwind 3** (dark theme, `primary` = `#ec1313` red)
- **Zustand 5** for state (single store, no selectors, whole-store subscribes)
- **Web Audio API** for sound — no external audio libs
- No TypeScript, no router, no backend. `crypto.randomUUID()` used for IDs.

## 3. Directory map

```
src/
├── App.jsx                    # View switch (presets / editor / performance)
├── main.jsx, index.css, App.css
├── engine/
│   ├── musicTheory.js         # TICK math, note duration, beat validation
│   └── audioEngine.js         # Singleton Web Audio scheduler + synth
├── hooks/
│   ├── useMetronome.js        # Transport state machine wrapper around engine
│   └── useTapTempo.js         # Average-of-last-N-taps → BPM
├── store/
│   └── metronomeStore.js      # Zustand store (single source of truth)
├── pages/
│   ├── PresetsPage.jsx
│   ├── EditorPage.jsx
│   └── PerformancePage.jsx
└── components/
    ├── Sidebar.jsx            # Library nav (only Library section, no Categories)
    ├── BpmControl.jsx         # -/+/slider/preset-BPM-buttons (compact + full)
    ├── TimeSignatureControl.jsx
    ├── SubdivisionEditor.jsx  # Per-beat note editor ("Beats" tab)
    ├── SequenceGrid.jsx       # Proportional grid view ("Grid" tab)
    ├── MixerPanel.jsx         # Master / accent volumes, sound set
    ├── PlaybackControls.jsx   # play+stop (no replay button)
    ├── BeatIndicator.jsx      # Row of flashing beat boxes
    ├── PresetCard.jsx
    └── Icon.jsx               # Wraps Material Symbols font
```

## 4. Core data model (`metronomeStore.js`)

```
timeSignature : { beats, noteValue }
measures      : [ Measure ]

Measure = { id, beats: [ Beat ] }
Beat    = { id, subdivisions: [ Subdivision ], carryOver: ticks }
Subdivision = {
  id, value,           // 'whole'|'half'|'quarter'|'eighth'|'sixteenth'|'thirty-second'|'triplet'
  dotted: bool,        // ×1.5
  tie:    bool,        // tied INTO the next note in the same beat
  accent: 'strong'|'medium'|'normal'|'none',
}
```

Transport flags on the store:
- `isPlaying`, `isPaused`, `currentBeat`, `currentSubdivision`, `currentMeasure`, `measureCount`, `elapsedTime`

Key store actions:
- `setBpm(v)` / `adjustBpm(delta)` — **always use `adjustBpm` for +/- buttons** (functional update, no stale closure during slider-drag re-renders)
- `setTimeSignature(beats, noteValue)` — resets `measures` via `defaultMeasure(beats, noteValue)`
- `addSubdivision`, `removeSubdivision`, `updateSubdivision`, `toggleDotted`, `toggleTie`, `setSubdivisionValue`, `setSubdivisionAccent`
- `loadPreset(id)`, `toggleFavorite(id)`, `saveAsPreset(name)`, `exportJson()`
- `setView(view)`, `setSelectedCategory(id)`

## 5. Tick math (`musicTheory.js`)

- `TICKS_PER_QUARTER = 480` (chosen so halving and thirding stay integer)
- `subdivDurationTicks({ value, dotted })` — dotted = `base * 3 / 2`
- `beatCapacityTicks(noteValue)` — one beat = `1920 / noteValue` ticks
- `isBeatFull(beat, nv)` = `remaining === 0`; `isBeatOverflow` = `remaining < 0`
- `validateBeat(beat, nv)` → `{ capacity, used, remaining, carryOver, exact, overflow, percentFilled }`
- `buildPlaybackEntries(subdivs)` → adds `silent:true` to a note whose predecessor has `tie:true`
- `NOTE_SYMBOLS` and `NOTE_SHORT_LABELS` are the string tables used to render notes in the UI

Default note-value per denominator (kept in `metronomeStore.js` as `NOTE_NAME_BY_DENOM`):
`1→whole, 2→half, 4→quarter, 8→eighth, 16→sixteenth, 32→thirty-second`. This is why a fresh 6/8 measure spawns eighth notes (not quarters — quarters would overflow a 240-tick beat).

## 6. Audio engine (`audioEngine.js`)

Singleton exported as `audioEngine`. High-precision lookahead scheduler:

- `LOOKAHEAD_MS = 25`, `SCHEDULE_AHEAD_SECS = 0.1`
- `start(measures, timeSig, bpm, opts)` — **async**. Calls `init()`, then `await _ensureResumed()` (browsers start `AudioContext` suspended until first user gesture). This `await` is **critical**: scheduling before resume uses `currentTime=0`, which silently drops the first clicks. That was the original "first play no sound" bug.
- `pause()` / `resume()` — keeps `pausedAtIndex`; `resume` is also async and awaits context resume.
- `stop()` — resets `scheduleIndex=0`, `pausedAtIndex=null`.
- `updateBpm`, `updateMasterVolume`, `updateAccentVolumes`, `updateSoundSet`, `updateSchedule` — live parameter updates while playing.

Four synth voices: `woodblock` (default), `electronic`, `rimshot`, `beep`. Accent → gain via `_applyAccent` with 5 ms attack / 100 ms exp decay ramp.

## 7. Transport hook (`useMetronome.js`)

States encoded as two booleans in the store:
- `isPlaying=true, isPaused=false` → playing
- `isPlaying=false, isPaused=true` → paused
- `isPlaying=false, isPaused=false` → idle

`play()`:
1. `if (isPlaying) return` (guard)
2. If `isPaused` → `audioEngine.resume()` + restart elapsed timer anchored at `pausedElapsedRef`
3. Otherwise check `isBeatFull(b, nv)` on every beat; if any beat is partial or overflowing, **refuse to start** (issue #3 fix — prevents tempo drift from short beats)
4. Fresh start: `resetPlayback()`, new wall-clock anchor, `audioEngine.start(...)`

`pause()` / `stop()` mirror the engine actions and update store flags.

### Critical unmount behavior
On hook unmount (cleanup effect) we **stop the engine AND reset the store's transport flags**:

```js
useMetronomeStore.setState({ isPlaying: false, isPaused: false, currentBeat: -1, ... })
```

Without this, navigating away stopped the engine but left `isPlaying=true` in the store — the next `play()` hit the guard and did nothing ("need to press reset first" bug). Do not revert this.

## 8. Defaults

```js
DEFAULT_PRESETS = [
  { id: 'preset-4-4', name: 'Standard 4/4', bpm: 120, timeSig: 4/4, sound: woodblock },
  { id: 'preset-6-8', name: 'Compound 6/8', bpm:  96, timeSig: 6/8, sound: woodblock },
]
```

(User explicitly asked to keep only these two. Don't add more without asking.)

Sidebar has **only** a Library section: `My Rhythms / Favorites / Recent`. The old "Categories" group and the odd-meters/funk/polyrhythms items were removed.

Default initial state: BPM 120, 4/4, one measure, `masterVolume=0.8`, accent gains `strong:1.0 / medium:0.65 / normal:0.4 / none:0`, sound set `woodblock`, view `presets`.

## 9. Known pitfalls / non-obvious rules

1. **JSX text does NOT process `\u` escapes.** Writing `<span>\u2322</span>` renders 6 literal characters. Always wrap with a JS expression: `<span>{'\u2322'}</span>`, or put the actual character. This bit the tie symbol (`⌢`) and the tick symbol (`τ`, `\u03C4`) in `SubdivisionEditor.jsx`.
2. **Do not use `animate-ping` on an overlay that sits above interactive UI.** Its 2.25× scale makes the ping expand beyond its `max-w-[320px]` box and intercept clicks on neighbors. The Performance page's BPM +/- buttons broke because of this. The current spinning indicator uses `pointer-events-none` — keep it that way.
3. **Whole-store subscription.** `useMetronomeStore()` with no selector re-renders the component on every state change. During slider drags this means many re-renders per second. Always use `adjustBpm(delta)` (functional setter) for +/-; capturing `bpm` in the closure has a small but real stale-read window.
4. **Auto-stop on unmount.** See §7 — keeps the store / engine in sync across navigations.
5. **AudioContext must be resumed *before* reading `currentTime`.** The engine's `start()` and `resume()` are both `async` and `await _ensureResumed()`. Don't make them sync again.
6. **Play is gated by `isBeatFull` on every beat.** The play button is disabled in both `PlaybackControls` (editor) and `PerformancePage`, and `useMetronome.play` also rejects the transition. A warning ("Fill every beat exactly before playing") is shown in the editor when gated.
7. **The two default presets must spawn valid beats.** That's what `NOTE_NAME_BY_DENOM` and the `noteValue` param on `defaultMeasure` / `defaultBeat` / `defaultSubdivision` exist for. Don't drop those params.
8. **No replay / tap-tempo buttons flanking play.** The user removed them as redundant. Performance only has play + stop. Editor's PlaybackControls has play + stop. `useTapTempo` still exists and is used by `BpmControl`, but not by `PerformancePage`.
9. **Material Symbols font** is loaded in `index.html`; icon names like `music_note`, `grid_4x4`, `layers`, `tune`, `touch_app`, `add`, `remove`, `play_arrow`, `pause`, `stop`, `star`, `history`, `search`, `filter_list` etc. all come from that font.
10. **Everything is dev-mode only.** `npm run dev` — no tests, no build step in the hot loop. Dev server typically runs on `http://localhost:5173/`.

## 10. Skills available in `.cursor/skills/`

Project-specific skills (read them when relevant):
- `audio-timing-engine` — Web Audio lookahead scheduling patterns
- `audio-accent-engine` — gain-node accent application
- `music-theory-engine` — tick-based duration math
- `tick-math-system` — LCM tick choice rationale
- `data-integrity-guard` — keeping rhythm data valid after mutation
- `rhythm-constraint-solver` — beat-input validation / remaining-ticks UI
- `music-notation-renderer` — rendering note symbols visually
- `transport-state-machine` — idle/playing/paused pattern (the hook follows this)

## 11. Change history so far (user-requested fixes)

Short log of what's been changed and why, so new sessions don't re-litigate:

1. Defaults reduced to 4/4 and 6/8 only.
2. Sidebar: Categories removed, My Rhythms moved into Library.
3. Performance page `animate-ping` removed (it was covering +/- buttons).
4. `adjustBpm(delta)` added; all +/- buttons use it to dodge slider-drag stale closures.
5. Redundant `replay` and `tap` buttons flanking play were removed.
6. `AudioEngine.start()` / `resume()` made `async` + `await _ensureResumed()` (fixed the "first click no sound" bug).
7. `useMetronome` cleanup resets store transport flags on unmount (fixed "no sound after navigating away then back" bug).
8. `defaultSubdivision` / `defaultBeat` / `defaultMeasure` accept `noteValue` so 6/8 spawns eighth notes, not overflowing quarters.
9. Play is gated by "every beat exactly full" in both pages and in the hook.
10. JSX `\u2322` / `\u03C4` text occurrences wrapped in `{'...'}` so they render as real Unicode.

## 12. Fast orientation prompts for a new chat

If the next session asks a typical question, here's where to look first:

| Question | File |
|---|---|
| "Why doesn't play fire?" | `useMetronome.js` (isBeatFull gate + isPlaying guard) |
| "How is the click scheduled?" | `audioEngine.js::_schedule` |
| "Where are ticks defined?" | `musicTheory.js::BASE_DURATIONS_TICKS` |
| "How does resume vs start differ?" | `audioEngine.js::start / resume / pause / stop` |
| "Where is the rhythm state?" | `store/metronomeStore.js` |
| "How does a preset load a measure?" | `metronomeStore.js::loadPreset` + `defaultMeasure` |
| "How do I add a view?" | Add a case in `App.jsx` and a `setView` call somewhere |
| "How do I change the accent colors?" | `SubdivisionEditor.jsx::ACCENT_CONFIG` + `SequenceGrid.jsx::ACCENT_GRID_COLORS` |
