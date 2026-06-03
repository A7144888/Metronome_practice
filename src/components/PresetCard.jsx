import { useEffect, useRef, useState } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import Icon from './Icon'

export default function PresetCard({ preset }) {
  const { loadPreset, toggleFavorite, deletePreset } = useMetronomeStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleDelete = () => {
    deletePreset(preset.id)
    setConfirmOpen(false)
  }

  return (
    <div className="bg-md-surface border border-md-outline/15 rounded-lg overflow-hidden group hover:shadow-md3-2 hover:scale-[1.02] transition-all duration-300 ease-md3">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-medium text-lg group-hover:text-md-primary transition-colors duration-300 leading-tight text-md-fg">
              {preset.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-md-primary font-medium text-sm">{preset.bpm} BPM</span>
              <span className="text-md-outline text-xs">•</span>
              <span className="text-md-on-surface-variant text-xs font-medium uppercase tracking-tight">
                {preset.tag}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleFavorite(preset.id)}
              className={`p-1.5 rounded-full transition-all duration-300 ease-md3 active:scale-95 ${
                preset.favorited
                  ? 'text-md-primary bg-md-primary/10 hover:bg-md-primary/20'
                  : 'text-md-on-surface-variant hover:text-md-primary hover:bg-md-primary/10'
              }`}
            >
              <Icon name="star" className="text-lg" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className={`p-1.5 rounded-full transition-all duration-300 ease-md3 active:scale-95 ${
                  menuOpen
                    ? 'bg-md-primary/10 text-md-primary'
                    : 'text-md-on-surface-variant hover:text-md-primary hover:bg-md-primary/10'
                }`}
                title="More actions"
              >
                <Icon name="more_vert" className="text-lg" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-md-surface border border-md-outline/20 rounded-sm shadow-md3-3 z-30 overflow-hidden">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirmOpen(true)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-md-error hover:bg-md-error/10 transition-colors duration-200"
                  >
                    <Icon name="delete" className="text-base" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-md-surface-low rounded-sm p-3 h-20 flex items-end gap-1 mb-5 overflow-hidden">
          {preset.rhythmPreview.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-md-primary rounded-t-sm transition-all"
              style={{ height: `${h * 100}%`, opacity: 0.3 + h * 0.7 }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPreset(preset.id, { view: 'performance' })}
            className="flex-1 bg-md-primary text-white text-xs font-medium py-2.5 rounded-full hover:bg-md-primary/90 active:scale-95 transition-all duration-300 ease-md3 flex items-center justify-center gap-1 shadow-md3-1 hover:shadow-md3-2"
          >
            <Icon name="play_arrow" className="text-sm" />
            LOAD
          </button>
          <button
            onClick={() => loadPreset(preset.id)}
            className="flex-1 border border-md-outline text-md-on-surface-variant text-xs font-medium py-2.5 rounded-full hover:bg-md-primary/5 active:scale-95 transition-all duration-300 ease-md3 flex items-center justify-center gap-1"
          >
            <Icon name="edit" className="text-sm" />
            EDIT
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-md-surface border border-md-outline/20 rounded-xl p-6 w-full max-w-sm shadow-md3-4"
          >
            <h3 className="text-lg font-medium mb-2 text-md-fg">Delete preset?</h3>
            <p className="text-sm text-md-on-surface-variant mb-4">
              "{preset.name}" will be removed from your library. This can't be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-md-outline text-sm font-medium hover:bg-md-primary/5 transition-all duration-300 ease-md3 active:scale-95 text-md-fg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-full bg-md-error text-white text-sm font-medium hover:bg-md-error/90 transition-all duration-300 ease-md3 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
