import { useMetronomeStore, SOUND_SETS } from '../store/metronomeStore'
import { audioEngine } from '../engine/audioEngine'

function Slider({ label, color, value, onChange }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 relative h-2 bg-md-surface-low rounded-full">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-200"
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
          className="absolute top-1/2 -translate-y-1/2 size-4 bg-white rounded-full shadow-md3-2 pointer-events-none"
          style={{ left: `${pct}%`, transform: `translate(-50%, -50%)`, border: `2px solid ${color}` }}
        />
      </div>
      <span className="text-[10px] font-mono w-8 text-right text-md-on-surface-variant">{pct}%</span>
    </div>
  )
}

export default function MixerPanel() {
  const { masterVolume, accentVolumes, soundSet, setMasterVolume, setAccentVolume, setSoundSet } =
    useMetronomeStore()

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-medium uppercase tracking-widest text-md-on-surface-variant">
        Mixer
      </h3>

      <div className="bg-md-surface border border-md-outline/15 rounded-lg p-4 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-widest text-md-on-surface-variant/70 font-medium">
              Master Volume
            </span>
          </div>
          <Slider
            label="Master"
            color="#6750A4"
            value={masterVolume}
            onChange={(v) => {
              setMasterVolume(v)
              audioEngine.updateMasterVolume(v)
            }}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-widest text-md-on-surface-variant/70 font-medium">
              Accent Levels
            </span>
          </div>
          <div className="space-y-3">
            <Slider
              label="Strong"
              color="#6750A4"
              value={accentVolumes.strong}
              onChange={(v) => setAccentVolume('strong', v)}
            />
            <Slider
              label="Medium"
              color="#7D5260"
              value={accentVolumes.medium}
              onChange={(v) => setAccentVolume('medium', v)}
            />
            <Slider
              label="Normal"
              color="#79747E"
              value={accentVolumes.normal}
              onChange={(v) => setAccentVolume('normal', v)}
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium uppercase tracking-widest text-md-on-surface-variant/70 block mb-2">
            Sound Set
          </label>
          <div className="relative">
            <select
              value={soundSet}
              onChange={(e) => setSoundSet(e.target.value)}
              className="w-full bg-md-surface-low border-b-2 border-md-outline rounded-t-sm p-3 text-sm cursor-pointer focus:border-md-primary outline-none appearance-none pr-8 text-md-fg transition-colors duration-200"
            >
              {SOUND_SETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant pointer-events-none text-sm">▾</span>
          </div>
        </div>
      </div>
    </div>
  )
}
