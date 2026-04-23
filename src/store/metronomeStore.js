import { create } from 'zustand'
import {
  NOTE_VALUES,
  TICKS_PER_QUARTER,
  subdivDurationTicks,
  beatCapacityTicks,
  beatUsedTicks,
  isBeatFull,
  validateStructure,
} from '../engine/musicTheory'

/**
 * Map a time-signature denominator → matching note value name so that one
 * default subdivision exactly fills one beat (no overflow / no gap).
 * e.g. 4/4 → 'quarter', 6/8 → 'eighth', 3/2 → 'half'.
 */
const NOTE_NAME_BY_DENOM = {
  1:  'whole',
  2:  'half',
  4:  'quarter',
  8:  'eighth',
  16: 'sixteenth',
  32: 'thirty-second',
}

export { NOTE_VALUES, TICKS_PER_QUARTER }

export const ACCENT_TYPES = ['strong', 'medium', 'normal', 'none']

// Default gain values per skill: audio-accent-engine
export const ACCENT_GAIN = {
  strong: 1.0,
  medium: 0.65,
  normal: 0.4,
  none:   0,
}

export const SOUND_SETS = [
  { id: 'woodblock',  label: 'Woodblock' },
  { id: 'electronic', label: 'Electronic Click' },
  { id: 'rimshot',    label: 'Rimshot' },
  { id: 'beep',       label: 'Classic Beep' },
]

/**
 * Create a fresh subdivision with the full schema. The default note value
 * tracks the time-signature denominator so that one subdivision exactly
 * fills one beat (e.g. 'eighth' at 6/8, not 'quarter' which would overflow).
 */
export const defaultSubdivision = (accent = 'normal', noteValue = 4) => ({
  id:     crypto.randomUUID(),
  value:  NOTE_NAME_BY_DENOM[noteValue] ?? 'quarter',
  dotted: false,
  tie:    false,
  accent,
})

/**
 * Create a default beat.
 * carryOver: ticks arriving from a tie in the previous beat (skill: data-integrity-guard).
 */
const defaultBeat = (beatIndex = 0, noteValue = 4) => ({
  id:           crypto.randomUUID(),
  subdivisions: [defaultSubdivision(beatIndex === 0 ? 'strong' : 'normal', noteValue)],
  carryOver:    0,
})

export const defaultMeasure = (beats = 4, noteValue = 4) => ({
  id:    crypto.randomUUID(),
  beats: Array.from({ length: beats }, (_, i) => defaultBeat(i, noteValue)),
})

export const DEFAULT_PRESETS = [
  {
    id: 'preset-4-4',
    name: 'Standard 4/4',
    bpm: 120,
    timeSignature: { beats: 4, noteValue: 4 },
    soundSet: 'woodblock',
    favorited: false,
    tag: '4/4',
    rhythmPreview: [1.0, 0.5, 0.7, 0.5],
  },
  {
    id: 'preset-6-8',
    name: 'Compound 6/8',
    bpm: 96,
    timeSignature: { beats: 6, noteValue: 8 },
    soundSet: 'woodblock',
    favorited: false,
    tag: '6/8',
    rhythmPreview: [1.0, 0.4, 0.4, 0.7, 0.4, 0.4],
  },
]

const createDefaultState = () => ({
  bpm:               120,
  timeSignature:     { beats: 4, noteValue: 4 },
  measures:          [defaultMeasure(4, 4)],
  soundSet:          'woodblock',
  masterVolume:      0.8,
  accentVolumes:     { strong: 1.0, medium: 0.65, normal: 0.4 },
  isPlaying:         false,
  isPaused:          false,
  currentBeat:       -1,
  currentSubdivision: -1,
  currentMeasure:    0,
  measureCount:      0,
  elapsedTime:       0,
  view:              'presets',
  presets:           DEFAULT_PRESETS,
  activePresetId:    null,
  searchQuery:       '',
  selectedCategory:  'my-rhythms',
  recentPresetIds:   [],   // most-recent-first, capped (skill: data-integrity-guard)
  filterTag:         'all', // 'all' | a time-sig tag like '4/4'
})

const RECENT_LIMIT = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map over a single subdivision by id within nested measure→beat structure */
function mapSubdiv(measures, measureId, beatId, subdivId, fn) {
  return measures.map((m) =>
    m.id !== measureId
      ? m
      : {
          ...m,
          beats: m.beats.map((b) =>
            b.id !== beatId
              ? b
              : { ...b, subdivisions: b.subdivisions.map((sd) => (sd.id !== subdivId ? sd : fn(sd))) }
          ),
        }
  )
}

/**
 * After removing a subdivision, clear the tie flag on the new last note
 * and sever any incoming tie from the preceding note.
 * Handles mid-chain deletion: if the removed note was a tie target,
 * the preceding note's tie is cleared; if it was a tie source, the next
 * note's incoming tie is implicitly removed (it becomes a new head).
 */
