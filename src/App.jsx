import { useMetronomeStore } from './store/metronomeStore'
import PresetsPage from './pages/PresetsPage'
import EditorPage from './pages/EditorPage'
import PerformancePage from './pages/PerformancePage'

export default function App() {
  const { view } = useMetronomeStore()

  if (view === 'performance') {
    return (
      <div className="min-h-dvh bg-md-bg text-md-fg flex">
        <PerformancePage />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-md-bg text-md-fg flex overflow-hidden">
      <div className="flex-1 flex overflow-hidden min-w-0">
        {view === 'presets' && <PresetsPage />}
        {view === 'editor' && <EditorPage />}
      </div>
    </div>
  )
}
