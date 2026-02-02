import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BarChart3, 
  DollarSign, 
  GitBranch, 
  Calendar,
  Menu,
  X,
  RefreshCw
} from 'lucide-react'
import { clsx } from 'clsx'
import FilterBar from './FilterBar'
import { syncApi } from '../api/client'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'OTA Comparison', href: '/ota-comparison', icon: BarChart3 },
  { name: 'Revenue', href: '/revenue', icon: DollarSign },
  { name: 'Conversion', href: '/conversion', icon: GitBranch },
  { name: 'Patterns', href: '/patterns', icon: Calendar },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    setSyncMessage(null)
    try {
      const result = await syncApi.triggerSync()
      if (result?.status === 'already_running') {
        setSyncMessage('Sync already in progress.')
      } else {
        setSyncMessage('Sync started. Refresh in a few minutes.')
      }
    } catch (error) {
      setSyncMessage('Sync failed. Check backend logs.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <h1 className="text-lg font-bold text-primary-700">Guesty Insights</h1>
          <button 
            className="lg:hidden p-1 rounded hover:bg-slate-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-slate-600 hover:bg-slate-100"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <button
            className={clsx(
              "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              syncing
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            )}
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={clsx("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
          {syncMessage && (
            <p className="text-xs text-slate-500 text-center">{syncMessage}</p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center gap-4 h-16 px-4">
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <FilterBar />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