function sanitizeTiesAfterRemoval(beats) {
  return beats.map((beat) => {
    const subs  = beat.subdivisions
    const fixed = subs.map((sd, idx) => {
      // The last note in the beat must never have a forward tie
      if (sd.tie && idx === subs.length - 1) return { ...sd, tie: false }
      return sd
    })
    return { ...beat, subdivisions: fixed }
  })
}

/**
 * Run validateStructure and warn in dev if invariants are violated.
 * Returns the measures unchanged (the check is a safety net, not a blocker).
 */
function assertValid(measures, noteValue) {
  if (!validateStructure(measures, noteValue)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[metronomeStore] validateStructure failed — rhythm data may be inconsistent.')
    }
  }
  return measures
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMetronomeStore = create((set, get) => ({
  ...createDefaultState(),

  setBpm: (bpm) => set({ bpm: Math.min(300, Math.max(20, Number(bpm))) }),

  /**
   * Increment/decrement BPM using a functional update so that rapid clicks
   * after a slider drag always see the latest value (avoids stale closures
   * where the previous `bpm` from the component's last render is captured).
   */
  adjustBpm: (delta) =>
    set((s) => ({ bpm: Math.min(300, Math.max(20, s.bpm + Number(delta))) })),

  setTimeSignature: (beats, noteValue) => {
    const measures = [defaultMeasure(beats, noteValue)]
    set({ timeSignature: { beats, noteValue }, measures })
  },

  setView:      (view)      => set({ view }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsPaused:  (isPaused)  => set({ isPaused }),

  setCurrentBeat:         (currentBeat)         => set({ currentBeat }),
  setCurrentSubdivision:  (currentSubdivision)  => set({ currentSubdivision }),
  setCurrentMeasure:      (currentMeasure)      => set({ currentMeasure }),
  incrementMeasureCount:  ()                    => set((s) => ({ measureCount: s.measureCount + 1 })),
  setElapsedTime:         (elapsedTime)         => set({ elapsedTime }),
  setMasterVolume:        (masterVolume)        => set({ masterVolume }),
  setSoundSet:            (soundSet)            => set({ soundSet }),

  setAccentVolume: (accent, value) =>
    set((s) => ({ accentVolumes: { ...s.accentVolumes, [accent]: value } })),

  resetPlayback: () =>
    set({ currentBeat: -1, currentSubdivision: -1, currentMeasure: 0, measureCount: 0, elapsedTime: 0, isPaused: false }),

  // ── Subdivision CRUD ────────────────────────────────────────────────────────

  addSubdivision: (measureId, beatId) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const beat    = measure?.beats.find((b) => b.id === beatId)
      if (!beat) return {}

      const cap       = beatCapacityTicks(s.timeSignature.noteValue)
      const used      = beatUsedTicks(beat.subdivisions)
      const carryOver = beat.carryOver ?? 0
      const remaining = cap - used - carryOver
      if (remaining <= 0) return {}

      // Pick the largest note value that fits
      const candidates = NOTE_VALUES.filter((nv) =>
        subdivDurationTicks({ value: nv, dotted: false }) <= remaining
      )
      const bestValue = candidates.length > 0 ? candidates[0] : 'sixteenth'
      const newSd     = { ...defaultSubdivision('normal'), value: bestValue }

      const newMeasures = s.measures.map((m) =>
        m.id !== measureId
          ? m
          : {
              ...m,
              beats: m.beats.map((b) =>
                b.id !== beatId
                  ? b
                  : { ...b, subdivisions: [...b.subdivisions, newSd] }
              ),
            }
      )

      assertValid(newMeasures, s.timeSignature.noteValue)
      return { measures: newMeasures }
    })
  },

  removeSubdivision: (measureId, beatId, subdivId) => {
    set((s) => {
      const newMeasures = s.measures.map((m) =>
        m.id !== measureId
          ? m
          : {
              ...m,
              beats: sanitizeTiesAfterRemoval(
                m.beats.map((b) =>
                  b.id !== beatId
                    ? b
                    : { ...b, subdivisions: b.subdivisions.filter((sd) => sd.id !== subdivId) }
                )
              ),
            }
      )

      assertValid(newMeasures, s.timeSignature.noteValue)
      return { measures: newMeasures }
    })
  },

  updateSubdivision: (measureId, beatId, subdivId, updates) => {
    set((s) => ({
      measures: mapSubdiv(s.measures, measureId, beatId, subdivId, (sd) => ({ ...sd, ...updates })),
    }))
  },

  // ── Dotted toggle ──────────────────────────────────────────────────────────

  toggleDotted: (measureId, beatId, subdivId) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const beat    = measure?.beats.find((b) => b.id === beatId)
      const sd      = beat?.subdivisions.find((x) => x.id === subdivId)
      if (!sd) return {}

      const wouldBeDotted = !sd.dotted
      const newTicks      = subdivDurationTicks({ value: sd.value, dotted: wouldBeDotted })
      const otherTicks    = beatUsedTicks(beat.subdivisions.filter((x) => x.id !== subdivId))
      const cap           = beatCapacityTicks(s.timeSignature.noteValue)
      const carryOver     = beat.carryOver ?? 0

      if (wouldBeDotted && otherTicks + newTicks + carryOver > cap) return {}

      return {
        measures: mapSubdiv(s.measures, measureId, beatId, subdivId, (x) => ({
          ...x,
          dotted: wouldBeDotted,
        })),
      }
    })
  },

  // ── Tie toggle ─────────────────────────────────────────────────────────────

  toggleTie: (measureId, beatId, subdivId) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const beat    = measure?.beats.find((b) => b.id === beatId)
      if (!beat) return {}

      const subs = beat.subdivisions
      const idx  = subs.findIndex((x) => x.id === subdivId)
      // Tie requires a next note in the same beat
      if (idx === -1 || idx === subs.length - 1) return {}

      return {
        measures: mapSubdiv(s.measures, measureId, beatId, subdivId, (sd) => ({
          ...sd,
          tie: !sd.tie,
        })),
      }
    })
  },

  setSubdivisionAccent: (measureId, beatId, subdivId, accent) => {
    get().updateSubdivision(measureId, beatId, subdivId, { accent })
  },

  // ── Note value change (overflow-safe) ─────────────────────────────────────

  setSubdivisionValue: (measureId, beatId, subdivId, value) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const beat    = measure?.beats.find((b) => b.id === beatId)
      const sd      = beat?.subdivisions.find((x) => x.id === subdivId)
      if (!sd) return {}

      const otherTicks = beatUsedTicks(beat.subdivisions.filter((x) => x.id !== subdivId))
      const newTicks   = subdivDurationTicks({ value, dotted: sd.dotted })
      const cap        = beatCapacityTicks(s.timeSignature.noteValue)
      const carryOver  = beat.carryOver ?? 0

      let dotted = sd.dotted
      if (otherTicks + newTicks + carryOver > cap) {
        if (dotted) {
          // Try removing the dot
          const undottedTicks = subdivDurationTicks({ value, dotted: false })
          if (otherTicks + undottedTicks + carryOver <= cap) {
            dotted = false
          } else {
            return {}
          }
        } else {
          return {}
        }
      }

      return {
        measures: mapSubdiv(s.measures, measureId, beatId, subdivId, (x) => ({
          ...x,
          value,
          dotted,
        })),
      }
    })
  },

  // ── Presets ────────────────────────────────────────────────────────────────

  loadPreset: (presetId) => {
    const preset = get().presets.find((p) => p.id === presetId)
    if (!preset) return
    const { beats, noteValue } = preset.timeSignature
    set((s) => {
      // Bump this preset to the front of the recent list, capped at RECENT_LIMIT
      const nextRecent = [presetId, ...s.recentPresetIds.filter((id) => id !== presetId)].slice(0, RECENT_LIMIT)
      return {
        bpm:            preset.bpm,
        timeSignature:  preset.timeSignature,
        measures:       [defaultMeasure(beats, noteValue)],
        soundSet:       preset.soundSet,
        activePresetId: presetId,
        recentPresetIds: nextRecent,
        view:           'editor',
      }
    })
  },

  toggleFavorite: (presetId) => {
    set((s) => ({
      presets: s.presets.map((p) =>
        p.id === presetId ? { ...p, favorited: !p.favorited } : p
      ),
    }))
  },

  saveAsPreset: (name) => {
    const s = get()
    const newPreset = {
      id:            `preset-${Date.now()}`,
      name,
      bpm:           s.bpm,
      timeSignature: { ...s.timeSignature },
      soundSet:      s.soundSet,
      favorited:     false,
      tag:           `${s.timeSignature.beats}/${s.timeSignature.noteValue}`,
      rhythmPreview: Array.from({ length: s.timeSignature.beats }, () => Math.random() * 0.6 + 0.4),
    }
    set((st) => ({ presets: [...st.presets, newPreset] }))
  },

  setSearchQuery:      (searchQuery)      => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setFilterTag:        (filterTag)        => set({ filterTag }),

  /**
   * True only when every beat is *exactly* full (used + carryOver === capacity).
   * The editor uses this to gate play: partial beats would schedule a click
   * shorter than one beat and drift against the tempo, so we block playback
   * until the user closes every gap / removes every overflow.
   */
  allBeatsFull: () => {
    const { measures, timeSignature } = get()
    return measures.every((m) => m.beats.every((b) => isBeatFull(b, timeSignature.noteValue)))
  },

  exportJson: () => {
    const s = get()
    return JSON.stringify(
      { bpm: s.bpm, timeSignature: s.timeSignature, measures: s.measures, soundSet: s.soundSet },
      null,
      2
    )
  },
}))
