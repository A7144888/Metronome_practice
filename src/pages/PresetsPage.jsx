import { useEffect, useRef, useState } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import PresetCard from '../components/PresetCard'
import Icon from '../components/Icon'
import LibraryMenu from '../components/LibraryMenu'

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
    activePresetId,
    setView, newPreset,
  } = useMetronomeStore()

  const meta = CATEGORY_META[selectedCategory] ?? CATEGORY_META['my-rhythms']

  let categoryFiltered = presets
  if (selectedCategory === 'favorites') {
    categoryFiltered = presets.filter((p) => p.favorited)
  } else if (selectedCategory === 'recent') {
    categoryFiltered = recentPresetIds
      .map((id) => presets.find((p) => p.id === id))
      .filter(Boolean)
  }

  const availableTags = Array.from(new Set(presets.map((p) => p.tag)))
  const tagFiltered = filterTag && filterTag !== 'all'
    ? categoryFiltered.filter((p) => p.tag === filterTag)
    : categoryFiltered

  const filtered = tagFiltered.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
      {/* MD3 organic blur shapes */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-md-primary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 -left-24 w-72 h-72 bg-md-tertiary/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Header */}
      <header className="h-20 border-b border-md-outline/15 flex items-center justify-between px-8 bg-md-bg/80 backdrop-blur-md shrink-0 relative z-30">
        <div className="flex items-center gap-4">
          <LibraryMenu />
          <h2 className="hidden md:block text-2xl font-medium text-md-fg">{meta.title}</h2>
          <span className="bg-md-secondary-container text-md-primary text-[10px] font-medium px-2.5 py-0.5 rounded-full uppercase">
            {filtered.length} Items
          </span>
          {filterActive && (
            <button
              onClick={() => setFilterTag('all')}
              className="flex items-center gap-1 bg-md-primary/10 text-md-primary text-[10px] font-medium px-2.5 py-0.5 rounded-full uppercase hover:bg-md-primary/20 active:scale-95 transition-all duration-300 ease-md3"
              title="Clear filter"
            >
              {filterTag}
              <Icon name="close" className="text-[12px]" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant/50 text-xl" />
            <input
              className="pl-10 pr-4 py-2.5 bg-md-surface-low border-b-2 border-md-outline/30 rounded-t-sm text-sm w-64 focus:border-md-primary transition-colors duration-200 outline-none text-md-fg placeholder:text-md-on-surface-variant/50"
              placeholder={meta.placeholder}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`p-2.5 rounded-full transition-all duration-300 ease-md3 active:scale-95 ${
                filterActive || filterOpen
                  ? 'bg-md-secondary-container text-md-primary'
                  : 'bg-md-surface text-md-on-surface-variant hover:bg-md-primary/10 hover:text-md-primary'
              }`}
              title="Filter by time signature"
            >
              <Icon name="filter_list" />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-md-surface border border-md-outline/15 rounded-sm shadow-md3-3 z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-md-outline/15">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-md-on-surface-variant/60">
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
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
        {filtered.length === 0 ? (
          <EmptyState
            icon={meta.emptyIcon}
            title={meta.emptyTitle}
            body={meta.emptyBody}
            onAction={selectedCategory === 'my-rhythms' ? () => { newPreset(); setView('editor') } : undefined}
            actionLabel={selectedCategory === 'my-rhythms' ? 'Create New Preset' : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((preset) => (
              <PresetCard key={preset.id} preset={preset} />
            ))}

            {selectedCategory === 'my-rhythms' && (
              <button
                onClick={() => { newPreset(); setView('editor') }}
                className="border-2 border-dashed border-md-outline/30 rounded-lg flex flex-col items-center justify-center p-8 group cursor-pointer hover:bg-md-primary/5 hover:border-md-primary/40 transition-all duration-300 ease-md3 active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-full bg-md-secondary-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ease-md3">
                  <Icon name="add" className="text-md-on-surface-variant group-hover:text-md-primary transition-colors duration-300" />
                </div>
                <p className="font-medium text-md-on-surface-variant group-hover:text-md-primary transition-colors duration-300">
                  New Preset
                </p>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mini Player Footer */}
      {activePresetId && presets.some((p) => p.id === activePresetId) ? (
        <footer className="h-24 bg-md-surface border-t border-md-outline/15 flex items-center px-8 justify-between shadow-md3-2 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-md-primary-container rounded-lg flex items-center justify-center text-md-primary">
              <Icon name="music_note" className="text-3xl" />
            </div>
            <div>
              <h4 className="font-medium text-md-fg">
                {presets.find((p) => p.id === activePresetId)?.name ?? 'Current Session'}
              </h4>
              <p className="text-md-on-surface-variant text-sm">
                {bpm} BPM • {timeSignature.beats}/{timeSignature.noteValue}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden sm:flex items-center gap-2 text-sm text-md-on-surface-variant">
              <Icon name="timer" className="text-sm" />
              <span>{formatTime(elapsedTime)}</span>
              <span className="ml-2">Bar {measureCount}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('performance')}
                className="btn-tonal flex items-center gap-2 text-sm py-2 px-4"
              >
                <Icon name="layers" className="text-base" />
                PERFORMANCE
              </button>
              <button
                onClick={() => setView('editor')}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
              >
                <Icon name="tune" className="text-base" />
                EDITOR
              </button>
            </div>
          </div>
        </footer>
      ) : (
        <footer className="h-16 bg-md-surface border-t border-md-outline/15 flex items-center px-8 justify-center shrink-0 relative z-10">
          <p className="text-sm text-md-on-surface-variant">No preset loaded</p>
        </footer>
      )}
    </div>
  )
}

function FilterOption({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-all duration-200 ease-md3 ${
        active
          ? 'bg-md-secondary-container text-md-primary font-medium'
          : 'text-md-on-surface-variant hover:bg-md-primary/5'
      }`}
    >
      <span>{label}</span>
      {active && <Icon name="check" className="text-base text-md-primary" />}
    </button>
  )
}

function EmptyState({ icon, title, body, onAction, actionLabel }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
      <button
        type="button"
        onClick={onAction}
        disabled={!onAction}
        className={`w-20 h-20 rounded-full bg-md-secondary-container flex items-center justify-center mb-4 text-md-primary transition-all duration-300 ease-md3 ${
          onAction ? 'cursor-pointer hover:scale-110 hover:bg-md-primary hover:text-white active:scale-95 shadow-md3-1 hover:shadow-md3-3' : ''
        }`}
      >
        <Icon name={icon} className="text-4xl" />
      </button>
      <h3 className="text-lg font-medium mb-1 text-md-fg">{title}</h3>
      <p className="text-sm text-md-on-surface-variant max-w-xs mb-4">{body}</p>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary flex items-center gap-2 text-sm py-2.5 px-6"
        >
          <Icon name="add" className="text-base" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
