import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useMetronomeStore } from '../store/metronomeStore'

const LIB_ITEMS = [
  { id: 'my-rhythms', icon: 'music_note', label: 'My Rhythms' },
  { id: 'favorites',  icon: 'star',       label: 'Favorites'  },
  { id: 'recent',     icon: 'history',    label: 'Recent'     },
]

/**
 * Click-to-expand library navigator. Replaces the old sidebar so the
 * three library categories are reachable from any top-level page.
 *
 * On select: switches to 'presets' view AND sets the chosen category,
 * so the user lands directly on the filtered list.
 */
export default function LibraryMenu() {
  const { view, selectedCategory, setSelectedCategory, setView } = useMetronomeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Outside-click dismissal
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeItem = LIB_ITEMS.find((i) => i.id === selectedCategory) ?? LIB_ITEMS[0]
  const isOnLibrary = view === 'presets'

  const handleSelect = (id) => {
    setSelectedCategory(id)
    setView('presets')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
          isOnLibrary || open
            ? 'bg-primary/20 text-primary'
            : 'bg-slate-100 dark:bg-primary/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-primary/20'
        }`}
        title="Library"
      >
        <Icon name={activeItem.icon} className="text-base" />
        <span className="hidden sm:inline">Library</span>
        <span className="hidden md:inline text-slate-500 dark:text-slate-400 font-medium">
          / {activeItem.label}
        </span>
        <Icon
          name="expand_more"
          className={`text-base transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-[#1a0c0c] border border-slate-200 dark:border-primary/20 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-primary/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Library
            </p>
          </div>
          <div className="py-1">
            {LIB_ITEMS.map((item) => {
              const active = isOnLibrary && selectedCategory === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-primary/5'
                  }`}
                >
                  <Icon name={item.icon} className="text-lg" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {active && <Icon name="check" className="text-base" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
