import { useMetronomeStore } from '../store/metronomeStore'
import { NOTE_SHORT_LABELS, NOTE_SYMBOLS, subdivDurationTicks, beatCapacityTicks } from '../engine/musicTheory'

const ACCENT_GRID_COLORS = {
  strong: {
    active: 'bg-primary border-primary shadow-glow-sm',
    base: 'bg-primary/80 border-primary/80',
    inactive: 'bg-primary/20 border-primary/30',
  },
  medium: {
    active: 'bg-orange-500 border-orange-500',
    base: 'bg-orange-500/70 border-orange-500/70',
    inactive: 'bg-orange-500/20 border-orange-500/30',
  },
  normal: {
    active: 'bg-slate-500 border-slate-500',
    base: 'bg-slate-500/60 border-slate-500/60',
    inactive: 'bg-slate-500/20 border-slate-500/30',
  },
  none: {
    active: 'bg-slate-700/60 border-slate-600/60',
    base: 'bg-slate-800/40 border-slate-700/40',
    inactive: 'bg-slate-800/20 border-slate-700/20',
  },
}

export default function SequenceGrid() {
  const { measures, timeSignature, currentBeat, currentSubdivision, isPlaying, updateSubdivision } =
    useMetronomeStore()

  // Flatten all notes to a display list with width proportional to duration
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
          widthFraction: dur / beatCap,  // fraction of one beat width
        })
      })
    })
  })

  const cycleAccent = (note) => {
    const order = ['strong', 'medium', 'normal', 'none']
    const next = order[(order.indexOf(note.accent) + 1) % order.length]
    updateSubdivision(note.measureId, note.beatId, note.sdId, { accent: next })
  }

  const totalBeats = measures.reduce((s, m) => s + m.beats.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">Sequence Grid</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-primary/20 text-primary rounded uppercase font-bold">
            {allNotes.length} notes
          </span>
          <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded uppercase font-bold">
            {measures.length} bar{measures.length !== 1 ? 's' : ''} • {timeSignature.beats}/{timeSignature.noteValue}
          </span>
        </div>
      </div>

      {/* Proportional grid — width reflects note duration */}
      <div className="flex flex-col gap-2">
        {measures.map((measure) => (
          <div key={measure.id} className="flex flex-col gap-1">
            {measure.beats.map((beat, bIdx) => {
              const beatNotes = allNotes.filter((n) => n.beatIdx === bIdx)
              return (
                <div key={beat.id} className="flex items-stretch gap-1 h-14">
                  {/* Beat label */}
                  <div
                    className={`
                      w-6 flex items-center justify-center text-[10px] font-bold rounded shrink-0
                      ${isPlaying && currentBeat === bIdx
                        ? 'bg-primary text-white'
                        : 'text-slate-500 bg-slate-800/30'
                      }
                    `}
                  >
                    {bIdx + 1}
                  </div>

                  {/* Note cells proportional to duration */}
                  <div className="flex-1 flex items-stretch gap-0.5">
                    {beatNotes.map((note) => {
                      const isActive =
                        isPlaying && note.beatIdx === currentBeat && note.sdIdx === currentSubdivision
                      const colors = ACCENT_GRID_COLORS[note.accent] || ACCENT_GRID_COLORS.normal

                      return (
                        <button
                          key={note.sdId}
                          onClick={() => cycleAccent(note)}
                          title={`Beat ${note.beatIdx + 1} • ${note.value}${note.dotted ? ' dotted' : ''} • ${note.accent}`}
                          style={{ flex: note.widthFraction }}
                          className={`
                            relative rounded border flex flex-col items-center justify-center gap-0.5
                            text-[10px] font-bold transition-all cursor-pointer overflow-hidden min-w-0
                            ${isActive ? `${colors.active} scale-y-110` : `${colors.base} hover:opacity-90`}
                          `}
                        >
                          {/* Note symbol */}
                          <span className="text-white/90 leading-none text-sm">
                            {NOTE_SYMBOLS[note.value] || '♩'}
                            {note.dotted && <span className="text-amber-300 text-xs">•</span>}
                          </span>
                          {/* Value label */}
                          <span className="text-white/70 leading-none text-[9px] hidden sm:block">
                            {NOTE_SHORT_LABELS[note.value]}
                          </span>
                          {/* Tie indicator */}
                          {note.tie && (
                            <span className="absolute right-0 top-0 text-sky-300 text-[8px] leading-none pr-0.5">
                              ⌢
                            </span>
                          )}
                          {/* Beat number on first note */}
                          {note.sdIdx === 0 && (
                            <span className="absolute bottom-0.5 left-0.5 text-white/50 text-[8px] font-bold">
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

      <p className="text-[10px] text-slate-500 text-center">
        Cell width = note duration • Click to cycle accent: Strong → Medium → Normal → None
      </p>
    </div>
  )
}
