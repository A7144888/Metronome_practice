import { useMetronomeStore } from '../store/metronomeStore'
import { useMetronome } from '../hooks/useMetronome'
import { isBeatFull } from '../engine/musicTheory'
import Icon from './Icon'

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function PlaybackControls({ compact = false }) {
  const { isPlaying, elapsedTime, measureCount, timeSignature, measures } = useMetronomeStore()
  const { play, stop, pause } = useMetronome()

  const allBeatsFull = measures.every((m) =>
    m.beats.every((b) => isBeatFull(b, timeSignature.noteValue))
  )
  const canPlay = isPlaying || allBeatsFull

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={stop}
          className="size-10 rounded-full bg-md-surface-low flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-low/80 active:scale-95 transition-all duration-300 ease-md3"
        >
          <Icon name="stop" className="text-xl" />
        </button>
        <button
          onClick={isPlaying ? pause : play}
          disabled={!canPlay}
          title={!canPlay ? 'Every beat must be exactly full before playing' : (isPlaying ? 'Pause' : 'Play')}
          className={`size-14 rounded-full flex items-center justify-center text-white shadow-md3-3 transition-all duration-300 ease-md3 ${
            canPlay ? 'bg-md-primary hover:bg-md-primary/90 active:scale-95' : 'bg-md-outline/40 cursor-not-allowed opacity-60'
          }`}
        >
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="text-3xl" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={isPlaying ? pause : play}
          disabled={!canPlay}
          title={!canPlay ? 'Every beat must be exactly full before playing' : (isPlaying ? 'Pause' : 'Play')}
          className={`size-20 rounded-full flex items-center justify-center text-white shadow-md3-4 transition-all duration-300 ease-md3 ${
            canPlay ? 'bg-md-primary hover:bg-md-primary/90 active:scale-90' : 'bg-md-outline/40 cursor-not-allowed opacity-60'
          }`}
        >
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="text-5xl" />
        </button>

        <button
          type="button"
          onClick={stop}
          className="size-14 rounded-full bg-md-surface-low flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-low/80 active:scale-95 transition-all duration-300 ease-md3"
          title="Stop"
        >
          <Icon name="stop" className="text-2xl" />
        </button>
      </div>

      {!canPlay && (
        <p className="text-[11px] text-md-error text-center -mt-1">
          Fill every beat exactly before playing
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center border-t border-md-outline/20 pt-3 mt-1">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-md-on-surface-variant/70 font-medium">Time Sig</p>
          <p className="text-lg font-medium text-md-fg">{timeSignature.beats}/{timeSignature.noteValue}</p>
        </div>
        <div className="border-x border-md-outline/20">
          <p className="text-[10px] uppercase tracking-widest text-md-on-surface-variant/70 font-medium">Measure</p>
          <p className="text-lg font-medium text-md-fg">{measureCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-md-on-surface-variant/70 font-medium">Timer</p>
          <p className="text-lg font-medium text-md-fg">{formatTime(elapsedTime)}</p>
        </div>
      </div>
    </div>
  )
}
