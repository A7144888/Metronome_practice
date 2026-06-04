import { useEffect, useState, useCallback, useRef } from 'react'
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
  { id: 'beat', label: 'Beat', icon: 'music_note' },
  { id: 'mixer', label: 'Mixer', icon: 'tune' },
]

const LEFT_MIN = 200
const LEFT_MAX = 500
const TOP_MIN = 60
const TOP_RATIO_MAX = 0.6

function useResizable(axis, initialValue, min, max) {
  const [value, setValue] = useState(initialValue)
  const dragging = useRef(false)
  const startPos = useRef(0)
  const startVal = useRef(0)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    startPos.current = axis === 'x' ? e.clientX : e.clientY
    startVal.current = value
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e) => {
      if (!dragging.current) return
      const delta = (axis === 'x' ? e.clientX : e.clientY) - startPos.current
      let next = startVal.current + delta
      const maxVal = typeof max === 'function' ? max() : max
      if (next < min) next = min
      if (next > maxVal) next = maxVal
      setValue(next)
    }

    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [axis, value, min, max])

  return [value, onMouseDown]
}

export default function EditorPage() {
  const {
    bpm, timeSignature, setView, saveAsPreset, exportJson, importJson,
    updateActivePreset, activePresetId, presets,
  } = useMetronomeStore()
  const [activeTab, setActiveTab] = useState('beat')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const fileMenuRef = useRef(null)
  const fileInputRef = useRef(null)

  const containerRef = useRef(null)
  const rightPanelRef = useRef(null)

  const [leftWidth, onHDragStart] = useResizable('x', 300, LEFT_MIN, LEFT_MAX)
  const [topHeight, onVDragStart] = useResizable(
    'y', 120, TOP_MIN,
    () => (rightPanelRef.current ? rightPanelRef.current.offsetHeight * TOP_RATIO_MAX : 400)
  )

  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 1400)
    return () => clearTimeout(t)
  }, [savedFlash])

  useEffect(() => {
    if (!fileMenuOpen) return
    const handler = (e) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) setFileMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [fileMenuOpen])

  useEffect(() => {
    if (!loadError) return
    const t = setTimeout(() => setLoadError(null), 4000)
    return () => clearTimeout(t)
  }, [loadError])

  const handleLoadFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.json')) {
      setLoadError('Please select a .json file.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = importJson(ev.target.result)
      if (!result.ok) {
        setLoadError(result.error)
      }
      e.target.value = ''
    }
    reader.onerror = () => {
      setLoadError('Failed to read the file.')
      e.target.value = ''
    }
    reader.readAsText(file)
    setFileMenuOpen(false)
  }

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
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative" ref={containerRef}>
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
            <div className="relative" ref={fileMenuRef}>
              <button
                onClick={() => setFileMenuOpen((o) => !o)}
                className={`flex items-center gap-1 px-4 py-2 text-sm rounded-full transition-all duration-300 ease-md3 active:scale-95 ${
                  fileMenuOpen
                    ? 'bg-md-primary text-white shadow-md3-2'
                    : 'btn-tonal'
                }`}
              >
                <Icon name="folder_open" className="text-base" />
                <span className="hidden sm:inline">File</span>
                <Icon
                  name="expand_more"
                  className={`text-base transition-transform duration-300 ${fileMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {fileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-md-surface border border-md-outline/15 rounded-sm shadow-md3-3 z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-md-on-surface-variant hover:bg-md-primary/10 transition-colors duration-200"
                  >
                    <Icon name="upload" className="text-base" />
                    Load from file
                  </button>
                  <button
                    onClick={() => {
                      handleExport()
                      setFileMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-md-on-surface-variant hover:bg-md-primary/10 transition-colors duration-200"
                  >
                    <Icon name="download" className="text-base" />
                    Export to file
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleLoadFile}
            />
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div
          className="flex flex-col overflow-y-auto custom-scrollbar shrink-0 bg-md-bg border-r border-md-outline/15"
          style={{ width: leftWidth }}
        >
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

        {/* Horizontal Resize Handle */}
        <div
          onMouseDown={onHDragStart}
          className="w-1.5 shrink-0 cursor-col-resize group relative z-10 hover:bg-md-primary/20 active:bg-md-primary/30 transition-colors duration-150"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-md-outline/30 group-hover:bg-md-primary/60 transition-colors duration-150" />
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-md-bg min-w-0" ref={rightPanelRef}>
          {/* Top: Beat Indicator */}
          <div
            className="shrink-0 border-b border-md-outline/15"
            style={{ height: topHeight }}
          >
            <div className="p-4 h-full">
              <BeatIndicator fillHeight />
            </div>
          </div>

          {/* Vertical Resize Handle */}
          <div
            onMouseDown={onVDragStart}
            className="h-1.5 shrink-0 cursor-row-resize group relative z-10 hover:bg-md-primary/20 active:bg-md-primary/30 transition-colors duration-150"
          >
            <div className="absolute inset-x-0 -top-1 -bottom-1" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-8 rounded-full bg-md-outline/30 group-hover:bg-md-primary/60 transition-colors duration-150" />
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
            {activeTab === 'beat' && (
              <div className="flex flex-col gap-6">
                <SequenceGrid />
                <div className="border-t border-md-outline/15 pt-6">
                  <SubdivisionEditor />
                </div>
              </div>
            )}
            {activeTab === 'mixer' && <MixerPanel />}
          </div>
        </div>
      </div>

      {/* Load Error Toast */}
      {loadError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-md-error text-white px-6 py-3 rounded-full shadow-md3-3 flex items-center gap-3 text-sm font-medium animate-[fadeIn_0.2s_ease-out]">
          <Icon name="error" className="text-base" />
          {loadError}
          <button onClick={() => setLoadError(null)} className="hover:opacity-80 active:scale-95">
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

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
