import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Orders from './pages/Orders'
import Menu from './pages/Menu'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Kitchen from './pages/Kitchen'
import DayEndSettlement from './pages/DayEndSettlement'
import Login from './pages/Login'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { LanguageProvider } from './context/LanguageContext'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
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
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pos" element={<POS />} />
              <Route path="orders" element={<Orders />} />
              <Route path="menu" element={<Menu />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="kitchen" element={<Kitchen />} />
              <Route path="settlement" element={<DayEndSettlement />} />
            </Route>
          </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
