import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
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
  Gift,
  Languages,
  Calculator,
  Wifi,
  WifiOff,
  Bluetooth,
  Printer as PrinterIcon,
  Receipt,
  Users,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useLanguage } from '../context/LanguageContext'
import { isPrinterConnected, getPrinterConnectionType, onPrinterStatusChange, connectPrinterBluetooth, reconnectBluetoothPrinter, getConnectedPrinterName } from '../lib/thermalPrinter'
import { signOut } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useConnection } from '../context/ConnectionContext'
import toast from 'react-hot-toast'
// Import the logo
import bismiLogo from '../assets/Bismi_Logo.jpg'

// Online = the database answered within the last check (not just Wi-Fi on).
function useOnlineStatus() {
  return useConnection().online
}

function usePrinterStatus() {
  const [status, setStatus] = useState({ connected: isPrinterConnected(), type: getPrinterConnectionType() })
  useEffect(() => {
    reconnectBluetoothPrinter()
    return onPrinterStatusChange(({ connected, type }) => setStatus({ connected, type }))
  }, [])
  return status
}

function StatusBadges() {
  const online = useOnlineStatus()
  const printer = usePrinterStatus()

  return (
    <div className="flex items-center gap-2">
      {/* WiFi / Network status */}
      <span
        title={online ? 'Online' : 'Offline — no internet connection'}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          online ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
        }`}
      >
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
      </span>

      {/* Bluetooth printer status: tap to connect */}
      <button
        type="button"
        onClick={async () => {
          if (printer.connected) return
          const r = await connectPrinterBluetooth()
          if (r.success) toast.success(r.message)
          else toast.error(r.message)
        }}
        title={printer.connected ? `Printer connected: ${getConnectedPrinterName()}` : 'Tap to connect the Bluetooth printer'}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          printer.connected ? 'bg-green-500/15 text-green-400 cursor-default' : 'bg-muted/15 text-muted hover:text-cream'
        }`}
      >
        {printer.connected ? <Bluetooth size={14} /> : <PrinterIcon size={14} />}
        <span className="hidden sm:inline">
          {printer.connected ? 'Printer Connected' : 'Connect Printer'}
        </span>
      </button>
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { language, toggleLanguage, t } = useLanguage()
  const { isAdmin, staff } = useAuth()
  const { online } = useConnection()

  const handleLogout = async () => {
    await signOut()
    toast.success(language === 'ta' ? 'வெளியேறியது' : 'Logged out')
    navigate('/login')
  }

  // adminOnly pages are hidden from cashiers (the database enforces it too)
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', adminOnly: true },
    { path: '/pos', icon: ShoppingCart, labelKey: 'pos' },
    { path: '/orders', icon: ClipboardList, labelKey: 'orders' },
    { path: '/reports', icon: BarChart3, labelKey: 'reports', adminOnly: true },
    { path: '/expenses', icon: Receipt, labelKey: 'expenses', adminOnly: true },
    { path: '/menu', icon: UtensilsCrossed, labelKey: 'menu', adminOnly: true },
    { path: '/offers', icon: Gift, labelKey: 'offers', adminOnly: true },
    { path: '/staff', icon: Users, labelKey: 'staff', adminOnly: true },
    { path: '/settings', icon: Settings, labelKey: 'settings', adminOnly: true },
  ].filter((item) => isAdmin || !item.adminOnly)

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
          <div className="flex items-center gap-2">
            <StatusBadges />
            {/* Mobile Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 text-cream hover:text-brand-gold flex items-center gap-1"
            >
              <Languages size={18} />
              <span className="text-xs font-medium">{language === 'en' ? 'த' : 'En'}</span>
            </button>
          </div>
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
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-190px)]">
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-brand-gold/20 bg-dark-primary">
          {staff && (
            <p className="text-muted text-xs px-3 pb-2 truncate">
              {staff.name || staff.phone} · {t(staff.role)}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
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
            <StatusBadges />
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
          {!online && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
              <WifiOff size={18} className="shrink-0" />
              {t('offlineBanner')}
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
