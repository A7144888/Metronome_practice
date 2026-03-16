import { useMetronomeStore } from '../store/metronomeStore'
import Icon from './Icon'

export default function PresetCard({ preset }) {
  const { loadPreset, toggleFavorite } = useMetronomeStore()

  return (
    <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors leading-tight">
              {preset.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-primary font-bold text-sm">{preset.bpm} BPM</span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-tight">
                {preset.tag}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleFavorite(preset.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                preset.favorited
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-slate-400 hover:text-primary hover:bg-primary/10'
              }`}
            >
              <Icon name="star" className="text-lg" />
            </button>
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors">
              <Icon name="more_vert" className="text-lg" />
            </button>
          </div>
        </div>

        {/* Rhythm Visual Preview */}
        <div className="bg-slate-50 dark:bg-primary/10 rounded-lg p-3 h-20 flex items-end gap-1 mb-5 overflow-hidden">
          {preset.rhythmPreview.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-primary rounded-t-sm transition-all"
              style={{ height: `${h * 100}%`, opacity: 0.3 + h * 0.7 }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPreset(preset.id)}
            className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
          >
            <Icon name="play_arrow" className="text-sm" />
            LOAD
          </button>
          <button
            onClick={() => loadPreset(preset.id)}
            className="flex-1 border border-slate-200 dark:border-primary/20 text-slate-600 dark:text-slate-300 text-xs font-bold py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
          >
            <Icon name="edit" className="text-sm" />
            EDIT
          </button>
        </div>
      </div>
    </div>
  )
}
