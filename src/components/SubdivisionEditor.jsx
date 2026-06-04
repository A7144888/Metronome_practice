import { useMetronomeStore, ACCENT_TYPES } from '../store/metronomeStore'
import {
  NOTE_VALUES,
  NOTE_SYMBOLS,
  NOTE_SHORT_LABELS,
  NOTE_HEAD_OPEN,
  validateMeasure,
  subdivDurationTicks,
  beatCapacityTicks,
  measureCapacityTicks,
  measureUsedTicks,
  relativeBeatCount,
  hasBinaryTernaryConflict,
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

function MeasureCapacityBar({ measure, beats, noteValue }) {
  const info     = validateMeasure(measure, beats, noteValue)
  const pct      = Math.min(100, info.percentFilled)
  const overflow = info.overflow
  const exact    = info.exact

  let barColor = 'bg-md-primary/60'
  if (overflow) barColor = 'bg-md-error'
  else if (exact) barColor = 'bg-emerald-500'

  let statusText = `${info.used} / ${info.capacity}\u03C4`
  if (exact)    statusText = 'Measure full \u2713'
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

function NoteValuePicker({ sd, measureId, measure, timeSignature, store }) {
  const { beats, noteValue } = timeSignature
  const cap = measureCapacityTicks(beats, noteValue)

  return (
    <div className="flex flex-wrap gap-1">
      {NOTE_VALUES.map((nv) => {
        const otherSubs = measure.subdivisions.filter((x) => x.id !== sd.id)
        const dur       = subdivDurationTicks({ value: nv, dotted: nv === 'triplet' ? false : sd.dotted })
        const otherUsed = measureUsedTicks(otherSubs)
        const wouldOver = otherUsed + dur > cap
        const conflict  = hasBinaryTernaryConflict(otherSubs, nv)
        const isActive  = sd.value === nv

        return (
          <button
            key={nv}
            disabled={(wouldOver || conflict) && !isActive}
            onClick={() => store.setSubdivisionValue(measureId, sd.id, nv)}
            title={`${nv} — ${relativeBeatCount(nv, nv === 'triplet' ? false : sd.dotted, noteValue)} beat(s)`}
            className={`
              px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ease-md3 active:scale-95
              ${isActive
                ? 'bg-md-primary text-white shadow-md3-1'
                : wouldOver || conflict
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

function NoteCard({ sd, sdIdx, totalSubs, measureId, measure, timeSignature, store, beatIdx, isCurrentlyPlaying }) {
  const { beats, noteValue } = timeSignature
  const accent   = sd.accent || 'normal'
  const acfg     = ACCENT_CONFIG[accent] || ACCENT_CONFIG.normal
  const dur      = subdivDurationTicks(sd)
  const cap      = measureCapacityTicks(beats, noteValue)

  const canTie   = sdIdx < totalSubs - 1
  const canDot   = (() => {
    if (sd.value === 'triplet') return false
    const otherUsed   = measureUsedTicks(measure.subdivisions.filter((x) => x.id !== sd.id))
    const dottedTicks = subdivDurationTicks({ value: sd.value, dotted: true })
    return !sd.dotted || otherUsed + dottedTicks <= cap
  })()

  const beatLabel = relativeBeatCount(sd.value, sd.dotted, noteValue)

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
          <span
            className="text-2xl leading-none select-none text-md-fg"
            title={sd.value}
            style={NOTE_HEAD_OPEN.has(sd.value) ? { WebkitTextStroke: '1.5px currentColor', color: 'transparent' } : undefined}
          >
            {NOTE_SYMBOLS[sd.value] || '♩'}
            {sd.dotted && <span className="text-md-tertiary text-lg" style={{ WebkitTextStroke: 'initial', color: '' }}>•</span>}
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-medium leading-tight text-md-fg">
              {sd.value.charAt(0).toUpperCase() + sd.value.slice(1)}
              {sd.dotted && ' (Dotted)'}
            </span>
            <span className="text-[10px] text-md-on-surface-variant/60 font-mono">
              {beatLabel} beat{beatLabel !== '1' ? 's' : ''} · beat {beatIdx + 1}
            </span>
          </div>
        </div>
        {totalSubs > 1 && (
          <button
            onClick={() => store.removeSubdivision(measureId, sd.id)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-md-on-surface-variant hover:text-md-error hover:bg-md-error/10 transition-all duration-200 shrink-0"
          >
            <Icon name="close" className="text-sm" />
          </button>
        )}
      </div>

      <NoteValuePicker
        sd={sd}
        measureId={measureId}
        measure={measure}
        timeSignature={timeSignature}
        store={store}
      />

      <div className="flex items-center gap-2 pt-1 border-t border-md-outline/15">
        <button
          onClick={() => {
            const idx  = ACCENT_TYPES.indexOf(accent)
            const next = ACCENT_TYPES[(idx + 1) % ACCENT_TYPES.length]
            store.updateSubdivision(measureId, sd.id, { accent: next })
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
          onClick={() => store.toggleDotted(measureId, sd.id)}
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
          onClick={() => canTie && store.toggleTie(measureId, sd.id)}
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

export default function SubdivisionEditor() {
  const store = useMetronomeStore()
  const { measures, timeSignature, currentBeat, currentSubdivision, isPlaying } = store
  const { beats, noteValue } = timeSignature
  const beatCap = beatCapacityTicks(noteValue)

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

      {measures.map((measure) => {
        let tickPos = 0

        return (
          <div key={measure.id} className="flex flex-col gap-3">
            <MeasureCapacityBar measure={measure} beats={beats} noteValue={noteValue} />

            <div className="flex flex-wrap gap-3">
              {measure.subdivisions.map((sd, sdIdx) => {
                const sdBeatIdx = Math.floor(tickPos / beatCap)
                const isActive  = isPlaying && currentBeat === sdBeatIdx && currentSubdivision === sdIdx
                tickPos += subdivDurationTicks(sd)

                return (
                  <NoteCard
                    key={sd.id}
                    sd={sd}
                    sdIdx={sdIdx}
                    totalSubs={measure.subdivisions.length}
                    measureId={measure.id}
                    measure={measure}
                    timeSignature={timeSignature}
                    store={store}
                    beatIdx={sdBeatIdx}
                    isCurrentlyPlaying={isActive}
                  />
                )
              })}
            </div>

            <button
              onClick={() => store.addSubdivision(measure.id)}
              className="self-start flex items-center gap-1 text-[10px] text-md-primary hover:bg-md-primary/10 px-3 py-1.5 rounded-full transition-all duration-300 ease-md3 font-medium uppercase tracking-wider active:scale-95 border border-md-primary/30"
            >
              <Icon name="add" className="text-sm" />
              Add Note
            </button>
          </div>
        )
      })}
    </div>
  )
}
