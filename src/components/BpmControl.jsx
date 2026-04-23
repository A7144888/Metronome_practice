import { useState, useRef } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import { useTapTempo } from '../hooks/useTapTempo'
import Icon from './Icon'

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
  const t = BPM_TEMPOS.find((t) => bpm >= t.min && bpm < t.max)
  return t?.label ?? 'Presto'
}

export default function BpmControl({ compact = false }) {
  const { bpm, setBpm, adjustBpm } = useMetronomeStore()
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(bpm))
  const inputRef = useRef(null)

  const tap = useTapTempo(setBpm)

  const commit = () => {
    const v = parseFloat(inputVal)
    if (!isNaN(v)) setBpm(v)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => adjustBpm(-1)}
          className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          <Icon name="remove" className="text-lg" />
        </button>
        <div className="text-center min-w-[80px]">
          {editing ? (
            <input
              ref={inputRef}
              className="w-20 text-center text-2xl font-bold bg-transparent border-b-2 border-primary outline-none"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setInputVal(String(bpm))
                setEditing(true)
              }}
              className="text-2xl font-bold hover:text-primary transition-colors"
            >
              {bpm}
            </button>
          )}
          <div className="text-xs text-primary font-medium tracking-widest uppercase">BPM</div>
        </div>
        <button
          type="button"
          onClick={() => adjustBpm(1)}
          className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          <Icon name="add" className="text-lg" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Tempo
        </h3>
        <span className="text-xs text-slate-400 italic">{getTempoLabel(bpm)}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => adjustBpm(-5)}
          className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          <Icon name="remove" className="text-xl" />
        </button>

        <div className="flex flex-col items-center">
          {editing ? (
            <input
              ref={inputRef}
              className="w-24 text-center text-4xl font-bold bg-transparent border-b-2 border-primary outline-none"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setInputVal(String(bpm))
                setEditing(true)
              }}
              className="text-5xl font-bold hover:text-primary transition-colors leading-none"
            >
              {bpm}
            </button>
          )}
          <span className="text-xs text-primary font-bold tracking-[0.3em] uppercase mt-1">BPM</span>
        </div>

        <button
          type="button"
          onClick={() => adjustBpm(5)}
          className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          <Icon name="add" className="text-xl" />
        </button>
      </div>

      <div className="relative">
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
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>20</span>
          <span>160</span>
          <span>300</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onPointerDown={tap}
          className="flex-1 bg-slate-100 dark:bg-primary/10 hover:bg-slate-200 dark:hover:bg-primary/20 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-lg transition-colors text-sm uppercase tracking-wider select-none"
        >
          Tap Tempo
        </button>

        <div className="flex gap-1">
          {[60, 80, 100, 120, 140, 160].map((preset) => (
            <button
              key={preset}
              onClick={() => setBpm(preset)}
              className={`px-2 py-2 rounded-lg text-xs font-bold transition-colors ${
                bpm === preset
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-primary/5 hover:bg-primary/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
