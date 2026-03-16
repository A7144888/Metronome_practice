import { create } from 'zustand'
import { NOTE_VALUES, subdivDurationQNB, beatCapacityQNB, beatUsedQNB, roundQNB } from '../engine/musicTheory'

export { NOTE_VALUES }

export const ACCENT_TYPES = ['strong', 'medium', 'normal', 'none']

export const ACCENT_GAIN = {
  strong: 1.0,
  medium: 0.7,
  normal: 0.45,
  none: 0,
}

export const SOUND_SETS = [
  { id: 'woodblock', label: 'Woodblock' },
  { id: 'electronic', label: 'Electronic Click' },
  { id: 'rimshot', label: 'Rimshot' },
  { id: 'beep', label: 'Classic Beep' },
]

/** Create a fresh subdivision with the full schema */
export const defaultSubdivision = (accent = 'normal') => ({
  id: crypto.randomUUID(),
  value: 'quarter',   // note value key
  dotted: false,      // dotted toggle
  tie: false,         // tie to next note
  accent,
})

const defaultBeat = (beatIndex = 0) => ({
  id: crypto.randomUUID(),
  subdivisions: [defaultSubdivision(beatIndex === 0 ? 'strong' : 'normal')],
})

export const defaultMeasure = (beats = 4) => ({
  id: crypto.randomUUID(),
  beats: Array.from({ length: beats }, (_, i) => defaultBeat(i)),
})

export const DEFAULT_PRESETS = [
  {
    id: 'preset-1',
    name: '7/8 Balkan Groove',
    bpm: 120,
    timeSignature: { beats: 7, noteValue: 8 },
    soundSet: 'woodblock',
    favorited: false,
    tag: 'Compound Meter',
    rhythmPreview: [0.6, 0.2, 0.5, 0.2, 0.4, 0.2, 1.0],
  },
  {
    id: 'preset-2',
    name: 'Neo-Soul Swing',
    bpm: 92,
    timeSignature: { beats: 4, noteValue: 4 },
    soundSet: 'rimshot',
    favorited: true,
    tag: '4/4 Swing',
    rhythmPreview: [1.0, 0.05, 0.5, 0.25, 0.9, 0.05, 0.5, 0.25],
  },
  {
    id: 'preset-3',
    name: 'Prog Polyrhythm 3:4',
    bpm: 144,
    timeSignature: { beats: 4, noteValue: 4 },
    soundSet: 'electronic',
    favorited: false,
    tag: 'Cross Rhythm',
    rhythmPreview: [1.0, 1.0, 1.0],
  },
  {
    id: 'preset-4',
    name: 'Double Kick Speed',
    bpm: 185,
    timeSignature: { beats: 4, noteValue: 4 },
    soundSet: 'electronic',
    favorited: false,
    tag: '4/4 Straight',
    rhythmPreview: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
  },
]

