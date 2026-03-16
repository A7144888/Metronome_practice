import { useMetronomeStore } from '../store/metronomeStore'
import { useMetronome } from '../hooks/useMetronome'
import Icon from './Icon'

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function PlaybackControls({ compact = false }) {
  const { isPlaying, elapsedTime, measureCount, timeSignature } = useMetronomeStore()
  const { play, stop, pause } = useMetronome()

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
          className="size-14 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
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
          onClick={stop}
          className="size-14 rounded-full bg-slate-200 dark:bg-primary/20 flex items-center justify-center text-slate-700 dark:text-primary active:scale-95 transition-transform"
          title="Stop"
        >
          <Icon name="stop" className="text-2xl" />
        </button>

        <button
          onClick={isPlaying ? pause : play}
          className="size-20 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40 active:scale-90 transition-all"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="text-5xl" />
        </button>

        <button
          onClick={() => { stop(); setTimeout(play, 50) }}
          className="size-14 rounded-full bg-slate-200 dark:bg-primary/20 flex items-center justify-center text-slate-700 dark:text-primary active:scale-95 transition-transform"
          title="Restart"
        >
          <Icon name="replay" className="text-2xl" />
        </button>
      </div>

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
