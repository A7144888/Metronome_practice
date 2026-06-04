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

export default function BpmControl({ compact = false, dock = false }) {
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
      <div className={`flex flex-col gap-2 ${dock ? 'w-full' : ''}`}>
        <div className={`flex items-center gap-3 ${dock ? 'justify-between w-full' : ''}`}>
          <button
            type="button"
            onClick={() => adjustBpm(-1)}
            className="w-10 h-10 rounded-full bg-md-secondary-container flex items-center justify-center text-md-primary hover:bg-md-secondary-container/80 active:scale-95 transition-all duration-300 ease-md3 shrink-0"
          >
            <Icon name="remove" className="text-xl" />
          </button>
          <div className="text-center flex-1 min-w-0">
            {editing ? (
              <input
                ref={inputRef}
                className="w-full max-w-[5rem] mx-auto block text-center text-2xl font-medium bg-transparent border-b-2 border-md-primary outline-none text-md-fg"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setInputVal(String(bpm))
                  setEditing(true)
                }}
                className="text-2xl font-medium hover:text-md-primary transition-colors duration-300 text-md-fg"
              >
                {bpm}
              </button>
            )}
            <div className="text-[10px] text-md-on-surface-variant/70 italic">{getTempoLabel(bpm)}</div>
          </div>
          <button
            type="button"
            onClick={() => adjustBpm(1)}
            className="w-10 h-10 rounded-full bg-md-secondary-container flex items-center justify-center text-md-primary hover:bg-md-secondary-container/80 active:scale-95 transition-all duration-300 ease-md3 shrink-0"
          >
            <Icon name="add" className="text-xl" />
          </button>
        </div>
        {dock && (
          <input
            type="range"
            min="20"
            max="300"
            step="1"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full h-2 rounded-full cursor-pointer touch-none"
            style={{
              background: `linear-gradient(to right, #6750A4 ${((bpm - 20) / 280) * 100}%, #E7E0EC ${((bpm - 20) / 280) * 100}%)`,
            }}
            aria-label="BPM slider"
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-widest text-md-on-surface-variant">
          Tempo
        </h3>
        <span className="text-xs text-md-on-surface-variant/70 italic">{getTempoLabel(bpm)}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => adjustBpm(-1)}
          className="size-10 rounded-full bg-md-secondary-container flex items-center justify-center text-md-primary hover:bg-md-secondary-container/80 active:scale-95 transition-all duration-300 ease-md3"
        >
          <Icon name="remove" className="text-xl" />
        </button>

        <div className="flex flex-col items-center">
          {editing ? (
            <input
              ref={inputRef}
              className="w-24 text-center text-4xl font-medium bg-transparent border-b-2 border-md-primary outline-none text-md-fg"
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
              className="text-4xl sm:text-5xl font-medium hover:text-md-primary transition-colors duration-300 leading-none text-md-fg"
            >
              {bpm}
            </button>
          )}
          <span className="text-xs text-md-primary font-medium tracking-[0.3em] uppercase mt-1">BPM</span>
        </div>

        <button
          type="button"
          onClick={() => adjustBpm(1)}
          className="size-10 rounded-full bg-md-secondary-container flex items-center justify-center text-md-primary hover:bg-md-secondary-container/80 active:scale-95 transition-all duration-300 ease-md3"
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
            background: `linear-gradient(to right, #6750A4 ${((bpm - 20) / 280) * 100}%, #E7E0EC ${((bpm - 20) / 280) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-md-on-surface-variant/60 mt-1">
          <span>20</span>
          <span>160</span>
          <span>300</span>
        </div>
      </div>

      <button
        onPointerDown={tap}
        className="w-full bg-md-secondary-container hover:bg-md-secondary-container/80 active:scale-95 text-md-on-secondary-container font-medium py-2.5 rounded-full transition-all duration-300 ease-md3 text-sm uppercase tracking-wider select-none"
      >
        Tap Tempo
      </button>
    </div>
  )
}
