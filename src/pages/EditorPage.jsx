import { useState } from 'react'
import { useMetronomeStore } from '../store/metronomeStore'
import BpmControl from '../components/BpmControl'
import TimeSignatureControl from '../components/TimeSignatureControl'
import SubdivisionEditor from '../components/SubdivisionEditor'
import SequenceGrid from '../components/SequenceGrid'
import MixerPanel from '../components/MixerPanel'
import PlaybackControls from '../components/PlaybackControls'
import BeatIndicator from '../components/BeatIndicator'
import Icon from '../components/Icon'

const TABS = [
  { id: 'grid', label: 'Grid', icon: 'grid_view' },
  { id: 'beats', label: 'Beats', icon: 'tune' },
  { id: 'mixer', label: 'Mixer', icon: 'equalizer' },
]

export default function EditorPage() {
  const { bpm, timeSignature, setView, saveAsPreset, exportJson } = useMetronomeStore()
  const [activeTab, setActiveTab] = useState('grid')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')

  const handleSave = () => {
    if (saveName.trim()) {
      saveAsPreset(saveName.trim())
      setShowSaveModal(false)
      setSaveName('')
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
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-primary/20 px-6 py-4 bg-background-light dark:bg-background-dark/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('presets')}
            className="p-2 rounded-lg hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors"
          >
            <Icon name="arrow_back" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Pro Metronome <span className="text-primary">Editor</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Studio Grade Timing Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-2xl font-bold text-primary">
              {bpm} <span className="text-sm font-normal text-slate-400">BPM</span>
            </span>
            <span className="text-xs tracking-widest uppercase text-slate-500">
              {timeSignature.beats}/{timeSignature.noteValue} Signature
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-primary/10 hover:bg-slate-200 dark:hover:bg-primary/20 text-sm font-bold transition-colors"
            >
              <Icon name="save" className="text-base" />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-primary/10 hover:bg-slate-200 dark:hover:bg-primary/20 text-sm font-bold transition-colors"
            >
              <Icon name="download" className="text-base" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setView('performance')}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-colors"
            >
              <Icon name="layers" className="text-base" />
              <span className="hidden sm:inline">Performance</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel — BPM + Time Sig + Controls */}
        <div className="lg:w-72 xl:w-80 border-r border-slate-200 dark:border-primary/10 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
          <div className="p-5 space-y-6">
            <BpmControl />
            <div className="border-t border-slate-200 dark:border-primary/10 pt-4">
              <TimeSignatureControl />
            </div>
            <div className="border-t border-slate-200 dark:border-primary/10 pt-4">
              <PlaybackControls />
            </div>
          </div>
        </div>

        {/* Right Panel — Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Beat Indicator */}
          <div className="p-4 border-b border-slate-200 dark:border-primary/10">
            <BeatIndicator />
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-slate-200 dark:border-primary/10 px-4 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon name={tab.icon} className="text-base" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {activeTab === 'grid' && <SequenceGrid />}
            {activeTab === 'beats' && <SubdivisionEditor />}
            {activeTab === 'mixer' && <MixerPanel />}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-primary/20 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Save as Preset</h3>
            <input
              type="text"
              placeholder="Enter preset name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full border border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-primary/5 rounded-lg px-4 py-2 text-sm mb-4 focus:ring-2 focus:ring-primary/50 outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-primary/20 text-sm font-bold hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
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
