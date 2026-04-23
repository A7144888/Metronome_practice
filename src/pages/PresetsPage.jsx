import { useEffect, useRef, useState } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import PresetCard from '../components/PresetCard'
import Icon from '../components/Icon'

// ── Per-category metadata (title + empty-state text + icon) ─────────────
const CATEGORY_META = {
  'my-rhythms': {
    title:       'My Rhythms',
    placeholder: 'Search presets...',
    emptyIcon:   'music_note',
    emptyTitle:  'No rhythms yet',
    emptyBody:   'Create your first preset in the Editor.',
  },
  favorites: {
    title:       'Favorites',
    placeholder: 'Search favorites...',
    emptyIcon:   'star',
    emptyTitle:  'No favorites yet',
    emptyBody:   'Tap the star on any preset to add it here.',
  },
  recent: {
    title:       'Recent',
    placeholder: 'Search recent...',
    emptyIcon:   'history',
    emptyTitle:  'Nothing played yet',
    emptyBody:   'Presets you load will show up here, most recent first.',
  },
}

export default function PresetsPage() {
  const {
    presets,
    searchQuery, setSearchQuery,
    filterTag, setFilterTag,
    selectedCategory,
    recentPresetIds,
    bpm, timeSignature, elapsedTime, measureCount,
    setView,
  } = useMetronomeStore()

  const meta = CATEGORY_META[selectedCategory] ?? CATEGORY_META['my-rhythms']

  // ── Narrow the list by selected sidebar category ──────────────────────
  let categoryFiltered = presets
  if (selectedCategory === 'favorites') {
    categoryFiltered = presets.filter((p) => p.favorited)
  } else if (selectedCategory === 'recent') {
    // Preserve recent-first order
    categoryFiltered = recentPresetIds
      .map((id) => presets.find((p) => p.id === id))
      .filter(Boolean)
  }

  // ── Tag filter (popover) ─────────────────────────────────────────────
  const availableTags = Array.from(new Set(presets.map((p) => p.tag)))
  const tagFiltered = filterTag && filterTag !== 'all'
    ? categoryFiltered.filter((p) => p.tag === filterTag)
    : categoryFiltered

  // ── Text search ──────────────────────────────────────────────────────
  const filtered = tagFiltered.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Filter popover open/close + outside-click dismissal ──────────────
  const [filterOpen, setFilterOpen] = useState(false)
  const popoverRef = useRef(null)
  useEffect(() => {
    if (!filterOpen) return
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const filterActive = filterTag && filterTag !== 'all'

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-20 border-b border-slate-200 dark:border-primary/10 flex items-center justify-between px-8 bg-white/50 dark:bg-background-dark/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">{meta.title}</h2>
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {filtered.length} Items
          </span>
          {filterActive && (
            <button
              onClick={() => setFilterTag('all')}
              className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase hover:bg-primary/20 transition-colors"
              title="Clear filter"
            >
              {filterTag}
              <Icon name="close" className="text-[12px]" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
            <input
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-primary/5 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
              placeholder={meta.placeholder}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter dropdown */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`p-2 rounded-lg transition-colors ${
                filterActive || filterOpen
                  ? 'bg-primary/20 text-primary'
                  : 'bg-slate-100 dark:bg-primary/5 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
              }`}
              title="Filter by time signature"
            >
              <Icon name="filter_list" />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1a0c0c] border border-slate-200 dark:border-primary/20 rounded-xl shadow-2xl z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-primary/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Time Signature
                  </p>
                </div>
                <div className="py-1">
                  <FilterOption
                    active={!filterActive}
                    label="All"
                    onClick={() => { setFilterTag('all'); setFilterOpen(false) }}
                  />
                  {availableTags.map((tag) => (
                    <FilterOption
                      key={tag}
                      active={filterTag === tag}
                      label={tag}
                      onClick={() => { setFilterTag(tag); setFilterOpen(false) }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {filtered.length === 0 ? (
          <EmptyState icon={meta.emptyIcon} title={meta.emptyTitle} body={meta.emptyBody} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((preset) => (
              <PresetCard key={preset.id} preset={preset} />
            ))}

            {/* New Preset placeholder — only on the main library view */}
            {selectedCategory === 'my-rhythms' && (
              <button
                onClick={() => setView('editor')}
                className="border-2 border-dashed border-slate-200 dark:border-primary/20 rounded-xl flex flex-col items-center justify-center p-8 group cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon name="add" className="text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <p className="font-bold text-slate-400 group-hover:text-primary transition-colors">
                  New Preset
                </p>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mini Player Footer */}
      <footer className="h-24 bg-white dark:bg-[#1a0c0c] border-t border-slate-200 dark:border-primary/20 flex items-center px-8 justify-between shadow-2xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20">
            <Icon name="music_note" className="text-3xl" />
          </div>
          <div>
            <h4 className="font-bold">Current Session</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {bpm} BPM • {timeSignature.beats}/{timeSignature.noteValue}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
            <Icon name="timer" className="text-sm" />
            <span>{formatTime(elapsedTime)}</span>
            <span className="ml-2">Bar {measureCount}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('performance')}
              className="flex items-center gap-2 bg-slate-100 dark:bg-primary/10 hover:bg-slate-200 dark:hover:bg-primary/20 text-slate-700 dark:text-slate-200 font-bold px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <Icon name="layers" className="text-base" />
              PERFORMANCE
            </button>
            <button
              onClick={() => setView('editor')}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm shadow-lg shadow-primary/20"
            >
              <Icon name="tune" className="text-base" />
              EDITOR
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Local sub-components ────────────────────────────────────────────────

function FilterOption({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-primary/5'
      }`}
    >
      <span>{label}</span>
      {active && <Icon name="check" className="text-base" />}
    </button>
  )
}

function EmptyState({ icon, title, body }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-primary/10 flex items-center justify-center mb-4 text-slate-400 dark:text-primary/70">
        <Icon name={icon} className="text-3xl" />
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{body}</p>
    </div>
  )
}
