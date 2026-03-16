import { useMetronomeStore, SOUND_SETS } from '../store/metronomeStore'
import { audioEngine } from '../engine/audioEngine'

function Slider({ label, color, value, onChange }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 relative h-2 bg-slate-800 rounded-full">
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 size-4 bg-white rounded-full shadow-lg border-2 pointer-events-none"
          style={{ left: `${pct}%`, transform: `translate(-50%, -50%)`, borderColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function MixerPanel() {
  const { masterVolume, accentVolumes, soundSet, setMasterVolume, setAccentVolume, setSoundSet } =
    useMetronomeStore()

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Mixer
      </h3>

      <div className="bg-slate-900/40 dark:bg-slate-900/60 border border-primary/10 rounded-xl p-4 space-y-4">
        {/* Master Volume */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              Master Volume
            </span>
          </div>
          <Slider
            label="Master"
            color="#ec1313"
            value={masterVolume}
            onChange={(v) => {
              setMasterVolume(v)
              audioEngine.updateMasterVolume(v)
            }}
          />
        </div>

        {/* Accent Volumes */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              Accent Levels
            </span>
          </div>
          <div className="space-y-3">
            <Slider
              label="Strong"
              color="#ec1313"
              value={accentVolumes.strong}
              onChange={(v) => setAccentVolume('strong', v)}
            />
            <Slider
              label="Medium"
              color="#f97316"
              value={accentVolumes.medium}
              onChange={(v) => setAccentVolume('medium', v)}
            />
            <Slider
              label="Normal"
              color="#64748b"
              value={accentVolumes.normal}
              onChange={(v) => setAccentVolume('normal', v)}
            />
          </div>
        </div>

        {/* Sound Set */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
            Sound Set
          </label>
          <div className="relative">
            <select
              value={soundSet}
              onChange={(e) => setSoundSet(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm cursor-pointer focus:ring-1 focus:ring-primary outline-none appearance-none pr-8"
            >
              {SOUND_SETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">▾</span>
          </div>
        </div>
      </div>
    </div>
  )
}
