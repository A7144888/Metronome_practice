import Icon from './Icon'
import { useMetronomeStore } from '../store/metronomeStore'

const LIB_ITEMS = [
  { id: 'my-rhythms', icon: 'music_note', label: 'My Rhythms' },
  { id: 'favorites',  icon: 'star',       label: 'Favorites'  },
  { id: 'recent',     icon: 'history',    label: 'Recent'     },
]

export default function Sidebar() {
  const { view, setView, selectedCategory, setSelectedCategory } = useMetronomeStore()

  return (
    <aside className="w-64 border-r border-primary/10 flex flex-col h-screen bg-background-light dark:bg-background-dark shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Icon name="timer" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Metronome</h1>
          <p className="text-xs text-primary font-medium tracking-wider uppercase">Pro Edition</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="py-2">
          <p className="px-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">
            Library
          </p>
          {LIB_ITEMS.map((item) => {
            const active = selectedCategory === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedCategory(item.id)
                  setView('presets')
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-primary/5'
                }`}
              >
                <Icon name={item.icon} className="text-xl" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-primary/10 space-y-2">
        <button
          onClick={() => setView('editor')}
          className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-lg transition-all shadow-lg ${
            view === 'editor'
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
          }`}
        >
          <Icon name={view === 'editor' ? 'tune' : 'add'} />
          <span className="text-sm">{view === 'editor' ? 'Editor Open' : 'New Project'}</span>
        </button>
        {view !== 'performance' && (
          <button
            onClick={() => setView('performance')}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-primary/5 hover:bg-slate-200 dark:hover:bg-primary/10 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-lg transition-colors text-sm"
          >
            <Icon name="layers" />
            Performance View
          </button>
        )}
      </div>
    </aside>
  )
}
