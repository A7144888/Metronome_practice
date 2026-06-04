/**
 * Music Theory Utility Module
 *
 * All durations are expressed as integer ticks.
 * TICKS_PER_QUARTER = 480 — supports whole through 32nd notes and triplets
 * with exact integer division:  480 % 2 = 0, % 3 = 0, % 4 = 0, % 8 = 0.
 */

export const TICKS_PER_QUARTER = 480

/**
 * Base tick durations for each note value (no dot modifier applied).
 * Every value is a guaranteed exact integer.
 *
 * | Note           | Ticks  |
 * |----------------|--------|
 * | whole          | 1920   |
 * | half           | 960    |
 * | quarter        | 480    |
 * | eighth         | 240    |
 * | sixteenth      | 120    |
 * | thirty-second  | 60     |
 * | triplet        | 160    | (1/3 of a quarter: 480 / 3)
 */
export const BASE_DURATIONS_TICKS = {
  whole:           TICKS_PER_QUARTER * 4,    // 1920
  half:            TICKS_PER_QUARTER * 2,    // 960
  quarter:         TICKS_PER_QUARTER,        // 480
  eighth:          TICKS_PER_QUARTER / 2,    // 240  (480 % 2 === 0 ✓)
  sixteenth:       TICKS_PER_QUARTER / 4,    // 120  (480 % 4 === 0 ✓)
  'thirty-second': TICKS_PER_QUARTER / 8,   // 60   (480 % 8 === 0 ✓)
  triplet:         TICKS_PER_QUARTER / 3,   // 160  (480 % 3 === 0 ✓)
}

export const NOTE_VALUES = Object.keys(BASE_DURATIONS_TICKS)

/**
 * Integer tick duration of a subdivision.
 *
 * Dotted modifier applies × 3 / 2 with multiply-before-divide to avoid truncation.
 * At TPQ=480 all dotted values are exact:
 *   dotted quarter = 480 * 3 / 2 = 720 ✓
 *   dotted eighth  = 240 * 3 / 2 = 360 ✓
 *
 * Triplet notes CANNOT be dotted — dotted tuplets are non-standard in music theory
 * and create misleading duration equivalences (dotted triplet-eighth = regular eighth).
 */
export function subdivDurationTicks(sd) {
  const base = BASE_DURATIONS_TICKS[sd.value] ?? TICKS_PER_QUARTER
  if (sd.value === 'triplet') return base
  return sd.dotted ? (base * 3 / 2) : base
}

// ── Beat-level helpers (used for display grouping) ───────────────────────────

/**
 * Beat capacity in ticks for the given time-signature note value.
 *   noteValue = 4  →  480  (one quarter note)
 *   noteValue = 8  →  240  (one eighth note)
 *   noteValue = 2  →  960  (one half note)
 */
export function beatCapacityTicks(noteValue) {
  return (TICKS_PER_QUARTER * 4) / noteValue
}

// ── Measure-level helpers ────────────────────────────────────────────────────

/** Total tick capacity of one measure. */
export function measureCapacityTicks(beats, noteValue) {
  return beats * beatCapacityTicks(noteValue)
}

/** Total ticks consumed by all subdivisions. */
export function measureUsedTicks(subdivisions) {
  return subdivisions.reduce((acc, sd) => acc + subdivDurationTicks(sd), 0)
}

/** Remaining ticks in a measure (negative = overflow). */
export function measureRemainingTicks(measure, beats, noteValue) {
  return measureCapacityTicks(beats, noteValue) - measureUsedTicks(measure.subdivisions)
}

/** True when the measure is exactly filled — no gap, no overflow. */
export function isMeasureFull(measure, beats, noteValue) {
  return measureRemainingTicks(measure, beats, noteValue) === 0
}

/** True when placed notes exceed measure capacity. */
export function isMeasureOverflow(measure, beats, noteValue) {
  return measureRemainingTicks(measure, beats, noteValue) < 0
}

/**
 * Full validation summary for a measure.
 */
export function validateMeasure(measure, beats, noteValue) {
  const cap  = measureCapacityTicks(beats, noteValue)
  const used = measureUsedTicks(measure.subdivisions)
  const remaining = cap - used

  return {
    capacity: cap,
    used,
    remaining,
    overflow:      remaining < 0,
    exact:         remaining === 0,
    percentFilled: Math.min(100, Math.round((used / cap) * 100)),
  }
}

