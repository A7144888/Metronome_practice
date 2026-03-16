/**
 * Music Theory Utility Module
 *
 * All durations are expressed in "quarter-note beats" (QNB).
 * 1 QNB = one quarter note duration.
 *
 * Floating-point rounding: we round all computed values to a precision
 * of 1/128 of a quarter note (≈0.0078) to avoid 0.999999… artifacts.
 */

const ROUND_FACTOR = 128 // round to nearest 1/128 QNB

export function roundQNB(val) {
  return Math.round(val * ROUND_FACTOR) / ROUND_FACTOR
}

/** Base quarter-note beat durations for each note value (no dot) */
export const BASE_DURATIONS_QNB = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
  'thirty-second': 0.125,
  triplet: 1 / 3,   // triplet = 1/3 of a quarter
}

export const NOTE_VALUES = Object.keys(BASE_DURATIONS_QNB)

/**
 * Returns the actual duration of a subdivision in QNBs,
 * accounting for dotted flag and triplet grouping.
 *
 * Rules:
 *  - dotted: duration × 1.5
 *  - triplet: already encoded as base 1/3; dotted triplet = 1/2 (valid in music)
 */
export function subdivDurationQNB(sd) {
  const base = BASE_DURATIONS_QNB[sd.value] ?? 1
  const dotFactor = sd.dotted ? 1.5 : 1
  return roundQNB(base * dotFactor)
}

/**
 * How many QNBs are allowed per beat given the time signature.
 *   beatCapacityQNB = 4 / noteValue
 * e.g. 4/4 → 4/4 = 1, 6/8 → 4/8 = 0.5
 */
export function beatCapacityQNB(noteValue) {
  return roundQNB(4 / noteValue)
}

/**
 * Total QNBs used by all subdivisions in a beat.
 */
export function beatUsedQNB(subdivisions) {
  return roundQNB(subdivisions.reduce((acc, sd) => acc + subdivDurationQNB(sd), 0))
}

/**
 * Remaining capacity in a beat.
 * Negative → overflow.
 */
export function beatRemainingQNB(beat, noteValue) {
  const cap = beatCapacityQNB(noteValue)
  const used = beatUsedQNB(beat.subdivisions)
  return roundQNB(cap - used)
}

/**
 * Is the beat exactly full? (within rounding tolerance)
 */
export function isBeatFull(beat, noteValue) {
  return Math.abs(beatRemainingQNB(beat, noteValue)) < 1 / ROUND_FACTOR
}

/**
 * Is the beat overflowing?
 */
export function isBeatOverflow(beat, noteValue) {
  return beatRemainingQNB(beat, noteValue) < -(1 / ROUND_FACTOR)
}

/**
 * Would adding this note value (+ dotted) to the beat cause overflow?
 */
export function wouldOverflow(beat, noteValue, newSdValue, dotted = false) {
  const newDur = subdivDurationQNB({ value: newSdValue, dotted })
  const remaining = beatRemainingQNB(beat, noteValue)
  return newDur > remaining + 1 / ROUND_FACTOR
}

/**
 * Validation result for a single beat.
 */
export function validateBeat(beat, noteValue) {
  const cap = beatCapacityQNB(noteValue)
  const used = beatUsedQNB(beat.subdivisions)
  const remaining = roundQNB(cap - used)
  const overflow = remaining < -(1 / ROUND_FACTOR)
  const exact = Math.abs(remaining) < 1 / ROUND_FACTOR

  return {
    capacity: cap,
    used,
    remaining,
    overflow,
    exact,
    percentFilled: Math.min(100, roundQNB((used / cap) * 100)),
  }
}

/**
 * Human-readable label for a subdivision.
 *   e.g. "Dotted Eighth", "Quarter (Triplet)"
 */
export function subdivLabel(sd) {
  const name = sd.value.charAt(0).toUpperCase() + sd.value.slice(1)
  const dot = sd.dotted ? 'Dotted ' : ''
  return `${dot}${name}`
}

/**
 * Unicode symbol for note value (approximate, for display)
 */
export const NOTE_SYMBOLS = {
  whole: '𝅝',
  half: '𝅗𝅥',
  quarter: '♩',
  eighth: '♪',
  sixteenth: '♬',
  'thirty-second': '𝅘𝅥𝅯',
  triplet: '⅓',
}

/**
 * Short display labels for note values
 */
export const NOTE_SHORT_LABELS = {
  whole: '1',
  half: '½',
  quarter: '¼',
  eighth: '⅛',
  sixteenth: '1/16',
  'thirty-second': '1/32',
  triplet: '⅓',
}

/**
 * Given a flat list of subdivisions with tie flags, build an array of
 * playback entries. Tied notes are merged: only the first note in a
 * tie chain fires a click; subsequent tied notes are silent but still
 * advance the clock.
 */
export function buildPlaybackEntries(subdivisions) {
  return subdivisions.map((sd, idx) => {
    const prevTied = idx > 0 && subdivisions[idx - 1].tie === true
    return {
      ...sd,
      silent: prevTied,        // previous note ties into this one → no attack
      durationQNB: subdivDurationQNB(sd),
    }
  })
}
