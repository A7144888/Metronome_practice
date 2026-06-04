import { create } from 'zustand'
import {
  NOTE_VALUES,
  TICKS_PER_QUARTER,
  subdivDurationTicks,
  beatCapacityTicks,
  measureCapacityTicks,
  measureUsedTicks,
  isMeasureFull,
  validateStructure,
  hasBinaryTernaryConflictAtTick,
  hasBinaryTernaryConflictForNote,
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

export const ACCENT_GAIN = {
  strong: 1.0,
  medium: 0.85,
  normal: 0.7,
  none:   0,
}

export const SOUND_SETS = [
  { id: 'woodblock',  label: 'Woodblock' },
  { id: 'electronic', label: 'Electronic Click' },
  { id: 'rimshot',    label: 'Rimshot' },
  { id: 'beep',       label: 'Classic Beep' },
]

/**
 * Create a fresh subdivision. The default note value tracks the time-signature
 * denominator so that one subdivision exactly fills one beat.
 */
export const defaultSubdivision = (accent = 'normal', noteValue = 4) => ({
  id:     crypto.randomUUID(),
  value:  NOTE_NAME_BY_DENOM[noteValue] ?? 'quarter',
  dotted: false,
  tie:    false,
  accent,
})

/**
 * Create a default measure with one subdivision per beat.
 * Subdivisions are stored flat at the measure level — notes can span beats.
 */
export const defaultMeasure = (beats = 4, noteValue = 4) => ({
  id:           crypto.randomUUID(),
  subdivisions: Array.from({ length: beats }, (_, i) =>
    defaultSubdivision(i === 0 ? 'strong' : 'normal', noteValue)
  ),
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
  accentVolumes:     { strong: 1.0, medium: 0.85, normal: 0.7 },
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
  recentPresetIds:   [],
  filterTag:         'all',
})

const RECENT_LIMIT = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cloneMeasures = (measures) => JSON.parse(JSON.stringify(measures))

const ACCENT_PREVIEW_HEIGHT = { strong: 1.0, medium: 0.7, normal: 0.5, none: 0.2 }

/**
 * Derive a small bar-height array (one bar per beat) from the first measure's
 * subdivisions. Each beat's height is set by the first note starting in that beat.
 */
const buildPreview = (measures, timeSignature) => {
  const first = measures[0]
  if (!first || !first.subdivisions?.length) return [0.5]

  const beatCap = beatCapacityTicks(timeSignature.noteValue)
  const bars    = []
  let tickPos   = 0
  let curBeat   = -1

  first.subdivisions.forEach((sd) => {
    const beatIdx = Math.floor(tickPos / beatCap)
    if (beatIdx !== curBeat) {
      bars.push(ACCENT_PREVIEW_HEIGHT[sd.accent] ?? 0.5)
      curBeat = beatIdx
    }
    tickPos += subdivDurationTicks(sd)
  })

  while (bars.length < timeSignature.beats) bars.push(0.3)
  return bars
}

/** Map over a single subdivision by id within the flat measure structure. */
function mapSubdiv(measures, measureId, subdivId, fn) {
  return measures.map((m) =>
    m.id !== measureId
      ? m
      : { ...m, subdivisions: m.subdivisions.map((sd) => (sd.id !== subdivId ? sd : fn(sd))) }
  )
}

/**
 * After removing a subdivision, clear the tie flag on the new last note.
 */
function sanitizeTiesAfterRemoval(subdivisions) {
  return subdivisions.map((sd, idx) => {
    if (sd.tie && idx === subdivisions.length - 1) return { ...sd, tie: false }
    return sd
  })
}

/**
 * Migrate measures from old beat-nested format to flat subdivisions format.
 * Old: measure.beats[].subdivisions[]  →  New: measure.subdivisions[]
 */
function migrateMeasures(measures) {
  if (!measures || measures.length === 0) return measures
  if (measures[0].subdivisions && !measures[0].beats) return measures
  return measures.map((m) => ({
    id:           m.id ?? crypto.randomUUID(),
    subdivisions: m.beats
      ? m.beats.flatMap((b) => b.subdivisions ?? [])
      : m.subdivisions ?? [],
  }))
}

function assertValid(measures, beats, noteValue) {
  if (!validateStructure(measures, beats, noteValue)) {
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

  addSubdivision: (measureId) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      if (!measure) return {}

      const { beats, noteValue } = s.timeSignature
      const cap       = measureCapacityTicks(beats, noteValue)
      const used      = measureUsedTicks(measure.subdivisions)
      const remaining = cap - used
      if (remaining <= 0) return {}

      const candidates = NOTE_VALUES.filter((nv) => {
        const dur = subdivDurationTicks({ value: nv, dotted: false })
        if (dur > remaining) return false
        if (hasBinaryTernaryConflictAtTick(measure, used, nv, noteValue, dur)) return false
        return true
      })
      if (candidates.length === 0) return {}
      const bestValue = candidates[0]
      const newSd     = { ...defaultSubdivision('normal'), value: bestValue }

      const newMeasures = s.measures.map((m) =>
        m.id !== measureId
          ? m
          : { ...m, subdivisions: [...m.subdivisions, newSd] }
      )

      assertValid(newMeasures, beats, noteValue)
      return { measures: newMeasures }
    })
  },

  removeSubdivision: (measureId, subdivId) => {
    set((s) => {
      const newMeasures = s.measures.map((m) =>
        m.id !== measureId
          ? m
          : { ...m, subdivisions: sanitizeTiesAfterRemoval(m.subdivisions.filter((sd) => sd.id !== subdivId)) }
      )

      assertValid(newMeasures, s.timeSignature.beats, s.timeSignature.noteValue)
      return { measures: newMeasures }
    })
  },

  updateSubdivision: (measureId, subdivId, updates) => {
    set((s) => ({
      measures: mapSubdiv(s.measures, measureId, subdivId, (sd) => ({ ...sd, ...updates })),
    }))
  },

  // ── Dotted toggle ──────────────────────────────────────────────────────────

  toggleDotted: (measureId, subdivId) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const sd      = measure?.subdivisions.find((x) => x.id === subdivId)
      if (!sd) return {}

      if (sd.value === 'triplet') return {}

      const wouldBeDotted = !sd.dotted
      const newTicks      = subdivDurationTicks({ value: sd.value, dotted: wouldBeDotted })
      const otherTicks    = measureUsedTicks(measure.subdivisions.filter((x) => x.id !== subdivId))
      const { beats, noteValue } = s.timeSignature
      const cap           = measureCapacityTicks(beats, noteValue)

      if (wouldBeDotted && otherTicks + newTicks > cap) return {}

      return {
        measures: mapSubdiv(s.measures, measureId, subdivId, (x) => ({
          ...x,
          dotted: wouldBeDotted,
        })),
      }
    })
  },

  // ── Tie toggle ─────────────────────────────────────────────────────────────

  toggleTie: (measureId, subdivId) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      if (!measure) return {}

      const subs = measure.subdivisions
      const idx  = subs.findIndex((x) => x.id === subdivId)
      if (idx === -1 || idx === subs.length - 1) return {}

      return {
        measures: mapSubdiv(s.measures, measureId, subdivId, (sd) => ({
          ...sd,
          tie: !sd.tie,
        })),
      }
    })
  },

  setSubdivisionAccent: (measureId, subdivId, accent) => {
    get().updateSubdivision(measureId, subdivId, { accent })
  },

  // ── Note value change (overflow-safe) ─────────────────────────────────────

  setSubdivisionValue: (measureId, subdivId, value) => {
    set((s) => {
      const measure = s.measures.find((m) => m.id === measureId)
      const sd      = measure?.subdivisions.find((x) => x.id === subdivId)
      if (!sd || !measure) return {}

      const { beats, noteValue } = s.timeSignature

      if (hasBinaryTernaryConflictForNote(measure, subdivId, value, noteValue)) return {}

      let dotted = sd.dotted
      if (value === 'triplet') dotted = false

      const otherSubs  = measure.subdivisions.filter((x) => x.id !== subdivId)
      const otherTicks = measureUsedTicks(otherSubs)
      const newTicks   = subdivDurationTicks({ value, dotted })
      const cap        = measureCapacityTicks(beats, noteValue)

      if (otherTicks + newTicks > cap) {
        if (dotted) {
          const undottedTicks = subdivDurationTicks({ value, dotted: false })
          if (otherTicks + undottedTicks <= cap) {
            dotted = false
          } else {
            return {}
          }
        } else {
          return {}
        }
      }

      return {
        measures: mapSubdiv(s.measures, measureId, subdivId, (x) => ({
          ...x,
          value,
          dotted,
        })),
      }
    })
  },

  // ── Presets ────────────────────────────────────────────────────────────────

  loadPreset: (presetId, opts = {}) => {
    const preset = get().presets.find((p) => p.id === presetId)
    if (!preset) return
    const { beats, noteValue } = preset.timeSignature
    set((s) => {
      const nextRecent = [presetId, ...s.recentPresetIds.filter((id) => id !== presetId)].slice(0, RECENT_LIMIT)
      const measures = preset.measures
        ? migrateMeasures(cloneMeasures(preset.measures))
        : [defaultMeasure(beats, noteValue)]
      return {
        bpm:            preset.bpm,
        timeSignature:  preset.timeSignature,
        measures,
        soundSet:       preset.soundSet,
        activePresetId: presetId,
        recentPresetIds: nextRecent,
        view:           opts.view ?? 'editor',
      }
    })
  },

  deletePreset: (presetId) => {
    set((s) => ({
      presets:         s.presets.filter((p) => p.id !== presetId),
      recentPresetIds: s.recentPresetIds.filter((id) => id !== presetId),
      activePresetId:  s.activePresetId === presetId ? null : s.activePresetId,
    }))
  },

  renamePreset: (presetId, newName) => {
    if (!newName?.trim()) return
    set((s) => ({
      presets: s.presets.map((p) =>
        p.id === presetId ? { ...p, name: newName.trim() } : p
      ),
    }))
  },

  newPreset: () => {
    set({
      bpm:            120,
      timeSignature:  { beats: 4, noteValue: 4 },
      measures:       [defaultMeasure(4, 4)],
      soundSet:       'woodblock',
      masterVolume:   0.8,
      accentVolumes:  { strong: 1.0, medium: 0.85, normal: 0.7 },
      activePresetId: null,
    })
  },

  updateActivePreset: () => {
    const s = get()
    if (!s.activePresetId) return false
    if (!s.presets.some((p) => p.id === s.activePresetId)) return false
    set((st) => ({
      presets: st.presets.map((p) =>
        p.id !== st.activePresetId
          ? p
          : {
              ...p,
              bpm:           st.bpm,
              timeSignature: { ...st.timeSignature },
              measures:      cloneMeasures(st.measures),
              soundSet:      st.soundSet,
              tag:           `${st.timeSignature.beats}/${st.timeSignature.noteValue}`,
              rhythmPreview: buildPreview(st.measures, st.timeSignature),
            }
      ),
    }))
    return true
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
      measures:      cloneMeasures(s.measures),
      soundSet:      s.soundSet,
      favorited:     false,
      tag:           `${s.timeSignature.beats}/${s.timeSignature.noteValue}`,
      rhythmPreview: buildPreview(s.measures, s.timeSignature),
    }
    set((st) => ({
      presets:        [...st.presets, newPreset],
      activePresetId: newPreset.id,
    }))
  },

  setSearchQuery:      (searchQuery)      => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setFilterTag:        (filterTag)        => set({ filterTag }),

  /**
   * True only when every measure is exactly full.
   * The editor uses this to gate play: partial measures would schedule clicks
   * that drift against the tempo, so we block playback until every gap is closed.
   */
  allMeasuresFull: () => {
    const { measures, timeSignature } = get()
    return measures.every((m) => isMeasureFull(m, timeSignature.beats, timeSignature.noteValue))
  },

  exportJson: () => {
    const s = get()
    return JSON.stringify(
      { bpm: s.bpm, timeSignature: s.timeSignature, measures: s.measures, soundSet: s.soundSet },
      null,
      2
    )
  },

  importJson: (jsonString) => {
    let data
    try {
      data = JSON.parse(jsonString)
    } catch {
      return { ok: false, error: 'Invalid JSON format.' }
    }

    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'File does not contain a valid object.' }
    }

    const { bpm, timeSignature, measures, soundSet } = data

    if (typeof bpm !== 'number' || bpm < 20 || bpm > 300) {
      return { ok: false, error: 'Invalid or missing BPM (must be 20–300).' }
    }

    if (
      !timeSignature ||
      typeof timeSignature.beats !== 'number' || timeSignature.beats < 1 ||
      typeof timeSignature.noteValue !== 'number' || ![1,2,4,8,16,32].includes(timeSignature.noteValue)
    ) {
      return { ok: false, error: 'Invalid or missing time signature.' }
    }

    if (!Array.isArray(measures) || measures.length === 0) {
      return { ok: false, error: 'Invalid or missing measures array.' }
    }

    const migrated = migrateMeasures(cloneMeasures(measures))

    for (let mi = 0; mi < migrated.length; mi++) {
      const m = migrated[mi]
      if (!m || !Array.isArray(m.subdivisions)) {
        return { ok: false, error: `Measure ${mi + 1} has no subdivisions.` }
      }
    }

    const validSoundSet = soundSet && typeof soundSet === 'string' ? soundSet : 'woodblock'

    set({
      bpm,
      timeSignature: { beats: timeSignature.beats, noteValue: timeSignature.noteValue },
      measures: migrated,
      soundSet: validSoundSet,
      activePresetId: null,
    })

    return { ok: true }
  },
}))
