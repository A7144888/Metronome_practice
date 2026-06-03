import { useMetronomeStore } from '../store/metronomeStore'
import { NOTE_SHORT_LABELS, NOTE_SYMBOLS, subdivDurationTicks, beatCapacityTicks } from '../engine/musicTheory'

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

  const beatCap = beatCapacityTicks(timeSignature.noteValue)

  const allNotes = []
  measures.forEach((measure) => {
    measure.beats.forEach((beat, bIdx) => {
      beat.subdivisions.forEach((sd, sIdx) => {
        const dur = subdivDurationTicks(sd)
        allNotes.push({
          measureId: measure.id,
          beatId: beat.id,
          sdId: sd.id,
          beatIdx: bIdx,
          sdIdx: sIdx,
          accent: sd.accent,
          value: sd.value,
          dotted: sd.dotted,
          tie: sd.tie,
          dur,
          widthFraction: dur / beatCap,
        })
      })
    })
  })

  const cycleAccent = (note) => {
    const order = ['strong', 'medium', 'normal', 'none']
    const next = order[(order.indexOf(note.accent) + 1) % order.length]
    updateSubdivision(note.measureId, note.beatId, note.sdId, { accent: next })
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
            {measures.length} bar{measures.length !== 1 ? 's' : ''} • {timeSignature.beats}/{timeSignature.noteValue}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {measures.map((measure) => (
          <div key={measure.id} className="flex flex-col gap-1">
            {measure.beats.map((beat, bIdx) => {
              const beatNotes = allNotes.filter((n) => n.beatIdx === bIdx)
              return (
                <div key={beat.id} className="flex items-stretch gap-1 h-14">
                  <div
                    className={`
                      w-6 flex items-center justify-center text-[10px] font-medium rounded-xs shrink-0
                      ${isPlaying && currentBeat === bIdx
                        ? 'bg-md-primary text-white'
                        : 'text-md-on-surface-variant bg-md-surface-low/50'
                      }
                    `}
                  >
                    {bIdx + 1}
                  </div>

                  <div className="flex-1 flex items-stretch gap-0.5">
                    {beatNotes.map((note) => {
                      const isActive =
                        isPlaying && note.beatIdx === currentBeat && note.sdIdx === currentSubdivision
                      const colors = ACCENT_GRID_COLORS[note.accent] || ACCENT_GRID_COLORS.normal

                      return (
                        <button
                          key={note.sdId}
                          onClick={() => cycleAccent(note)}
                          title={`Beat ${note.beatIdx + 1} • ${note.value}${note.dotted ? ' dotted' : ''} • ${ACCENT_DISPLAY_NAME[note.accent] ?? note.accent}`}
                          style={{ flex: note.widthFraction }}
                          className={`
                            relative rounded-xs border flex flex-col items-center justify-center gap-0.5
                            text-[10px] font-medium transition-all duration-200 ease-md3 cursor-pointer overflow-hidden min-w-0 active:scale-95
                            ${isActive ? `${colors.active} scale-y-110` : `${colors.base} hover:opacity-90`}
                          `}
                        >
                          <span className="text-white/90 leading-none text-sm">
                            {NOTE_SYMBOLS[note.value] || '♩'}
                            {note.dotted && <span className="text-amber-300 text-xs">•</span>}
                          </span>
                          <span className="text-white/70 leading-none text-[9px] hidden sm:block">
                            {NOTE_SHORT_LABELS[note.value]}
                          </span>
                          {note.tie && (
                            <span className="absolute right-0 top-0 text-sky-300 text-[8px] leading-none pr-0.5">
                              ⌢
                            </span>
                          )}
                          {note.sdIdx === 0 && (
                            <span className="absolute bottom-0.5 left-0.5 text-white/50 text-[8px] font-medium">
                              {note.beatIdx + 1}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-md-on-surface-variant/60 text-center">
        Cell width = note duration • Click to cycle accent: Strong → Medium → Normal → Pause
      </p>
    </div>
  )
}