const createDefaultState = () => ({
  bpm: 120,
  timeSignature: { beats: 4, noteValue: 4 },
  measures: [defaultMeasure(4)],
  soundSet: 'woodblock',
  masterVolume: 0.8,
  accentVolumes: { strong: 1.0, medium: 0.7, normal: 0.45 },
  isPlaying: false,
  currentBeat: -1,
  currentSubdivision: -1,
  currentMeasure: 0,
  measureCount: 0,
  elapsedTime: 0,
  countIn: false,
  view: 'presets',
  presets: DEFAULT_PRESETS,
  activePresetId: null,
  searchQuery: '',
  selectedCategory: 'my-rhythms',
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map over a subdivision within nested measure→beat structure */
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

/** Map over all subdivisions of one beat */
function mapBeatSubdivs(measures, measureId, beatId, fn) {
  return measures.map((m) =>
    m.id !== measureId
      ? m
      : {
          ...m,
          beats: m.beats.map((b) =>
            b.id !== beatId ? b : { ...b, subdivisions: b.subdivisions.map(fn) }
          ),
        }
  )
}

/**
 * After removing a subdivision, clear tie on the new last note
 * and fix any tie that now points to nothing.
 */
function sanitizeTiesAfterRemoval(beats) {
  return beats.map((beat) => {
    const subs = beat.subdivisions
    const fixed = subs.map((sd, idx) => {
      if (sd.tie && idx === subs.length - 1) return { ...sd, tie: false }
      return sd
    })
    return { ...beat, subdivisions: fixed }
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMetronomeStore = create((set, get) => ({
  ...createDefaultState(),

  setBpm: (bpm) => set({ bpm: Math.min(300, Math.max(20, Number(bpm))) }),

  setTimeSignature: (beats, noteValue) => {
    const measures = [defaultMeasure(beats)]
    set({ timeSignature: { beats, noteValue }, measures })
  },

  setView: (view) => set({ view }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setCurrentSubdivision: (currentSubdivision) => set({ currentSubdivision }),
  setCurrentMeasure: (currentMeasure) => set({ currentMeasure }),
  incrementMeasureCount: () => set((s) => ({ measureCount: s.measureCount + 1 })),
  setElapsedTime: (elapsedTime) => set({ elapsedTime }),
  setMasterVolume: (masterVolume) => set({ masterVolume }),
  setSoundSet: (soundSet) => set({ soundSet }),
  setAccentVolume: (accent, value) =>
    set((s) => ({ accentVolumes: { ...s.accentVolumes, [accent]: value } })),
  resetPlayback: () =>
    set({ currentBeat: -1, currentSubdivision: -1, currentMeasure: 0, measureCount: 0, elapsedTime: 0 }),

  // ── Subdivision CRUD ──────────────────────────────────────────────────────

  addSubdivision: (measureId, beatId) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const beat = measure?.beats.find((b) => b.id === beatId)
      if (!beat) return {}

      // Check how much space remains
      const cap = beatCapacityQNB(s.timeSignature.noteValue)
      const used = beatUsedQNB(beat.subdivisions)
      const remaining = roundQNB(cap - used)
      if (remaining <= 0) return {}

      // Pick the largest note value that fits
      const candidates = NOTE_VALUES.filter((nv) => {
        const dur = subdivDurationQNB({ value: nv, dotted: false })
        return dur <= remaining + 1 / 128
      })
      const bestValue = candidates.length > 0 ? candidates[0] : 'sixteenth'
      const newSd = { ...defaultSubdivision('none'), value: bestValue }

      return {
        measures: s.measures.map((m) =>
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
        ),
      }
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
      const beat = measure?.beats.find((b) => b.id === beatId)
      const sd = beat?.subdivisions.find((x) => x.id === subdivId)
      if (!sd) return {}

      const wouldBeDotted = !sd.dotted
      const newDur = subdivDurationQNB({ value: sd.value, dotted: wouldBeDotted })
      const otherDur = beatUsedQNB(beat.subdivisions.filter((x) => x.id !== subdivId))
      const cap = beatCapacityQNB(s.timeSignature.noteValue)

      // Block if dotting would overflow
      if (wouldBeDotted && roundQNB(otherDur + newDur) > cap + 1 / 128) return {}

      return {
        measures: mapSubdiv(s.measures, measureId, beatId, subdivId, (x) => ({
          ...x,
          dotted: wouldBeDotted,
        })),
      }
    })
  },

  // ── Tie toggle ──────────────────────────────────────────────────────────────

  toggleTie: (measureId, beatId, subdivId) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const beat = measure?.beats.find((b) => b.id === beatId)
      if (!beat) return {}

      const subs = beat.subdivisions
      const idx = subs.findIndex((x) => x.id === subdivId)
      // Tie is only valid if there is a next note
      if (idx === subs.length - 1 || idx === -1) return {}

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

  // ── Note value change (with overflow guard) ───────────────────────────────

  setSubdivisionValue: (measureId, beatId, subdivId, value) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const beat = measure?.beats.find((b) => b.id === beatId)
      const sd = beat?.subdivisions.find((x) => x.id === subdivId)
      if (!sd) return {}

      const otherDur = beatUsedQNB(beat.subdivisions.filter((x) => x.id !== subdivId))
      const newDur = subdivDurationQNB({ value, dotted: sd.dotted })
      const cap = beatCapacityQNB(s.timeSignature.noteValue)

      // Auto-remove dot if the dotted new value would overflow
      let dotted = sd.dotted
      if (roundQNB(otherDur + newDur) > cap + 1 / 128 && dotted) {
        const undottedDur = subdivDurationQNB({ value, dotted: false })
        if (roundQNB(otherDur + undottedDur) <= cap + 1 / 128) {
          dotted = false
        } else {
          return {} // completely blocked
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

  // ── Presets ───────────────────────────────────────────────────────────────

  loadPreset: (presetId) => {
    const preset = get().presets.find((p) => p.id === presetId)
    if (!preset) return
    const { beats } = preset.timeSignature
    set({
      bpm: preset.bpm,
      timeSignature: preset.timeSignature,
      measures: [defaultMeasure(beats)],
      soundSet: preset.soundSet,
      activePresetId: presetId,
      view: 'editor',
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
      id: `preset-${Date.now()}`,
      name,
      bpm: s.bpm,
      timeSignature: { ...s.timeSignature },
      soundSet: s.soundSet,
      favorited: false,
      tag: `${s.timeSignature.beats}/${s.timeSignature.noteValue}`,
      rhythmPreview: Array.from({ length: s.timeSignature.beats }, () => Math.random() * 0.6 + 0.4),
    }
    set((st) => ({ presets: [...st.presets, newPreset] }))
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  exportJson: () => {
    const s = get()
    return JSON.stringify(
      { bpm: s.bpm, timeSignature: s.timeSignature, measures: s.measures, soundSet: s.soundSet },
      null,
      2
    )
  },
}))
