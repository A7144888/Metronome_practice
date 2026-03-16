import { useMetronomeStore } from '../store/metronomeStore'

const PRESETS = [
  { label: '4/4', beats: 4, noteValue: 4 },
  { label: '3/4', beats: 3, noteValue: 4 },
  { label: '6/8', beats: 6, noteValue: 8 },
  { label: '5/4', beats: 5, noteValue: 4 },
  { label: '7/8', beats: 7, noteValue: 8 },
  { label: '2/4', beats: 2, noteValue: 4 },
]

const NOTE_VALUES = [1, 2, 4, 8, 16]
const MAX_BEATS = 16

export default function TimeSignatureControl() {
  const { timeSignature, setTimeSignature } = useMetronomeStore()
  const { beats, noteValue } = timeSignature

  const isPresetActive = (p) => p.beats === beats && p.noteValue === noteValue

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Time Signature
      </h3>

      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setTimeSignature(p.beats, p.noteValue)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isPresetActive(p)
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-slate-100 dark:bg-primary/5 hover:bg-primary/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-primary/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-1">
        <div className="flex flex-col items-center gap-1 flex-1">
          <label className="text-[10px] uppercase tracking-widest text-slate-500">Beats</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimeSignature(Math.max(1, beats - 1), noteValue)}
              className="w-7 h-7 rounded flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary font-bold"
            >−</button>
            <span className="text-3xl font-bold w-8 text-center">{beats}</span>
            <button
              onClick={() => setTimeSignature(Math.min(MAX_BEATS, beats + 1), noteValue)}
              className="w-7 h-7 rounded flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary font-bold"
            >+</button>
          </div>
        </div>

        <div className="text-3xl font-light text-slate-400">/</div>

        <div className="flex flex-col items-center gap-1 flex-1">
          <label className="text-[10px] uppercase tracking-widest text-slate-500">Note Value</label>
          <div className="flex gap-1 flex-wrap justify-center">
            {NOTE_VALUES.map((nv) => (
              <button
                key={nv}
                onClick={() => setTimeSignature(beats, nv)}
                className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                  noteValue === nv
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-primary/5 hover:bg-primary/10 text-slate-600 dark:text-slate-400'
                }`}
              >
                {nv}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
