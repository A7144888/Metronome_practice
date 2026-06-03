import { useMetronomeStore, ACCENT_TYPES } from '../store/metronomeStore'
import {
  NOTE_VALUES,
  NOTE_SYMBOLS,
  NOTE_SHORT_LABELS,
  TICKS_PER_QUARTER,
  validateBeat,
  subdivDurationTicks,
  beatCapacityTicks,
  beatUsedTicks,
} from '../engine/musicTheory'
import Icon from './Icon'

const ACCENT_CONFIG = {
  strong: { label: 'S', ring: 'ring-md-primary',    bg: 'bg-md-primary',       text: 'text-white',                dot: 'bg-md-primary' },
  medium: { label: 'M', ring: 'ring-md-tertiary',   bg: 'bg-md-tertiary',      text: 'text-white',                dot: 'bg-md-tertiary' },
  normal: { label: 'N', ring: 'ring-md-outline',    bg: 'bg-md-outline',       text: 'text-white',                dot: 'bg-md-outline' },
  none:   { label: 'P', ring: 'ring-md-outline/40', bg: 'bg-transparent',      text: 'text-md-on-surface-variant', dot: 'bg-transparent border border-md-outline' },
}

const ACCENT_DISPLAY_NAME = {
  strong: 'Strong',
  medium: 'Medium',
  normal: 'Normal',
  none:   'Pause',
}

function BeatCapacityBar({ beat, noteValue }) {
  const info    = validateBeat(beat, noteValue)
  const pct     = Math.min(100, info.percentFilled)
  const overflow = info.overflow
  const exact   = info.exact

  let barColor  = 'bg-md-primary/60'
  if (overflow) barColor = 'bg-md-error'
  else if (exact) barColor = 'bg-emerald-500'

  let statusText = `${info.used} / ${info.capacity}\u03C4`
  if (exact)    statusText = 'Beat full \u2713'
  if (overflow) statusText = `Overflow by ${Math.abs(info.remaining)}\u03C4`

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-md-surface-low rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-[10px] font-mono whitespace-nowrap ${
          overflow ? 'text-md-error' : exact ? 'text-emerald-600' : 'text-md-on-surface-variant/70'
        }`}
      >
        {statusText}
      </span>
    </div>
  )
}

function NoteValuePicker({ sd, measureId, beatId, beat, noteValue, store }) {
  const cap       = beatCapacityTicks(noteValue)
  const carryOver = beat.carryOver ?? 0

  return (
    <div className="flex flex-wrap gap-1">
      {NOTE_VALUES.map((nv) => {
        const dur        = subdivDurationTicks({ value: nv, dotted: sd.dotted })
        const otherUsed  = beatUsedTicks(beat.subdivisions.filter((x) => x.id !== sd.id))
        const wouldOver  = otherUsed + dur + carryOver > cap
        const isActive   = sd.value === nv

        return (
          <button
            key={nv}
            disabled={wouldOver && !isActive}
            onClick={() => store.setSubdivisionValue(measureId, beatId, sd.id, nv)}
            title={nv}
            className={`
              px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ease-md3 active:scale-95
              ${isActive
                ? 'bg-md-primary text-white shadow-md3-1'
                : wouldOver
                ? 'bg-transparent text-md-on-surface-variant/30 cursor-not-allowed opacity-40'
                : 'bg-md-surface-low hover:bg-md-primary/10 text-md-on-surface-variant cursor-pointer'
              }
            `}
          >
            {NOTE_SHORT_LABELS[nv]}
          </button>
        )
      })}
    </div>
  )
}

function NoteCard({ sd, sdIdx, totalSubs, measureId, beatId, beat, noteValue, store, isCurrentlyPlaying }) {
  const accent  = sd.accent || 'normal'
  const acfg    = ACCENT_CONFIG[accent] || ACCENT_CONFIG.normal
  const dur     = subdivDurationTicks(sd)
  const cap     = beatCapacityTicks(noteValue)
  const carryOver = beat.carryOver ?? 0

  const canTie  = sdIdx < totalSubs - 1
  const canDot  = (() => {
    const otherUsed  = beatUsedTicks(beat.subdivisions.filter((x) => x.id !== sd.id))
    const dottedTicks = subdivDurationTicks({ value: sd.value, dotted: true })
    return !sd.dotted || otherUsed + dottedTicks + carryOver <= cap
  })()

  return (
    <div
      className={`
        relative flex flex-col gap-2 p-3 rounded-lg border transition-all duration-300 ease-md3
        ${isCurrentlyPlaying
          ? 'border-md-primary bg-md-primary/10 shadow-glow'
          : 'border-md-outline/20 bg-md-surface hover:border-md-outline/40 hover:shadow-md3-1'
        }
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none select-none text-md-fg" title={sd.value}>
            {NOTE_SYMBOLS[sd.value] || '♩'}
            {sd.dotted && <span className="text-md-tertiary text-lg">•</span>}
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-medium leading-tight text-md-fg">
              {sd.value.charAt(0).toUpperCase() + sd.value.slice(1)}
              {sd.dotted && ' (Dotted)'}
            </span>
            <span className="text-[10px] text-md-on-surface-variant/60 font-mono">
              {`${dur}\u03C4 / ${TICKS_PER_QUARTER}\u03C4`}
            </span>
          </div>
        </div>
        {totalSubs > 1 && (
          <button
            onClick={() => store.removeSubdivision(measureId, beatId, sd.id)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-md-on-surface-variant hover:text-md-error hover:bg-md-error/10 transition-all duration-200 shrink-0"
          >
            <Icon name="close" className="text-sm" />
          </button>
        )}
      </div>

      <NoteValuePicker
        sd={sd}
        measureId={measureId}
        beatId={beatId}
        beat={beat}
        noteValue={noteValue}
        store={store}
      />

      <div className="flex items-center gap-2 pt-1 border-t border-md-outline/15">
        <button
          onClick={() => {
            const idx  = ACCENT_TYPES.indexOf(accent)
            const next = ACCENT_TYPES[(idx + 1) % ACCENT_TYPES.length]
            store.updateSubdivision(measureId, beatId, sd.id, { accent: next })
          }}
          className={`
            flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-300 ease-md3 active:scale-95
            ring-1 ${acfg.ring} ${acfg.bg} ${acfg.text}
          `}
          title={`Accent: ${ACCENT_DISPLAY_NAME[accent] ?? accent}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${acfg.dot}`} />
          {(ACCENT_DISPLAY_NAME[accent] ?? accent).toUpperCase()}
        </button>

        <button
          onClick={() => store.toggleDotted(measureId, beatId, sd.id)}
          disabled={!canDot && !sd.dotted}
          className={`
            flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-300 ease-md3 active:scale-95
            ${sd.dotted
              ? 'bg-md-tertiary text-white'
              : canDot
              ? 'bg-transparent border border-md-outline/40 text-md-on-surface-variant hover:border-md-tertiary hover:text-md-tertiary'
              : 'bg-transparent border border-md-outline/20 text-md-on-surface-variant/30 cursor-not-allowed opacity-40'
            }
          `}
          title={sd.dotted ? 'Remove dot (\u00f71.5)' : 'Add dot (\u00d71.5)'}
        >
          &bull;&nbsp;DOT
        </button>

        <button
          onClick={() => canTie && store.toggleTie(measureId, beatId, sd.id)}
          disabled={!canTie}
          className={`
            flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-300 ease-md3 active:scale-95
            ${sd.tie
              ? 'bg-sky-500 text-white'
              : canTie
              ? 'bg-transparent border border-md-outline/40 text-md-on-surface-variant hover:border-sky-500 hover:text-sky-500'
              : 'bg-transparent border border-md-outline/20 text-md-on-surface-variant/30 cursor-not-allowed opacity-40'
            }
          `}
          title={
            !canTie
              ? 'Tie requires a next note'
              : sd.tie
              ? 'Remove tie'
              : 'Tie to next note (no re-attack)'
          }
        >
          {'\u2322\u00A0TIE'}
        </button>
      </div>

      {sd.tie && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-sky-400 text-xl pointer-events-none select-none">
          {'\u2322'}
        </div>
      )}
    </div>
  )
}

