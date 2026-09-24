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
  X,
  ChefHat,
  Languages
} from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { useLanguage } from '../context/LanguageContext'
// Import the logo
import bismiLogo from '../assets/Bismi_Logo.jpg'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { language, toggleLanguage, t } = useLanguage()

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
    { path: '/pos', icon: ShoppingCart, labelKey: 'pos' },
    { path: '/orders', icon: ClipboardList, labelKey: 'orders' },
    { path: '/reports', icon: BarChart3, labelKey: 'reports' },
    { path: '/menu', icon: UtensilsCrossed, labelKey: 'menu' },
    { path: '/kitchen', icon: ChefHat, labelKey: 'kitchen' },
    { path: '/settings', icon: Settings, labelKey: 'settings' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-primary via-dark-secondary to-dark-tertiary relative">
      {/* Watermark Background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url(${bismiLogo})`,
          backgroundSize: '200px 200px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Alternative: Single centered watermark */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center opacity-[0.04]"
      >
        <img 
          src={bismiLogo} 
          alt="" 
          className="w-[400px] h-[400px] object-contain"
        />
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark-primary/95 backdrop-blur border-b border-brand-gold/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-cream hover:text-brand-gold"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img 
              src={bismiLogo} 
              alt="Bismi Logo" 
              className="w-8 h-8 rounded-full object-cover border border-brand-gold/50"
            />
            <h1 className="text-brand-gold font-decorative text-lg">Arabian Bismi</h1>
          </div>
          {/* Mobile Language Toggle */}
          <button 
            onClick={toggleLanguage}
            className="p-2 text-cream hover:text-brand-gold flex items-center gap-1"
          >
            <Languages size={18} />
            <span className="text-xs font-medium">{language === 'en' ? 'த' : 'En'}</span>
          </button>
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
            <img 
              src={bismiLogo} 
              alt="Bismi Logo" 
              className="w-12 h-12 rounded-full object-cover border-2 border-brand-gold shadow-glow"
            />
            <div>
              <h1 className="text-brand-gold font-decorative text-lg leading-tight">Arabian Bismi</h1>
              <p className="text-muted text-xs">Mandi Restaurant</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map(({ path, icon: Icon, labelKey }) => (
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
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-brand-gold/20">
          <button className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={20} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen relative z-10">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-brand-gold/20 bg-dark-primary/50 backdrop-blur sticky top-0 z-40">
          <h2 className="text-xl font-semibold text-cream capitalize">
            {t(location.pathname.replace('/', '') || 'dashboard')}
          </h2>
          <div className="flex items-center gap-4">
            {/* Language Toggle Button */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-gold/30 hover:border-brand-gold/60 hover:bg-brand-gold/10 transition-all"
            >
              <Languages size={16} className="text-brand-gold" />
              <span className="text-cream text-sm font-medium">
                {language === 'en' ? 'தமிழ்' : 'English'}
              </span>
            </button>
            <span className="text-muted text-sm">
              {format(new Date(), 'EEEE, dd MMM yyyy')}
            </span>
            <span className="text-brand-gold font-mono">
              {format(new Date(), 'hh:mm a')}
            </span>
            {/* Logo in header - top right */}
            <img 
              src={bismiLogo} 
              alt="Bismi Logo" 
              className="w-10 h-10 rounded-full object-cover border-2 border-brand-gold shadow-glow"
            />
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
