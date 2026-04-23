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

  // Play is only allowed when every beat is exactly full — a partial beat
  // would schedule a shorter click than the user drew and drift the tempo.
  const allBeatsFull = measures.every((m) =>
    m.beats.every((b) => isBeatFull(b, timeSignature.noteValue))
  )
  const canPlay = isPlaying || allBeatsFull

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={stop}
          className="size-10 rounded-full bg-slate-200 dark:bg-primary/20 flex items-center justify-center text-slate-700 dark:text-primary hover:scale-105 transition-transform"
        >
          <Icon name="stop" className="text-xl" />
        </button>
        <button
          onClick={isPlaying ? pause : play}
          disabled={!canPlay}
          title={!canPlay ? 'Every beat must be exactly full before playing' : (isPlaying ? 'Pause' : 'Play')}
          className={`size-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform ${
            canPlay ? 'bg-primary shadow-primary/30 hover:scale-105' : 'bg-slate-600/60 cursor-not-allowed opacity-60'
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
          className={`size-20 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${
            canPlay ? 'bg-primary shadow-primary/40 active:scale-90' : 'bg-slate-600/60 cursor-not-allowed opacity-60'
          }`}
        >
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="text-5xl" />
        </button>

        <button
          type="button"
          onClick={stop}
          className="size-14 rounded-full bg-slate-200 dark:bg-primary/20 flex items-center justify-center text-slate-700 dark:text-primary active:scale-95 transition-transform"
          title="Stop"
        >
          <Icon name="stop" className="text-2xl" />
        </button>
      </div>

      {!canPlay && (
        <p className="text-[11px] text-amber-400 text-center -mt-1">
          Fill every beat exactly before playing
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-200 dark:border-primary/10 pt-3 mt-1">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Time Sig</p>
          <p className="text-lg font-bold">{timeSignature.beats}/{timeSignature.noteValue}</p>
        </div>
        <div className="border-x border-slate-200 dark:border-primary/10">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Measure</p>
          <p className="text-lg font-bold">{measureCount}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Timer</p>
          <p className="text-lg font-bold">{formatTime(elapsedTime)}</p>
        </div>
      </div>
    </div>
  )
}
