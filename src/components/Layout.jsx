import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ClipboardList, 
  BarChart3, 
  UtensilsCrossed,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pos', icon: ShoppingCart, label: 'POS' },
  { path: '/orders', icon: ClipboardList, label: 'Orders' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-primary via-dark-secondary to-dark-tertiary">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark-primary/95 backdrop-blur border-b border-brand-gold/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-cream hover:text-brand-gold"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-brand-gold font-decorative text-lg">Arabian Bismi</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 
        bg-dark-primary border-r border-brand-gold/20
        transform transition-transform duration-300
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-brand-gold/20">
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 text-cream hover:text-brand-gold"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-brand-gold bg-gradient-to-br from-dark-secondary to-dark-primary flex items-center justify-center shadow-glow">
              <span className="text-2xl">🍽️</span>
            </div>
            <div>
              <h1 className="text-brand-gold font-decorative text-lg leading-tight">Arabian Bismi</h1>
              <p className="text-muted text-xs">Mandi Restaurant</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                nav-link
                ${isActive ? 'active' : ''}
              `}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-brand-gold/20">
          <button className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-brand-gold/20 bg-dark-primary/50 backdrop-blur sticky top-0 z-40">
          <h2 className="text-xl font-semibold text-cream capitalize">
            {location.pathname.replace('/', '') || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-muted text-sm">
              {format(new Date(), 'EEEE, dd MMM yyyy')}
            </span>
            <span className="text-brand-gold font-mono">
              {format(new Date(), 'hh:mm a')}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6 pt-20 lg:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