function BeatRow({ measure, beat, beatIdx, currentBeat, currentSubdiv, isPlaying, timeSignature }) {
  const store        = useMetronomeStore()
  const { noteValue } = timeSignature
  const isActiveBeat = isPlaying && currentBeat === beatIdx

  return (
    <div
      className={`
        rounded-lg border p-4 transition-all duration-300 ease-md3
        ${isActiveBeat
          ? 'border-md-primary/40 bg-md-primary/5 shadow-md3-1'
          : 'border-md-outline/15 bg-md-surface/50 hover:bg-md-surface'
        }
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`
              w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors duration-300
              ${isActiveBeat ? 'bg-md-primary border-md-primary text-white' : 'border-md-outline/40 text-md-on-surface-variant'}
            `}
          >
            {beatIdx + 1}
          </span>
          <span className="text-xs font-medium text-md-on-surface-variant/70 uppercase tracking-wider">
            Beat {beatIdx + 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BeatCapacityBar beat={beat} noteValue={noteValue} />
          <button
            onClick={() => store.addSubdivision(measure.id, beat.id)}
            className="flex items-center gap-1 text-[10px] text-md-primary hover:bg-md-primary/10 px-2 py-1 rounded-full transition-all duration-300 ease-md3 font-medium uppercase tracking-wider active:scale-95"
          >
            <Icon name="add" className="text-sm" />
            Add
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {beat.subdivisions.map((sd, sdIdx) => (
          <NoteCard
            key={sd.id}
            sd={sd}
            sdIdx={sdIdx}
            totalSubs={beat.subdivisions.length}
            measureId={measure.id}
            beatId={beat.id}
            beat={beat}
            noteValue={noteValue}
            store={store}
            isCurrentlyPlaying={isPlaying && currentBeat === beatIdx && currentSubdiv === sdIdx}
          />
        ))}
      </div>
    </div>
  )
}

export default function SubdivisionEditor() {
  const { measures, timeSignature, currentBeat, currentSubdivision, isPlaying } = useMetronomeStore()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-medium uppercase tracking-widest text-md-on-surface-variant">
          Beat Editor
        </h3>
        <div className="flex flex-wrap gap-3 text-[10px]">
          {[
            ['bg-md-primary',   'Strong'],
            ['bg-md-tertiary',  'Medium'],
            ['bg-md-outline',   'Normal'],
          ].map(([cls, label]) => (
            <span key={label} className="flex items-center gap-1 text-md-on-surface-variant/70">
              <span className={`w-2 h-2 rounded-full ${cls}`} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-md-tertiary">&bull;&nbsp;Dotted</span>
          <span className="flex items-center gap-1 text-sky-500">{'\u2322\u00A0Tied'}</span>
        </div>
      </div>

      {measures.map((measure) => (
        <div key={measure.id} className="flex flex-col gap-3">
          {measure.beats.map((beat, beatIdx) => (
            <BeatRow
              key={beat.id}
              measure={measure}
              beat={beat}
              beatIdx={beatIdx}
              currentBeat={currentBeat}
              currentSubdiv={currentSubdivision}
              isPlaying={isPlaying}
              timeSignature={timeSignature}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