/**
 * Compute which beat (0-indexed) a subdivision starts on, given its index
 * in the measure's flat subdivisions array.
 */
export function getSubdivBeatIndex(measure, sdIndex, noteValue) {
  const beatCap = beatCapacityTicks(noteValue)
  let tickPos = 0
  for (let i = 0; i < sdIndex && i < measure.subdivisions.length; i++) {
    tickPos += subdivDurationTicks(measure.subdivisions[i])
  }
  return Math.floor(tickPos / beatCap)
}

// ── Binary / Ternary conflict (per-beat, 樂理) ───────────────────────────────

/** True when the note value belongs to the ternary (triplet) subdivision family. */
export function isTripletValue(value) {
  return value === 'triplet'
}

/**
 * Within one scope (typically a single beat), binary and triplet subdivisions
 * must not mix — e.g. an eighth plus a triplet eighth in the same beat leaves
 * unfillable tick gaps (⅓-beat units vs ½-beat units).
 */
export function hasBinaryTernaryConflict(subdivisions, newValue) {
  if (subdivisions.length === 0) return false
  const newIsTriplet = isTripletValue(newValue)
  if (newIsTriplet) return subdivisions.some((sd) => !isTripletValue(sd.value))
  return subdivisions.some((sd) => isTripletValue(sd.value))
}

/** Tick span [start, end) for a subdivision in measure order. */
export function getSubdivTickSpan(measure, subdivId) {
  let pos = 0
  for (const sd of measure.subdivisions) {
    const dur = subdivDurationTicks(sd)
    if (sd.id === subdivId) return { start: pos, end: pos + dur }
    pos += dur
  }
  return null
}

/** Subdivisions overlapping [rangeStart, rangeEnd), optionally excluding one id. */
export function subdivisionsInTickRange(measure, rangeStart, rangeEnd, excludeId = null) {
  let pos = 0
  const result = []
  for (const sd of measure.subdivisions) {
    const dur = subdivDurationTicks(sd)
    const sdStart = pos
    const sdEnd = pos + dur
    pos += dur
    if (excludeId && sd.id === excludeId) continue
    if (sdEnd > rangeStart && sdStart < rangeEnd) result.push(sd)
  }
  return result
}

function beatsTouchedBySpan(start, end, beatCap) {
  const beats = []
  const first = Math.floor(start / beatCap)
  const last = Math.floor((end - 1) / beatCap)
  for (let b = first; b <= last; b++) beats.push(b)
  return beats
}

/**
 * True if placing/changing a note to `newValue` would mix binary and triplet
 * within any beat the note touches. Different beats may use different grouping.
 */
export function hasBinaryTernaryConflictForNote(measure, subdivId, newValue, noteValue, dotted) {
  const sd = measure.subdivisions.find((x) => x.id === subdivId)
  if (!sd) return false

  let pos = 0
  for (const s of measure.subdivisions) {
    if (s.id === subdivId) break
    pos += subdivDurationTicks(s)
  }

  const useDotted = newValue === 'triplet' ? false : (dotted !== undefined ? dotted : sd.dotted)
  const newDur = subdivDurationTicks({ value: newValue, dotted: useDotted })
  const start = pos
  const end = pos + newDur
  const beatCap = beatCapacityTicks(noteValue)

  for (const beatIdx of beatsTouchedBySpan(start, end, beatCap)) {
    const beatStart = beatIdx * beatCap
    const beatEnd = beatStart + beatCap
    const rangeStart = Math.max(start, beatStart)
    const rangeEnd = Math.min(end, beatEnd)
    const inBeat = subdivisionsInTickRange(measure, rangeStart, rangeEnd, subdivId)
    if (hasBinaryTernaryConflict(inBeat, newValue)) return true
  }
  return false
}

