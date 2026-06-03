import { useEffect, useState } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import BpmControl from '../components/BpmControl'
import TimeSignatureControl from '../components/TimeSignatureControl'
import SubdivisionEditor from '../components/SubdivisionEditor'
import SequenceGrid from '../components/SequenceGrid'
import MixerPanel from '../components/MixerPanel'
import PlaybackControls from '../components/PlaybackControls'
import BeatIndicator from '../components/BeatIndicator'
import Icon from '../components/Icon'
import LibraryMenu from '../components/LibraryMenu'

const TABS = [
  { id: 'grid', label: 'Grid', icon: 'grid_view' },
  { id: 'beats', label: 'Beats', icon: 'tune' },
]

export default function EditorPage() {
  const {
    bpm, timeSignature, setView, saveAsPreset, exportJson,
    updateActivePreset, activePresetId, presets,
  } = useMetronomeStore()
  const [activeTab, setActiveTab] = useState('grid')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 1400)
    return () => clearTimeout(t)
  }, [savedFlash])

  const activePresetExists = activePresetId && presets.some((p) => p.id === activePresetId)

  const handleSaveClick = () => {
    if (activePresetExists) {
      const ok = updateActivePreset()
      if (ok) setSavedFlash(true)
    } else {
      setShowSaveModal(true)
    }
  }

  const handleSave = () => {
    if (saveName.trim()) {
      saveAsPreset(saveName.trim())
      setShowSaveModal(false)
      setSaveName('')
      setSavedFlash(true)
    }
  }

  const handleExport = () => {
    const json = exportJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'metronome-pattern.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
      {/* MD3 organic blur shapes */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-md-primary/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-20 -right-20 w-80 h-80 bg-md-tertiary/6 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-md-outline/15 px-6 py-4 bg-md-bg/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-md-primary flex items-center justify-center text-white shadow-md3-2 shrink-0">
            <Icon name="timer" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-medium tracking-tight text-md-fg">
              Pro Metronome <span className="text-md-primary">Editor</span>
            </h1>
            <p className="text-xs text-md-on-surface-variant">Studio Grade Timing Engine</p>
          </div>
          <LibraryMenu />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-2xl font-medium text-md-primary">
              {bpm} <span className="text-sm font-normal text-md-on-surface-variant">BPM</span>
            </span>
            <span className="text-xs tracking-widest uppercase text-md-on-surface-variant/70">
              {timeSignature.beats}/{timeSignature.noteValue} Signature
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveClick}
              className="relative btn-tonal flex items-center gap-1 px-4 py-2 text-sm"
              title={activePresetExists ? 'Save changes to current preset' : 'Save as new preset'}
            >
              <Icon name="save" className="text-base" />
              <span className="hidden sm:inline">Save</span>
              {savedFlash && (
                <span className="absolute -bottom-7 right-0 text-[10px] font-medium uppercase tracking-widest text-md-primary bg-md-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Saved
                </span>
              )}
            </button>
            <button
              onClick={handleExport}
              className="btn-tonal flex items-center gap-1 px-4 py-2 text-sm"
            >
              <Icon name="download" className="text-base" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setView('performance')}
              className="btn-ghost flex items-center gap-1 px-4 py-2 text-sm"
            >
              <Icon name="layers" className="text-base" />
              <span className="hidden sm:inline">Performance</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel */}
        <div className="lg:w-72 xl:w-80 border-r border-md-outline/15 flex flex-col overflow-y-auto custom-scrollbar shrink-0 bg-md-bg">
          <div className="p-5 space-y-6">
            <BpmControl />
            <div className="border-t border-md-outline/15 pt-4">
              <TimeSignatureControl />
            </div>
            <div className="border-t border-md-outline/15 pt-4">
              <PlaybackControls />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-md-bg">
          <div className="p-4 border-b border-md-outline/15">
            <BeatIndicator />
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-md-outline/15 px-4 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-300 ease-md3 ${
                  activeTab === tab.id
                    ? 'border-md-primary text-md-primary'
                    : 'border-transparent text-md-on-surface-variant hover:text-md-fg hover:bg-md-primary/5'
                }`}
              >
                <Icon name={tab.icon} className="text-base" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {activeTab === 'grid' && (
              <div className="flex flex-col gap-6">
                <SequenceGrid />
                <div className="border-t border-md-outline/15 pt-6">
                  <MixerPanel />
                </div>
              </div>
            )}
            {activeTab === 'beats' && <SubdivisionEditor />}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-md-surface border border-md-outline/15 rounded-xl p-6 w-full max-w-sm shadow-md3-4">
            <h3 className="text-lg font-medium mb-4 text-md-fg">Save as Preset</h3>
            <input
              type="text"
              placeholder="Enter preset name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full bg-md-surface-low border-b-2 border-md-outline rounded-t-sm px-4 py-3 text-sm mb-4 focus:border-md-primary outline-none transition-colors duration-200 text-md-fg placeholder:text-md-on-surface-variant/50"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 btn-outlined py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 btn-primary py-2.5 text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
