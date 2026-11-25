import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUser, getMyStaffProfile } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Staff profile (role: 'admin' | 'cashier'); null when the login has none.
  const [staff, setStaff] = useState(null)
  const [profileUserId, setProfileUserId] = useState(null) // whose profile is loaded
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    // Check current session
    const checkUser = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setLoading(false)
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setStaff(null)
      setProfileUserId(null)
      return null
    }
    const { data, error } = await getMyStaffProfile(user.id)
    setProfileError(error || null)
    setStaff(error ? null : data)
    setProfileUserId(user.id)
    return data
  }, [user])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const isStaff = !!staff?.is_active
  const value = {
    user,
    loading: loading || (!!user && profileUserId !== user.id),
    isAuthenticated: !!user,
    staff,
    role: isStaff ? staff.role : null,
    isStaff,
    isAdmin: isStaff && staff.role === 'admin',
    profileError,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
