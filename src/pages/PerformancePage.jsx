import { useState, useRef, useEffect, useMemo } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import { useMetronome } from '../hooks/useMetronome'
import {
  isBeatFull,
  beatCapacityTicks,
  subdivDurationTicks,
  BASE_DURATIONS_TICKS,
} from '../engine/musicTheory'
import BeatIndicator from '../components/BeatIndicator'
import Icon from '../components/Icon'
import LibraryMenu from '../components/LibraryMenu'

// 1/32-note granularity is the smallest visual division on the perimeter ring.
const TICKS_PER_DOT = BASE_DURATIONS_TICKS['thirty-second'] // 60

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * Format a tick position as a reduced fraction of one beat.
 * e.g. (60, 480) → "1/8", (160, 480) → "1/3", (240, 480) → "1/2".
 * Returns '' for the anchor at position 0 — no label needed at 12 o'clock.
 */
function formatBeatFraction(tickPos, beatTicks) {
  if (tickPos === 0) return ''
  const g = gcd(tickPos, beatTicks)
  return `${tickPos / g}/${beatTicks / g}`
}

const BPM_TEMPOS = [
  { label: 'Largo', min: 20, max: 60 },
  { label: 'Adagio', min: 60, max: 72 },
  { label: 'Andante', min: 72, max: 96 },
  { label: 'Moderato', min: 96, max: 120 },
  { label: 'Allegro', min: 120, max: 168 },
  { label: 'Vivace', min: 168, max: 208 },
  { label: 'Presto', min: 208, max: 300 },
]

