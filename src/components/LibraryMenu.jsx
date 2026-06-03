import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useMetronomeStore } from '../store/metronomeStore'

const LIB_ITEMS = [
  { id: 'my-rhythms', icon: 'music_note', label: 'My Rhythms' },
  { id: 'favorites',  icon: 'star',       label: 'Favorites'  },
  { id: 'recent',     icon: 'history',    label: 'Recent'     },
]

export default function LibraryMenu() {
  const { view, selectedCategory, setSelectedCategory, setView } = useMetronomeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-md3 active:scale-95 ${
          isOnLibrary || open
            ? 'bg-md-secondary-container text-md-primary'
            : 'bg-md-surface hover:bg-md-primary/10 text-md-on-surface-variant'
        }`}
        title="Library"
      >
        <Icon name={activeItem.icon} className="text-base" />
        <span className="hidden sm:inline">Library</span>
        <span className="hidden md:inline text-md-on-surface-variant font-normal">
          / {activeItem.label}
        </span>
        <Icon
          name="expand_more"
          className={`text-base transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-md-surface border border-md-outline/15 rounded-sm shadow-md3-3 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-md-outline/15">
            <p className="text-[10px] font-medium uppercase tracking-widest text-md-on-surface-variant/60">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 ease-md3 ${
                    active
                      ? 'bg-md-secondary-container text-md-primary font-medium'
                      : 'text-md-on-surface-variant hover:bg-md-primary/5'
                  }`}
                >
                  <Icon name={item.icon} className="text-lg" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {active && <Icon name="check" className="text-base text-md-primary" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
