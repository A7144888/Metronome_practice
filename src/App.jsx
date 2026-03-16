import { useMetronomeStore } from './store/metronomeStore'
import Sidebar from './components/Sidebar'
import PresetsPage from './pages/PresetsPage'
import EditorPage from './pages/EditorPage'
import PerformancePage from './pages/PerformancePage'

export default function App() {
  const { view } = useMetronomeStore()

  // Performance view: full screen, no sidebar
  if (view === 'performance') {
    return (
      <div className="dark min-h-screen bg-background-dark text-slate-100 flex">
        <PerformancePage />
      </div>
    )
  }

  return (
    <div className="dark min-h-screen bg-background-dark text-slate-100 flex overflow-hidden">
      {/* Sidebar: hidden on small screens, shown on md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex overflow-hidden min-w-0">
        {view === 'presets' && <PresetsPage />}
        {view === 'editor' && <EditorPage />}
      </div>
    </div>
  )
}
