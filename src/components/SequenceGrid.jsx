import { useMetronomeStore } from '../store/metronomeStore'
import {
  NOTE_SHORT_LABELS,
  NOTE_SYMBOLS,
  NOTE_HEAD_OPEN,
  subdivDurationTicks,
  beatCapacityTicks,
  measureCapacityTicks,
  relativeBeatCount,
} from '../engine/musicTheory'

const ACCENT_DISPLAY_NAME = {
  strong: 'strong',
  medium: 'medium',
  normal: 'normal',
  none:   'pause',
}

const ACCENT_GRID_COLORS = {
  strong: {
    active: 'bg-md-primary border-md-primary shadow-glow-sm',
    base: 'bg-md-primary/80 border-md-primary/80',
    inactive: 'bg-md-primary/20 border-md-primary/30',
  },
  medium: {
    active: 'bg-md-tertiary border-md-tertiary',
    base: 'bg-md-tertiary/70 border-md-tertiary/70',
    inactive: 'bg-md-tertiary/20 border-md-tertiary/30',
  },
  normal: {
    active: 'bg-md-outline border-md-outline',
    base: 'bg-md-outline/60 border-md-outline/60',
    inactive: 'bg-md-outline/20 border-md-outline/30',
  },
  none: {
    active: 'bg-md-surface-low/80 border-md-outline/40',
    base: 'bg-md-surface-low/50 border-md-outline/30',
    inactive: 'bg-md-surface-low/30 border-md-outline/20',
  },
}

export default function SequenceGrid() {
  const { measures, timeSignature, currentBeat, currentSubdivision, isPlaying, updateSubdivision } =
    useMetronomeStore()

  const { beats, noteValue } = timeSignature
  const beatCap  = beatCapacityTicks(noteValue)
  const measCap  = measureCapacityTicks(beats, noteValue)

  const allNotes = []
  measures.forEach((measure) => {
    let tickPos = 0
    measure.subdivisions.forEach((sd, sIdx) => {
      const dur     = subdivDurationTicks(sd)
      const beatIdx = Math.floor(tickPos / beatCap)
      allNotes.push({
        measureId: measure.id,
        sdId:      sd.id,
        sdIdx:     sIdx,
        beatIdx,
        accent:    sd.accent,
        value:     sd.value,
        dotted:    sd.dotted,
        tie:       sd.tie,
        dur,
        widthFraction: dur / measCap,
      })
      tickPos += dur
    })
  })

  const cycleAccent = (note) => {
    const order = ['strong', 'medium', 'normal', 'none']
    const next = order[(order.indexOf(note.accent) + 1) % order.length]
    updateSubdivision(note.measureId, note.sdId, { accent: next })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-medium text-md-fg">Sequence Grid</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2.5 py-1 bg-md-primary-container text-md-primary rounded-full uppercase font-medium">
            {allNotes.length} notes
          </span>
          <span className="px-2.5 py-1 bg-md-surface-low text-md-on-surface-variant rounded-full uppercase font-medium">
            {measures.length} bar{measures.length !== 1 ? 's' : ''} • {beats}/{noteValue}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {measures.map((measure) => (
          <div key={measure.id} className="flex flex-col gap-1">
            {/* Beat numbers row — left-aligned to match beat boundaries */}
            <div className="flex items-center gap-0.5 h-5 pl-7">
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

            {/* Notes row */}
            <div className="flex items-stretch gap-0 h-12 sm:h-14 overflow-x-auto custom-scrollbar min-w-0">
              <div className="w-5 sm:w-6 shrink-0" />
              <div className="flex-1 flex items-stretch gap-0.5 min-w-[180px]">
                {allNotes
                  .filter((n) => n.measureId === measure.id)
                  .map((note) => {
                    const isActive =
                      isPlaying && note.beatIdx === currentBeat && note.sdIdx === currentSubdivision
                    const colors = ACCENT_GRID_COLORS[note.accent] || ACCENT_GRID_COLORS.normal
                    const dynLabel = relativeBeatCount(note.value, note.dotted, noteValue)

                    return (
                      <button
                        key={note.sdId}
                        onClick={() => cycleAccent(note)}
                        title={`Beat ${note.beatIdx + 1} • ${note.value}${note.dotted ? ' dotted' : ''} • ${dynLabel} beat(s) • ${ACCENT_DISPLAY_NAME[note.accent] ?? note.accent}`}
                        style={{ flex: note.widthFraction }}
                        className={`
                          relative rounded-xs border flex flex-col items-center justify-center gap-0.5
                          text-[10px] font-medium transition-all duration-200 ease-md3 cursor-pointer overflow-hidden min-w-0 active:scale-95
                          ${isActive ? `${colors.active} scale-y-110` : `${colors.base} hover:opacity-90`}
                        `}
                      >
                        <span
                          className="leading-none"
                          style={{
                            fontSize: 22,
                            ...(NOTE_HEAD_OPEN.has(note.value)
                              ? { WebkitTextStroke: '1.5px rgba(255,255,255,0.9)', color: 'transparent' }
                              : { color: 'rgba(255,255,255,0.9)' }),
                          }}
                        >
                          {NOTE_SYMBOLS[note.value] || '♩'}
                          {note.value === 'triplet' && <sup className="text-amber-300" style={{ fontSize: 11, WebkitTextStroke: 'initial', color: '' }}>3</sup>}
                          {note.dotted && <span className="text-amber-300" style={{ fontSize: 13, WebkitTextStroke: 'initial', color: '' }}>•</span>}
                        </span>
                        <span className="text-white/70 leading-none" style={{ fontSize: 11 }}>
                          {dynLabel}
                        </span>
                        {note.tie && (
                          <span className="absolute right-0 top-0 text-sky-300 text-[8px] leading-none pr-0.5">
                            ⌢
                          </span>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-md-on-surface-variant/60 text-center">
        Cell width = note duration • Click to cycle accent: Strong → Medium → Normal → Pause
      </p>
    </div>
  )
}