function getTempoLabel(bpm) {
  return BPM_TEMPOS.find((t) => bpm >= t.min && bpm < t.max)?.label ?? 'Presto'
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function PerformancePage() {
  const {
    bpm,
    setBpm,
    adjustBpm,
    timeSignature,
    measures,
    isPlaying,
    currentBeat,
    currentSubdivision,
    currentMeasure,
    elapsedTime,
    measureCount,
    setView,
  } = useMetronomeStore()
  const { play, stop, pause } = useMetronome()

  const allBeatsFull = measures.every((m) =>
    m.beats.every((b) => isBeatFull(b, timeSignature.noteValue))
  )
  const canPlay = isPlaying || allBeatsFull

  // ── Perimeter dots ────────────────────────────────────────────────────────
  // Tick positions placed on the ring within ONE beat, drawn clockwise from
  // 12 o'clock. We mix two grids:
  //   • 1/32-note grid (every TICKS_PER_DOT ticks) — covers regular durations.
  //   • Triplet positions at 1/3 and 2/3 of the beat — exact fractions a
  //     32nd grid can't represent. Beat capacity is always divisible by 3
  //     for every supported time-signature denominator (1/2/4/8/16/32), so
  //     these are guaranteed integers.
  const dots = useMemo(() => {
    const beatTicks = beatCapacityTicks(timeSignature.noteValue)
    const positions = new Set()
    for (let t = 0; t < beatTicks; t += TICKS_PER_DOT) positions.add(t)
    const tri1 = beatTicks / 3
    const tri2 = (2 * beatTicks) / 3
    positions.add(tri1)
    positions.add(tri2)

    return [...positions]
      .sort((a, b) => a - b)
      .map((tickPos) => {
        const angleDeg = -90 + (360 * tickPos) / beatTicks
        const rad = (angleDeg * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        return {
          tickPos,
          dotX:    50 + 47 * cos,
          dotY:    50 + 47 * sin,
          labelX:  50 + 38 * cos,
          labelY:  50 + 38 * sin,
          label:   formatBeatFraction(tickPos, beatTicks),
          isTriplet: tickPos === tri1 || tickPos === tri2,
        }
      })
  }, [timeSignature.noteValue])

  // ── Flash logic ───────────────────────────────────────────────────────────
  // We flash the dot whose tick-position matches the END of the just-completed
  // subdivision. Since the audio engine fires onBeat at the START of every
  // subdivision, "end of previous note" == "start of current note". So when
  // currentSubdivision advances, we light the dot at the cumulative tick
  // position where the *previous* note ended. For a beat with two 8ths in
  // 4/4 this lights the 1/2 dot and then the top dot (= start of next beat).
  // Triplet endings (160/320 ticks in 4/4) match the dedicated triplet dots.
  const [flashTick, setFlashTick] = useState(null)
  const prevPosRef = useRef({ m: -1, b: -1, s: -1 })

  useEffect(() => {
    if (!isPlaying) {
      prevPosRef.current = { m: -1, b: -1, s: -1 }
      setFlashTick(null)
      return
    }
    if (currentBeat < 0 || currentSubdivision < 0) return

    const prev = prevPosRef.current
    prevPosRef.current = {
      m: currentMeasure,
      b: currentBeat,
      s: currentSubdivision,
    }
    // Skip the very first onBeat after starting — no duration has "passed" yet.
    if (prev.s === -1) return

    const beat = measures[currentMeasure]?.beats[currentBeat]
    if (!beat) return

    // Cumulative ticks from beat start to the start of the current subdivision.
    // Equals the END tick of the just-finished previous subdivision.
    let endTicks = 0
    for (let i = 0; i < currentSubdivision && i < beat.subdivisions.length; i++) {
      endTicks += subdivDurationTicks(beat.subdivisions[i])
    }
    // Snap to nearest known dot position (handles minor misalignment when a
    // user mixes notation that doesn't fall exactly on the 32nd / triplet
    // grid). This also wraps a full-beat end (endTicks === beatTicks) back to
    // tickPos 0 because we only build positions in [0, beatTicks).
    const beatTicks = beatCapacityTicks(timeSignature.noteValue)
    const wrapped = ((endTicks % beatTicks) + beatTicks) % beatTicks
    let nearest = dots[0]?.tickPos ?? 0
    let bestDelta = Infinity
    for (const d of dots) {
      const delta = Math.abs(d.tickPos - wrapped)
      if (delta < bestDelta) {
        bestDelta = delta
        nearest = d.tickPos
      }
    }

    setFlashTick(nearest)
    const t = setTimeout(() => setFlashTick(null), 140)
    return () => clearTimeout(t)
  }, [currentSubdivision, currentBeat, currentMeasure, isPlaying, measures, dots, timeSignature.noteValue])

  // Inline-edit for BPM (matches EditorPage's click-to-edit behaviour)
  const [editingBpm, setEditingBpm] = useState(false)
  const [bpmInput, setBpmInput] = useState(String(bpm))
  const bpmInputRef = useRef(null)

  const commitBpm = () => {
    const v = parseFloat(bpmInput)
    if (!isNaN(v)) setBpm(v)
    setEditingBpm(false)
  }

  const handleBpmKeyDown = (e) => {
    if (e.key === 'Enter') commitBpm()
    if (e.key === 'Escape') setEditingBpm(false)
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {/* Top Navigation */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-primary/20">
        <div className="flex items-center gap-3">
          <Icon name="layers" className="text-primary text-3xl" />
          <h2 className="hidden sm:block text-xl font-bold tracking-tight">Performance View</h2>
          <LibraryMenu />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('editor')}
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title="Go to Editor"
          >
            <Icon name="tune" />
          </button>
          <button
            onClick={() => setView('presets')}
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title="Close Performance View"
          >
            <Icon name="close" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-around p-6 max-w-2xl mx-auto w-full gap-6">
        {/* Tempo Display — uses a 3-col grid (1fr / auto / 1fr) so the BPM
            cluster sits exactly in the horizontal centre of the page. The
            slider lives in the right 1fr column with a capped max-width to
            stay compact, and the empty left 1fr column mirrors that space
            so the centre column never drifts off-axis. */}
        <div className="text-center w-full">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-2">
            <div aria-hidden="true" />

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => adjustBpm(-1)}
                className="size-14 flex items-center justify-center rounded-xl bg-primary/10 border-2 border-primary/30 active:scale-95 transition-all shrink-0"
              >
                <Icon name="remove" className="text-3xl text-primary" />
              </button>
              <div className="flex flex-col items-center shrink-0">
                {editingBpm ? (
                  <input
                    ref={bpmInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-32 text-center text-6xl font-bold bg-transparent border-b-2 border-primary outline-none leading-none"
                    value={bpmInput}
                    onChange={(e) => setBpmInput(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={commitBpm}
                    onKeyDown={handleBpmKeyDown}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setBpmInput(String(bpm))
                      setEditingBpm(true)
                    }}
                    title="Click to edit"
                    className="text-6xl font-bold hover:text-primary transition-colors leading-none"
                  >
                    {bpm}
                  </button>
                )}
                <span className="text-primary font-bold tracking-[0.2em] uppercase text-xs mt-1">BPM</span>
              </div>
              <button
                type="button"
                onClick={() => adjustBpm(1)}
                className="size-14 flex items-center justify-center rounded-xl bg-primary/10 border-2 border-primary/30 active:scale-95 transition-all shrink-0"
              >
                <Icon name="add" className="text-3xl text-primary" />
              </button>
            </div>

            <div className="flex justify-start">
              <input
                type="range"
                min="20"
                max="300"
                step="1"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full max-w-[180px] h-1.5 cursor-pointer"
                style={{
                  borderRadius: '9999px',
                  background: `linear-gradient(to right, #ec1313 ${((bpm - 20) / 280) * 100}%, #374151 ${((bpm - 20) / 280) * 100}%)`,
                }}
              />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{getTempoLabel(bpm)}</p>
        </div>

        {/* Circular metronome — borderRadius is forced to 50% inline because
            this project's tailwind config redefines `rounded-full` as a
            small 0.75rem radius. We need a true circle here so the ring +
            perimeter dots read as a clock face, not a rounded rectangle. */}
        <button
          type="button"
          onClick={isPlaying ? pause : play}
          disabled={!canPlay}
          title={!canPlay ? 'Every beat must be exactly full before playing' : (isPlaying ? 'Pause' : 'Play')}
          style={{ borderRadius: '50%' }}
          className={`relative w-full aspect-square max-w-[320px] flex items-center justify-center transition-all group ${
            canPlay ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed opacity-60'
          }`}
        >
          <div
            style={{ borderRadius: '50%' }}
            className={`absolute inset-0 border-[6px] transition-colors ${
              canPlay ? 'border-primary/30 group-hover:border-primary/60' : 'border-primary/10'
            }`}
          />

          {/* Perimeter subdivision dots + fractional labels.
              • Regular grid dots (32nd-aligned) use primary red.
              • Triplet dots (1/3, 2/3) use amber to distinguish them from
                the regular grid.
              • Each dot has a small label like "1/8", "1/3", "1/2" placed
                slightly inside the ring so the user can identify the position
                without counting. */}
          {dots.map((d) => {
            const active = flashTick === d.tickPos
            const isAnchor = d.tickPos === 0
            const size = dots.length > 16 ? 8 : 14
            return (
              <div key={`dot-${d.tickPos}`}>
                <div
                  className={`absolute z-10 pointer-events-none transition-all duration-100 ${
                    active
                      ? 'bg-primary scale-[1.6] shadow-glow-sm'
                      : isAnchor
                        ? 'bg-primary/70'
                        : d.isTriplet
                          ? 'bg-amber-400/60'
                          : 'bg-primary/30'
                  }`}
                  style={{
                    left:         `${d.dotX}%`,
                    top:          `${d.dotY}%`,
                    width:        size,
                    height:       size,
                    transform:    'translate(-50%, -50%)',
                    borderRadius: '50%',
                  }}
                />
                {d.label && dots.length <= 16 && (
                  <span
                    className={`absolute z-10 text-[10px] font-bold pointer-events-none whitespace-nowrap select-none ${
                      d.isTriplet ? 'text-amber-400/90' : 'text-slate-400/80'
                    }`}
                    style={{
                      left:      `${d.labelX}%`,
                      top:       `${d.labelY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {d.label}
                  </span>
                )}
              </div>
            )
          })}

          <div className="flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-7xl font-bold leading-none text-primary">
              {isPlaying ? (currentBeat >= 0 ? currentBeat + 1 : 1) : '•'}
            </span>
            <span className="text-sm font-semibold text-slate-400 mt-3 uppercase tracking-widest">
              {isPlaying ? 'Tap to Pause' : (canPlay ? 'Tap to Play' : 'Beat')}
            </span>
          </div>
        </button>

        {/* Beat Indicator */}
        <div className="w-full">
          <BeatIndicator />
        </div>

      </main>

      {/* Footer Stats — Reset replaces the old stop button as a text-only
          action sitting alongside the performance metrics. */}
      <footer className="p-6 grid grid-cols-4 gap-4 border-t border-primary/10">
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Time Sig</span>
          <span className="text-xl font-bold">{timeSignature.beats} / {timeSignature.noteValue}</span>
        </div>
        <div className="flex flex-col items-center border-l border-primary/10">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Measure</span>
          <span className="text-xl font-bold">{measureCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-primary/10">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Timer</span>
          <span className="text-xl font-bold">{formatTime(elapsedTime)}</span>
        </div>
        <div className="flex flex-col items-center justify-center border-l border-primary/10">
          <button
            type="button"
            onClick={stop}
            className="text-xl font-bold uppercase tracking-widest text-primary hover:text-primary/80 active:scale-95 transition-all"
            title="Reset playback"
          >
            Reset
          </button>
        </div>
      </footer>

    </div>
  )
}
