import { useEffect, useState } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'

export default function BeatIndicator() {
  const { currentBeat, timeSignature, isPlaying } = useMetronomeStore()
  const [flash, setFlash] = useState(-1)

  useEffect(() => {
    if (currentBeat >= 0) {
      setFlash(currentBeat)
      const t = setTimeout(() => setFlash(-1), 120)
      return () => clearTimeout(t)
    }
  }, [currentBeat])

  const beats = timeSignature.beats

  return (
    <div className="flex justify-center gap-3 flex-wrap">
      {Array.from({ length: beats }, (_, i) => {
        const active = flash === i
        const isFirst = i === 0
        return (
          <div
            key={i}
            className={`
              flex-1 max-w-[80px] h-20 rounded-xl flex items-center justify-center border-2 transition-all duration-75
              ${active
                ? isFirst
                  ? 'bg-primary border-primary shadow-glow text-white scale-105'
                  : 'bg-slate-600 border-slate-500 text-white scale-105'
                : 'bg-slate-200 dark:bg-primary/10 border-transparent text-slate-400 dark:text-slate-600'
              }
            `}
          >
            <span className="font-bold text-2xl">{i + 1}</span>
          </div>
        )
      })}
    </div>
  )
}
