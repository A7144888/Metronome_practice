import { useState, useRef, useEffect, useMemo } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import { useMetronome } from '../hooks/useMetronome'
import {
  isMeasureFull,
  beatCapacityTicks,
  subdivDurationTicks,
  measureCapacityTicks,
  relativeBeatCount,
  NOTE_SYMBOLS,
  NOTE_HEAD_OPEN,
  BASE_DURATIONS_TICKS,
} from '../engine/musicTheory'
import Icon from '../components/Icon'
import LibraryMenu from '../components/LibraryMenu'

const TICKS_PER_DOT = BASE_DURATIONS_TICKS['thirty-second']

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

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

  const allFull = measures.every((m) =>
    isMeasureFull(m, timeSignature.beats, timeSignature.noteValue)
  )
  const canPlay = isPlaying || allFull

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
    if (prev.s === -1) return

    const measure = measures[currentMeasure]
    if (!measure) return

    let endTicks = 0
    for (let i = 0; i < currentSubdivision && i < measure.subdivisions.length; i++) {
      endTicks += subdivDurationTicks(measure.subdivisions[i])
    }
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
    <div className="flex-1 flex flex-col min-h-screen bg-md-bg relative overflow-hidden">
      {/* MD3 organic blur shapes */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-md-primary/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 -right-32 w-80 h-80 bg-md-tertiary/6 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-md-secondary-container/30 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Top Navigation */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-md-outline/15 bg-md-bg/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <Icon name="layers" className="text-md-primary text-3xl" />
          <h2 className="hidden sm:block text-xl font-medium tracking-tight text-md-fg">Performance View</h2>
          <LibraryMenu />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('editor')}
            className="p-2.5 rounded-full bg-md-surface hover:bg-md-primary/10 text-md-primary transition-all duration-300 ease-md3 active:scale-95"
            title="Go to Editor"
          >
            <Icon name="tune" />
          </button>
          <button
            onClick={() => setView('presets')}
            className="p-2.5 rounded-full bg-md-surface hover:bg-md-primary/10 text-md-primary transition-all duration-300 ease-md3 active:scale-95"
            title="Close Performance View"
          >
            <Icon name="close" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-around p-6 max-w-2xl mx-auto w-full gap-6 relative z-10">
        {/* Tempo Display */}
        <div className="text-center w-full">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-2">
            <div aria-hidden="true" />

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => adjustBpm(-1)}
                className="size-14 flex items-center justify-center rounded-full bg-md-secondary-container active:scale-95 hover:bg-md-secondary-container/80 transition-all duration-300 ease-md3 shrink-0"
              >
                <Icon name="remove" className="text-3xl text-md-primary" />
              </button>
              <div className="flex flex-col items-center shrink-0">
                {editingBpm ? (
                  <input
                    ref={bpmInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-32 text-center text-6xl font-medium bg-transparent border-b-2 border-md-primary outline-none leading-none text-md-fg"
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
                    className="text-6xl font-medium hover:text-md-primary transition-colors duration-300 leading-none text-md-fg"
                  >
                    {bpm}
                  </button>
                )}
                <span className="text-md-primary font-medium tracking-[0.2em] uppercase text-xs mt-1">BPM</span>
              </div>
              <button
                type="button"
                onClick={() => adjustBpm(1)}
                className="size-14 flex items-center justify-center rounded-full bg-md-secondary-container active:scale-95 hover:bg-md-secondary-container/80 transition-all duration-300 ease-md3 shrink-0"
              >
                <Icon name="add" className="text-3xl text-md-primary" />
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
                  background: `linear-gradient(to right, #6750A4 ${((bpm - 20) / 280) * 100}%, #E7E0EC ${((bpm - 20) / 280) * 100}%)`,
                }}
              />
            </div>
          </div>
          <p className="text-md-on-surface-variant font-medium">{getTempoLabel(bpm)}</p>
        </div>

        {/* Circular metronome */}
        <button
          type="button"
          onClick={isPlaying ? pause : play}
          disabled={!canPlay}
          title={!canPlay ? 'Every beat must be exactly full before playing' : (isPlaying ? 'Pause' : 'Play')}
          style={{ borderRadius: '50%' }}
          className={`relative w-full aspect-square max-w-[320px] flex items-center justify-center transition-all duration-300 ease-md3 group ${
            canPlay ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed opacity-60'
          }`}
        >
          <div
            style={{ borderRadius: '50%' }}
            className={`absolute inset-0 border-[6px] transition-colors duration-300 ease-md3 ${
              canPlay ? 'border-md-primary/30 group-hover:border-md-primary/60' : 'border-md-outline/20'
            }`}
          />

          {dots.map((d) => {
            const active = flashTick === d.tickPos
            const isAnchor = d.tickPos === 0
            const size = dots.length > 16 ? 8 : 14
            return (
              <div key={`dot-${d.tickPos}`}>
                <div
                  className={`absolute z-10 pointer-events-none transition-all duration-100 ${
                    active
                      ? 'bg-md-primary scale-[1.6] shadow-glow-sm'
                      : isAnchor
                        ? 'bg-md-primary/70'
                        : d.isTriplet
                          ? 'bg-md-tertiary/60'
                          : 'bg-md-primary/30'
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
                    className={`absolute z-10 text-[10px] font-medium pointer-events-none whitespace-nowrap select-none ${
                      d.isTriplet ? 'text-md-tertiary/90' : 'text-md-on-surface-variant/50'
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
            <span className="text-7xl font-medium leading-none text-md-primary">
              {isPlaying ? (currentBeat >= 0 ? currentBeat + 1 : 1) : '•'}
            </span>
            <span className="text-sm font-medium text-md-on-surface-variant mt-3 uppercase tracking-widest">
              {isPlaying ? 'Tap to Pause' : (canPlay ? 'Tap to Play' : 'Beat')}
            </span>
          </div>
        </button>

        {/* Sequence Grid (read-only) */}
        <div className="w-full">
          {measures.map((measure) => {
            const { beats, noteValue: nv } = timeSignature
            const beatCap = beatCapacityTicks(nv)
            const measCap = measureCapacityTicks(beats, nv)

            const notes = []
            let tickPos = 0
            measure.subdivisions.forEach((sd, sIdx) => {
              const dur = subdivDurationTicks(sd)
              notes.push({
                sdIdx: sIdx,
                beatIdx: Math.floor(tickPos / beatCap),
                accent: sd.accent,
                value: sd.value,
                dotted: sd.dotted,
                tie: sd.tie,
                dur,
                widthFraction: dur / measCap,
              })
              tickPos += dur
            })

            const COLORS = {
              strong: { active: 'bg-md-primary border-md-primary shadow-glow-sm', base: 'bg-md-primary/80 border-md-primary/80' },
              medium: { active: 'bg-md-tertiary border-md-tertiary', base: 'bg-md-tertiary/70 border-md-tertiary/70' },
              normal: { active: 'bg-md-outline border-md-outline', base: 'bg-md-outline/60 border-md-outline/60' },
              none:   { active: 'bg-md-surface-low/80 border-md-outline/40', base: 'bg-md-surface-low/50 border-md-outline/30' },
            }

            return (
              <div key={measure.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-0.5 h-5">
                  {Array.from({ length: beats }, (_, bIdx) => (
                    <div
                      key={bIdx}
                      className={`text-[9px] font-medium text-left pl-0.5 ${
                        isPlaying && currentBeat === bIdx
                          ? 'text-md-primary'
                          : 'text-md-on-surface-variant/40'
                      }`}
                      style={{ flex: 1 }}
                    >
                      {bIdx + 1}
                    </div>
                  ))}
                </div>

                <div className="flex items-stretch gap-0.5 h-16">
                  {notes.map((note) => {
                    const isActive =
                      isPlaying && note.beatIdx === currentBeat && note.sdIdx === currentSubdivision
                    const colors = COLORS[note.accent] || COLORS.normal
                    const dynLabel = relativeBeatCount(note.value, note.dotted, nv)

                    return (
                      <div
                        key={note.sdIdx}
                        style={{ flex: note.widthFraction }}
                        className={`
                          relative rounded-sm border flex flex-col items-center justify-center gap-0.5
                          text-[10px] font-medium transition-all duration-150 ease-md3 overflow-hidden min-w-0
                          ${isActive ? `${colors.active} scale-y-105` : colors.base}
                        `}
                      >
                        <span
                          className="leading-none"
                          style={{
                            fontSize: 24,
                            ...(NOTE_HEAD_OPEN.has(note.value)
                              ? { WebkitTextStroke: '1.5px rgba(255,255,255,0.9)', color: 'transparent' }
                              : { color: 'rgba(255,255,255,0.9)' }),
                          }}
                        >
                          {NOTE_SYMBOLS[note.value] || '♩'}
                          {note.value === 'triplet' && <sup className="text-amber-300" style={{ fontSize: 11, WebkitTextStroke: 'initial', color: '' }}>3</sup>}
                          {note.dotted && <span className="text-amber-300" style={{ fontSize: 13, WebkitTextStroke: 'initial', color: '' }}>•</span>}
                        </span>
                        <span className="text-white/70 leading-none" style={{ fontSize: 12 }}>
                          {dynLabel}
                        </span>
                        {note.tie && (
                          <span className="absolute right-0 top-0 text-sky-300 text-[8px] leading-none pr-0.5">⌢</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

      </main>

      {/* Footer Stats */}
      <footer className="p-6 grid grid-cols-4 gap-4 border-t border-md-outline/15 bg-md-surface/60 backdrop-blur-sm relative z-10">
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 font-medium">Time Sig</span>
          <span className="text-xl font-medium text-md-fg">{timeSignature.beats} / {timeSignature.noteValue}</span>
        </div>
        <div className="flex flex-col items-center border-l border-md-outline/15">
          <span className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 font-medium">Measure</span>
          <span className="text-xl font-medium text-md-fg">{measureCount}</span>
        </div>
        <div className="flex flex-col items-center border-l border-md-outline/15">
          <span className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 font-medium">Timer</span>
          <span className="text-xl font-medium text-md-fg">{formatTime(elapsedTime)}</span>
        </div>
        <div className="flex flex-col items-center justify-center border-l border-md-outline/15">
          <button
            type="button"
            onClick={stop}
            className="text-xl font-medium uppercase tracking-widest text-md-primary hover:text-md-primary/80 active:scale-95 transition-all duration-300 ease-md3"
            title="Reset playback"
          >
            Reset
          </button>
        </div>
      </footer>

    </div>
  )
}
