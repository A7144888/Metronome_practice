import { useMetronomeStore, ACCENT_TYPES } from '../store/metronomeStore'
import {
  NOTE_VALUES,
  NOTE_SYMBOLS,
  NOTE_SHORT_LABELS,
  validateBeat,
  subdivDurationQNB,
  beatCapacityQNB,
  beatUsedQNB,
  roundQNB,
} from '../engine/musicTheory'
import Icon from './Icon'

// ─── Accent config ─────────────────────────────────────────────────────────

const ACCENT_CONFIG = {
  strong: { label: 'S', ring: 'ring-primary', bg: 'bg-primary', text: 'text-white', dot: 'bg-primary' },
  medium: { label: 'M', ring: 'ring-orange-500', bg: 'bg-orange-500', text: 'text-white', dot: 'bg-orange-500' },
  normal: { label: 'N', ring: 'ring-slate-500', bg: 'bg-slate-500', text: 'text-white', dot: 'bg-slate-500' },
  none:   { label: '–', ring: 'ring-slate-600', bg: 'bg-transparent', text: 'text-slate-400', dot: 'bg-transparent border border-slate-500' },
}

// ─── Beat capacity bar ─────────────────────────────────────────────────────

function BeatCapacityBar({ beat, noteValue }) {
  const info = validateBeat(beat, noteValue)
  const pct = Math.min(100, info.percentFilled)
  const overflow = info.overflow
  const exact = info.exact

  let barColor = 'bg-primary/60'
  if (overflow) barColor = 'bg-red-500'
  else if (exact) barColor = 'bg-green-500'

  let statusText = `${roundQNB(info.used)} / ${info.capacity} beats used`
  if (exact) statusText = 'Beat full ✓'
  if (overflow) statusText = `Overflow by ${roundQNB(Math.abs(info.remaining))} beats`

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-[10px] font-mono whitespace-nowrap ${
          overflow ? 'text-red-400' : exact ? 'text-green-400' : 'text-slate-400'
        }`}
      >
        {statusText}
      </span>
    </div>
  )
}

// ─── Note value pill selector ──────────────────────────────────────────────

function NoteValuePicker({ sd, measureId, beatId, beat, noteValue, store }) {
  const cap = beatCapacityQNB(noteValue)

  return (
    <div className="flex flex-wrap gap-1">
      {NOTE_VALUES.map((nv) => {
        const dur = subdivDurationQNB({ value: nv, dotted: sd.dotted })
        const otherUsed = beatUsedQNB(beat.subdivisions.filter((x) => x.id !== sd.id))
        const wouldOverflow = roundQNB(otherUsed + dur) > cap + 1 / 128
        const isActive = sd.value === nv

        return (
          <button
            key={nv}
            disabled={wouldOverflow && !isActive}
            onClick={() => store.setSubdivisionValue(measureId, beatId, sd.id, nv)}
            title={nv}
            className={`
              px-2 py-1 rounded text-xs font-bold transition-all border
              ${isActive
                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                : wouldOverflow
                ? 'bg-transparent border-slate-700 text-slate-600 cursor-not-allowed opacity-40'
                : 'bg-slate-800 border-slate-700 hover:border-primary/50 hover:text-primary text-slate-300 cursor-pointer'
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

// ─── Single note card ──────────────────────────────────────────────────────

function NoteCard({ sd, sdIdx, totalSubs, measureId, beatId, beat, noteValue, store, isCurrentlyPlaying }) {
  const accent = sd.accent || 'normal'
  const acfg = ACCENT_CONFIG[accent] || ACCENT_CONFIG.normal

  const dur = subdivDurationQNB(sd)

  const canTie = sdIdx < totalSubs - 1
  const canDot = (() => {
    const cap = beatCapacityQNB(noteValue)
    const otherUsed = beatUsedQNB(beat.subdivisions.filter((x) => x.id !== sd.id))
    const dottedDur = subdivDurationQNB({ value: sd.value, dotted: true })
    return !sd.dotted || roundQNB(otherUsed + dottedDur) <= cap + 1 / 128
  })()

  return (
    <div
      className={`
        relative flex flex-col gap-2 p-3 rounded-xl border transition-all
        ${isCurrentlyPlaying
          ? 'border-primary bg-primary/10 shadow-glow'
          : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-600'
        }
      `}
    >
      {/* Top row: note symbol + duration + delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none select-none" title={sd.value}>
            {NOTE_SYMBOLS[sd.value] || '♩'}
            {sd.dotted && <span className="text-primary text-lg">•</span>}
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-tight">
              {sd.value.charAt(0).toUpperCase() + sd.value.slice(1)}
              {sd.dotted && ' (Dotted)'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{dur} QNB</span>
          </div>
        </div>
        {totalSubs > 1 && (
          <button
            onClick={() => store.removeSubdivision(measureId, beatId, sd.id)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-900/30 transition-all shrink-0"
          >
            <Icon name="close" className="text-sm" />
          </button>
        )}
      </div>

      {/* Note value picker */}
      <NoteValuePicker
        sd={sd}
        measureId={measureId}
        beatId={beatId}
        beat={beat}
        noteValue={noteValue}
        store={store}
      />

      {/* Bottom row: Accent + Dotted + Tie */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-700/40">
        {/* Accent cycler */}
        <button
          onClick={() => {
            const idx = ACCENT_TYPES.indexOf(accent)
            const next = ACCENT_TYPES[(idx + 1) % ACCENT_TYPES.length]
            store.updateSubdivision(measureId, beatId, sd.id, { accent: next })
          }}
          className={`
            flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all
            ring-1 ${acfg.ring} ${acfg.bg} ${acfg.text}
          `}
          title={`Accent: ${accent}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${acfg.dot}`} />
          {accent.toUpperCase()}
        </button>

        {/* Dotted toggle */}
        <button
          onClick={() => store.toggleDotted(measureId, beatId, sd.id)}
          disabled={!canDot && !sd.dotted}
          className={`
            flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all
            ${sd.dotted
              ? 'bg-amber-500 border-amber-500 text-white'
              : canDot
              ? 'bg-transparent border-slate-600 text-slate-400 hover:border-amber-500 hover:text-amber-400'
              : 'bg-transparent border-slate-700 text-slate-600 cursor-not-allowed opacity-40'
            }
          `}
          title={sd.dotted ? 'Remove dot (÷1.5)' : 'Add dot (×1.5)'}
        >
          •&nbsp;DOT
        </button>

        {/* Tie toggle */}
        <button
          onClick={() => canTie && store.toggleTie(measureId, beatId, sd.id)}
          disabled={!canTie}
          className={`
            flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all
            ${sd.tie
              ? 'bg-sky-500 border-sky-500 text-white'
              : canTie
              ? 'bg-transparent border-slate-600 text-slate-400 hover:border-sky-500 hover:text-sky-400'
              : 'bg-transparent border-slate-700 text-slate-600 cursor-not-allowed opacity-40'
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
          ⌢&nbsp;TIE
        </button>
      </div>

      {/* Tie arc indicator */}
      {sd.tie && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-sky-400 text-xl pointer-events-none select-none">
          ⌢
        </div>
      )}
    </div>
  )
}

// ─── Beat row ──────────────────────────────────────────────────────────────

function BeatRow({ measure, beat, beatIdx, currentBeat, currentSubdiv, isPlaying, timeSignature }) {
  const store = useMetronomeStore()
  const { noteValue } = timeSignature
  const isActiveBeat = isPlaying && currentBeat === beatIdx

  return (
    <div
      className={`
        rounded-xl border p-4 transition-all
        ${isActiveBeat
          ? 'border-primary/50 bg-primary/5'
          : 'border-slate-700/40 bg-slate-900/20'
        }
      `}
    >
      {/* Beat header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`
              w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2
              ${isActiveBeat ? 'bg-primary border-primary text-white' : 'border-slate-600 text-slate-400'}
            `}
          >
            {beatIdx + 1}
          </span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Beat {beatIdx + 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BeatCapacityBar beat={beat} noteValue={noteValue} />
          <button
            onClick={() => store.addSubdivision(measure.id, beat.id)}
            className="flex items-center gap-1 text-[10px] text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors font-bold uppercase tracking-wider"
          >
            <Icon name="add" className="text-sm" />
            Add
          </button>
        </div>
      </div>

      {/* Note cards */}
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

// ─── Main export ───────────────────────────────────────────────────────────

export default function SubdivisionEditor() {
  const { measures, timeSignature, currentBeat, currentSubdivision, isPlaying } = useMetronomeStore()

  return (
    <div className="flex flex-col gap-6">
      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Beat Editor
        </h3>
        <div className="flex flex-wrap gap-3 text-[10px]">
          {[
            ['bg-primary', 'Strong'],
            ['bg-orange-500', 'Medium'],
            ['bg-slate-500', 'Normal'],
          ].map(([cls, label]) => (
            <span key={label} className="flex items-center gap-1 text-slate-400">
              <span className={`w-2 h-2 rounded-full ${cls}`} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-amber-400">•&nbsp;Dotted</span>
          <span className="flex items-center gap-1 text-sky-400">⌢&nbsp;Tied</span>
        </div>
      </div>

      {/* Measure → Beat rows */}
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
