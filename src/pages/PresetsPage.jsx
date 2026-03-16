import { useState } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import PresetCard from '../components/PresetCard'
import Icon from '../components/Icon'

export default function PresetsPage() {
  const { presets, searchQuery, setSearchQuery, bpm, timeSignature, isPlaying, elapsedTime, measureCount, soundSet, setView } =
    useMetronomeStore()

  const filtered = presets.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-20 border-b border-slate-200 dark:border-primary/10 flex items-center justify-between px-8 bg-white/50 dark:bg-background-dark/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">My Rhythms</h2>
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {filtered.length} Items
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
            <input
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-primary/5 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
              placeholder="Search presets..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2 rounded-lg bg-slate-100 dark:bg-primary/5 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors">
            <Icon name="filter_list" />
          </button>
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((preset) => (
            <PresetCard key={preset.id} preset={preset} />
          ))}

          {/* New Preset placeholder */}
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
        </div>
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
