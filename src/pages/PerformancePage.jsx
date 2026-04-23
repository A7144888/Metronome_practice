import { useState, useRef } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import { useMetronome } from '../hooks/useMetronome'
import { isBeatFull } from '../engine/musicTheory'
import BeatIndicator from '../components/BeatIndicator'
import Icon from '../components/Icon'

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
    elapsedTime,
    measureCount,
    setView,
  } = useMetronomeStore()
  const { play, stop, pause } = useMetronome()

  const allBeatsFull = measures.every((m) =>
    m.beats.every((b) => isBeatFull(b, timeSignature.noteValue))
  )
  const canPlay = isPlaying || allBeatsFull

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
          <h2 className="text-xl font-bold tracking-tight">Performance View</h2>
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
        {/* Tempo Display */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-6 mb-2">
            <button
              type="button"
              onClick={() => adjustBpm(-1)}
              className="size-14 flex items-center justify-center rounded-xl bg-primary/10 border-2 border-primary/30 active:scale-95 transition-all"
            >
              <Icon name="remove" className="text-3xl text-primary" />
            </button>
            <div className="flex flex-col items-center">
              {editingBpm ? (
                <input
                  ref={bpmInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-40 text-center text-7xl font-bold bg-transparent border-b-2 border-primary outline-none leading-none"
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
                  className="text-7xl font-bold hover:text-primary transition-colors leading-none"
                >
                  {bpm}
                </button>
              )}
              <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm mt-2">BPM</span>
            </div>
            <button
              type="button"
              onClick={() => adjustBpm(1)}
              className="size-14 flex items-center justify-center rounded-xl bg-primary/10 border-2 border-primary/30 active:scale-95 transition-all"
            >
              <Icon name="add" className="text-3xl text-primary" />
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{getTempoLabel(bpm)}</p>
        </div>

        {/* Visual Metronome Ring — no outward expansion (was animate-ping:
            its 2.25x scale covered the BPM +/- buttons above, intercepting
            clicks during playback). Pointer-events disabled on overlays so
            the ring is purely decorative. */}
        <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 rounded-full border-[10px] border-primary/5" />
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[140px] font-bold leading-none text-primary">
              {isPlaying ? (currentBeat >= 0 ? currentBeat + 1 : 1) : '•'}
            </span>
            <span className="text-xl font-semibold text-slate-400 -mt-4 uppercase tracking-widest">
              Beat
            </span>
          </div>
          {isPlaying && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ animation: `spin ${(60 / bpm).toFixed(2)}s linear infinite` }}
            >
              <div className="absolute top-1 left-1/2 -translate-x-1/2 size-5 bg-primary rounded-full shadow-glow-sm" />
            </div>
          )}
        </div>

        {/* Beat Indicator */}
        <div className="w-full">
          <BeatIndicator />
        </div>

        {/* BPM Slider */}
        <div className="w-full px-4">
          <input
            type="range"
            min="20"
            max="300"
            step="1"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full h-2 rounded-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ec1313 ${((bpm - 20) / 280) * 100}%, #374151 ${((bpm - 20) / 280) * 100}%)`,
            }}
          />
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={isPlaying ? pause : play}
            disabled={!canPlay}
            title={!canPlay ? 'Every beat must be exactly full before playing' : (isPlaying ? 'Pause' : 'Play')}
            className={`size-28 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${
              canPlay ? 'bg-primary shadow-primary/40 active:scale-90' : 'bg-slate-600/60 cursor-not-allowed opacity-60'
            }`}
          >
            <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="text-6xl" />
          </button>

          <button
            type="button"
            onClick={stop}
            className="size-16 rounded-full bg-slate-200 dark:bg-primary/20 flex items-center justify-center text-slate-700 dark:text-primary active:scale-95 transition-transform"
          >
            <Icon name="stop" className="text-2xl" />
          </button>
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="p-6 grid grid-cols-3 gap-4 border-t border-primary/10">
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Time Sig</span>
          <span className="text-xl font-bold">{timeSignature.beats} / {timeSignature.noteValue}</span>
        </div>
        <div className="flex flex-col items-center border-x border-primary/10">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Measure</span>
          <span className="text-xl font-bold">{measureCount}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Timer</span>
          <span className="text-xl font-bold">{formatTime(elapsedTime)}</span>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
