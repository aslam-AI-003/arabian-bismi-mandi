import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Orders from './pages/Orders'
import Menu from './pages/Menu'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Offers from './pages/Offers'
import Login from './pages/Login'
import Tables from './pages/Tables'
import Expenses from './pages/Expenses'
import Staff from './pages/Staff'
import Setup, { AccessMessage } from './pages/Setup'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider, useAppSettings } from './context/SettingsContext'
import { ConnectionProvider } from './context/ConnectionContext'
import { CartProvider } from './context/CartContext'
import { LanguageProvider } from './context/LanguageContext'

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-primary">
      <Loader2 className="w-10 h-10 animate-spin text-brand-gold" />
    </div>
  )
}

// Blocks access to everything except /login until a user is signed in,
// then checks the staff profile and first-time setup.
function RequireAuth({ children }) {
  const { isAuthenticated, loading, staff, isAdmin, profileError } = useAuth()
  const { ready, setupDone } = useAppSettings()
  if (loading) return <FullScreenLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (profileError) return <AccessMessage kind="dbUpdateNeeded" />
  if (!staff) return <Setup mode="claim" />
  if (!staff.is_active) return <AccessMessage kind="profileDisabled" />
  if (!ready) return <FullScreenLoader />
  if (isAdmin && !setupDone) return <Setup mode="setup" />
  return children
}

// Admin-only pages send cashiers to billing
function AdminOnly({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/pos" replace />
}

// If already signed in, don't show the login page again
function RedirectIfAuthed({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SettingsProvider>
        <ConnectionProvider>
        <CartProvider>
          <BrowserRouter>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#2D1515',
                color: '#FFF8E7',
                border: '1px solid rgba(212, 164, 76, 0.3)',
              },
              success: {
                iconTheme: {
                  primary: '#28A745',
                  secondary: '#FFF8E7',
                },
              },
              error: {
                iconTheme: {
                  primary: '#DC3545',
                  secondary: '#FFF8E7',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
            <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<AdminOnly><Dashboard /></AdminOnly>} />
              <Route path="pos" element={<POS />} />
              <Route path="tables" element={<Tables />} />
              <Route path="orders" element={<Orders />} />
              <Route path="menu" element={<AdminOnly><Menu /></AdminOnly>} />
              <Route path="reports" element={<AdminOnly><Reports /></AdminOnly>} />
              <Route path="expenses" element={<AdminOnly><Expenses /></AdminOnly>} />
              <Route path="staff" element={<AdminOnly><Staff /></AdminOnly>} />
              <Route path="settings" element={<AdminOnly><Settings /></AdminOnly>} />
              <Route path="offers" element={<AdminOnly><Offers /></AdminOnly>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
          </BrowserRouter>
        </CartProvider>
        </ConnectionProvider>
        </SettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
