import { useEffect, useState } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'

export default function BeatIndicator({ fillHeight = false }) {
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
    <div className={`flex justify-center gap-2 sm:gap-3 min-w-0 overflow-x-auto custom-scrollbar px-1 ${fillHeight ? 'h-full' : ''}`}>
      {Array.from({ length: beats }, (_, i) => {
        const active = flash === i
        const isFirst = i === 0
        return (
          <div
            key={i}
            className={`
              flex-1 min-w-[44px] max-w-[72px] sm:max-w-[120px] rounded-lg flex items-center justify-center border-2 transition-all duration-100 ease-md3
              ${fillHeight ? 'h-full min-h-[3rem]' : 'h-16 sm:h-20'}
              ${active
                ? isFirst
                  ? 'bg-md-primary border-md-primary shadow-glow text-white scale-105'
                  : 'bg-md-on-surface-variant border-md-on-surface-variant text-white scale-105'
                : 'bg-md-surface border-md-surface-low text-md-on-surface-variant'
              }
            `}
          >
            <span className="font-medium text-xl sm:text-2xl">{i + 1}</span>
          </div>
        )
      })}
    </div>
  )
}