/** Conflict check when inserting a new note at `tickStart` with the given duration. */
export function hasBinaryTernaryConflictAtTick(measure, tickStart, newValue, noteValue, durationTicks) {
  const end = tickStart + durationTicks
  const beatCap = beatCapacityTicks(noteValue)

  for (const beatIdx of beatsTouchedBySpan(tickStart, end, beatCap)) {
    const beatStart = beatIdx * beatCap
    const beatEnd = beatStart + beatCap
    const rangeStart = Math.max(tickStart, beatStart)
    const rangeEnd = Math.min(end, beatEnd)
    const inBeat = subdivisionsInTickRange(measure, rangeStart, rangeEnd, null)
    if (hasBinaryTernaryConflict(inBeat, newValue)) return true
  }
  return false
}

// ── Display helpers ──────────────────────────────────────────────────────────

/**
 * Note values whose standard notation uses an open (hollow) note head.
 * Used by display components to render the correct visual appearance.
 */
export const NOTE_HEAD_OPEN = new Set(['whole', 'half'])

/** Unicode music symbols for visual display. */
export const NOTE_SYMBOLS = {
  whole:           '○',
  half:            '♩',
  quarter:         '♩',
  eighth:          '♪',
  sixteenth:       '♬',
  'thirty-second': '♬',
  triplet:         '♪',
}

/** Short human labels for note values (absolute, not relative to time sig). */
export const NOTE_SHORT_LABELS = {
  whole:           '1',
  half:            '½',
  quarter:         '¼',
  eighth:          '⅛',
  sixteenth:       '1/16',
  'thirty-second': '1/32',
  triplet:         '⅓',
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b) }

const UNICODE_FRACTIONS = {
  '1/2': '½', '1/3': '⅓', '1/4': '¼', '1/6': '⅙', '1/8': '⅛',
  '2/3': '⅔', '3/4': '¾', '3/8': '⅜', '5/6': '⅚', '5/8': '⅝', '7/8': '⅞',
}

/**
 * Dynamic beat-count label — expresses a note's duration as a number of beats
 * relative to the current time signature's beat unit.
 *
 *   4/4: quarter → "1",  half → "2",  whole → "4",  eighth → "½"
 *   4/2: half → "1",  whole → "2",  quarter → "½"
 *   6/8: eighth → "1",  quarter → "2",  dotted quarter → "3"
 */
export function relativeBeatCount(sdValue, sdDotted, tsNoteValue) {
  const dur     = subdivDurationTicks({ value: sdValue, dotted: sdDotted })
  const beatCap = beatCapacityTicks(tsNoteValue)

  const g   = gcd(dur, beatCap)
  const num = dur / g
  const den = beatCap / g

  if (den === 1) return String(num)

  if (num > den) {
    const integer   = Math.floor(num / den)
    const remainder = num % den
    if (remainder === 0) return String(integer)
    const remKey  = `${remainder}/${den}`
    const remFrac = UNICODE_FRACTIONS[remKey] ?? remKey
    return `${integer}${remFrac}`
  }

  return UNICODE_FRACTIONS[`${num}/${den}`] ?? `${num}/${den}`
}

/**
 * Human-readable label for a subdivision — e.g. "Dotted Eighth".
 */
export function subdivLabel(sd) {
  const name = sd.value.charAt(0).toUpperCase() + sd.value.slice(1)
  return `${sd.dotted ? 'Dotted ' : ''}${name}`
}

/**
 * Build playback entries from a flat subdivision list.
 * A note following a tied predecessor fires silently (no re-attack) but
 * still advances the audio clock by its full tick duration.
 */
export function buildPlaybackEntries(subdivisions) {
  return subdivisions.map((sd, idx) => {
    const prevTied = idx > 0 && subdivisions[idx - 1].tie === true
    return {
      ...sd,
      silent: prevTied,
      durationTicks: subdivDurationTicks(sd),
    }
  })
}

/**
 * Validate the full rhythm structure.
 * Returns true if every measure satisfies:
 *   usedTicks <= measureCapacity   AND   all tick values are integers.
 */
export function validateStructure(measures, beats, noteValue) {
  const measCap = measureCapacityTicks(beats, noteValue)
  for (const measure of measures) {
    const subs = measure.subdivisions ?? []
    const used = measureUsedTicks(subs)
    if (used > measCap) return false
    if (subs.some(sd => !Number.isInteger(subdivDurationTicks(sd)))) return false
  }
  return true
}
