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
 *   dotted triplet = 160 * 3 / 2 = 240 ✓
 */
export function subdivDurationTicks(sd) {
  const base = BASE_DURATIONS_TICKS[sd.value] ?? TICKS_PER_QUARTER
  return sd.dotted ? (base * 3 / 2) : base
}

/**
 * Beat capacity in ticks for the given time-signature note value.
 *   noteValue = 4  →  (480 * 4) / 4 = 480  (one quarter note)
 *   noteValue = 8  →  (480 * 4) / 8 = 240  (one eighth note)
 *   noteValue = 2  →  (480 * 4) / 2 = 960  (one half note)
 */
export function beatCapacityTicks(noteValue) {
  return (TICKS_PER_QUARTER * 4) / noteValue
}

/**
 * Total ticks consumed by all subdivisions in a beat.
 */
export function beatUsedTicks(subdivisions) {
  return subdivisions.reduce((acc, sd) => acc + subdivDurationTicks(sd), 0)
}

/**
 * Remaining ticks in a beat (negative = overflow).
 * carryOver (ticks arriving from a tie in the previous beat) reduces available space.
 */
export function beatRemainingTicks(beat, noteValue) {
  const cap = beatCapacityTicks(noteValue)
  const used = beatUsedTicks(beat.subdivisions)
  return cap - used - (beat.carryOver ?? 0)
}

/** True when the beat is exactly filled — no gap, no overflow. */
export function isBeatFull(beat, noteValue) {
  return beatRemainingTicks(beat, noteValue) === 0
}

/** True when placed notes exceed beat capacity. */
export function isBeatOverflow(beat, noteValue) {
  return beatRemainingTicks(beat, noteValue) < 0
}

/**
 * Would adding this note value (+ optional dot) overflow the beat?
 */
export function wouldOverflow(beat, noteValue, newSdValue, dotted = false) {
  const newTicks = subdivDurationTicks({ value: newSdValue, dotted })
  return newTicks > beatRemainingTicks(beat, noteValue)
}

/**
 * Full validation summary for a single beat.
 */
export function validateBeat(beat, noteValue) {
  const cap      = beatCapacityTicks(noteValue)
  const carryOver = beat.carryOver ?? 0
  const used     = beatUsedTicks(beat.subdivisions)
  const remaining = cap - used - carryOver

  return {
    capacity: cap,
    carryOver,
    used,
    remaining,
    overflow:      remaining < 0,
    exact:         remaining === 0,
    percentFilled: Math.min(100, Math.round(((used + carryOver) / cap) * 100)),
  }
}

/**
 * Human-readable label for a subdivision — e.g. "Dotted Eighth".
 */
export function subdivLabel(sd) {
  const name = sd.value.charAt(0).toUpperCase() + sd.value.slice(1)
  return `${sd.dotted ? 'Dotted ' : ''}${name}`
}

/** Unicode music symbols for visual display. */
export const NOTE_SYMBOLS = {
  whole:           '𝅝',
  half:            '𝅗𝅥',
  quarter:         '♩',
  eighth:          '♪',
  sixteenth:       '♬',
  'thirty-second': '𝅘𝅥𝅯',
  triplet:         '⅓',
}

/** Short human labels for note values. */
export const NOTE_SHORT_LABELS = {
  whole:           '1',
  half:            '½',
  quarter:         '¼',
  eighth:          '⅛',
  sixteenth:       '1/16',
  'thirty-second': '1/32',
  triplet:         '⅓',
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
 * Returns true if every beat satisfies:
 *   usedTicks + carryOver <= beatMaxTicks   AND   all tick values are integers.
 */
export function validateStructure(measures, noteValue) {
  const beatMax = beatCapacityTicks(noteValue)
  for (const measure of measures) {
    for (const beat of measure.beats) {
      const carryOver = beat.carryOver ?? 0
      const used = beatUsedTicks(beat.subdivisions)
      if (used + carryOver > beatMax) return false
      if (beat.subdivisions.some(sd => !Number.isInteger(subdivDurationTicks(sd)))) return false
    }
  }
  return true
}
