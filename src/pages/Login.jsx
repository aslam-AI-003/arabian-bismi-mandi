import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      toast.error(error.message || 'Login failed')
      setLoading(false)
      return
    }

    toast.success('Welcome back!')
    navigate('/dashboard')
  }

  // For demo, allow bypass
  const handleDemo = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-primary via-dark-secondary to-dark-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto rounded-full border-4 border-brand-gold bg-gradient-to-br from-dark-secondary to-dark-primary flex items-center justify-center shadow-glow mb-4">
            <span className="text-5xl">🍽️</span>
          </div>
          <h1 className="text-3xl font-decorative text-brand-gold">Arabian Bismi</h1>
          <p className="text-muted mt-1">Mandi Restaurant</p>
          <p className="text-cream/60 text-sm mt-2 font-arabic">مطعم العربي بسمي مندي</p>
        </div>

        {/* Login Form */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-cream text-center mb-6">Welcome Back</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-muted text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div>
              <label className="block text-muted text-sm mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-brand-gold/20">
            <button
              onClick={handleDemo}
              className="btn-secondary w-full"
            >
              Continue as Demo
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-muted text-sm mt-6">
          "Good Food Brings People Together"
        </p>
      </div>
    </div>
  )
}
