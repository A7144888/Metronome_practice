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
      <h3 className="text-xs font-medium uppercase tracking-widest text-md-on-surface-variant">
        Time Signature
      </h3>

      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setTimeSignature(p.beats, p.noteValue)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ease-md3 active:scale-95 ${
              isPresetActive(p)
                ? 'bg-md-primary text-white shadow-md3-2'
                : 'bg-md-surface-low hover:bg-md-primary/10 text-md-on-surface-variant'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-1">
        <div className="flex flex-col items-center gap-1 flex-1">
          <label className="text-[10px] uppercase tracking-widest text-md-on-surface-variant/70">Beats</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimeSignature(Math.max(1, beats - 1), noteValue)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-md-secondary-container hover:bg-md-secondary-container/80 text-md-primary font-medium active:scale-95 transition-all duration-300 ease-md3"
            >−</button>
            <span className="text-3xl font-medium w-8 text-center text-md-fg">{beats}</span>
            <button
              onClick={() => setTimeSignature(Math.min(MAX_BEATS, beats + 1), noteValue)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-md-secondary-container hover:bg-md-secondary-container/80 text-md-primary font-medium active:scale-95 transition-all duration-300 ease-md3"
            >+</button>
          </div>
        </div>

        <div className="text-3xl font-light text-md-outline">/</div>

        <div className="flex flex-col items-center gap-1 flex-1">
          <label className="text-[10px] uppercase tracking-widest text-md-on-surface-variant/70">Note Value</label>
          <div className="flex gap-1 flex-wrap justify-center">
            {NOTE_VALUES.map((nv) => (
              <button
                key={nv}
                onClick={() => setTimeSignature(beats, nv)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-all duration-300 ease-md3 active:scale-95 ${
                  noteValue === nv
                    ? 'bg-md-primary text-white'
                    : 'bg-md-surface-low hover:bg-md-primary/10 text-md-on-surface-variant'
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
