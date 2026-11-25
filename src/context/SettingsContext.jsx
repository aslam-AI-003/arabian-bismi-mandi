import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSettings, settingsToMap } from '../lib/supabase'
import { billConfigFromSettings } from '../lib/billing'
import { useAuth } from './AuthContext'

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Raw materials', 'Meat & chicken', 'Vegetables', 'Gas', 'Packaging',
  'Electricity', 'Rent', 'Staff salaries', 'Maintenance', 'Other',
]

const SettingsContext = createContext({ settings: {}, billConfig: billConfigFromSettings({}), ready: false })

function parseList(value, fallback) {
  try {
    const v = JSON.parse(value)
    return Array.isArray(v) && v.length ? v.map(String) : fallback
  } catch {
    return fallback
  }
}

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [settings, setSettings] = useState({})
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error } = await getSettings()
    if (!error && data) setSettings(settingsToMap(data))
    setReady(true)
    return data
  }, [])

  useEffect(() => {
    if (isAuthenticated) refresh()
  }, [isAuthenticated, refresh])

  const value = useMemo(() => ({
    settings,
    ready,
    refresh,
    billConfig: billConfigFromSettings(settings),
    setupDone: settings.setup_done !== 'false', // missing key (old DB) counts as done
    cashierCanDiscount: settings.cashier_can_discount === 'true',
    cashierCanCancel: settings.cashier_can_cancel !== 'false',
    expenseCategories: parseList(settings.expense_categories, DEFAULT_EXPENSE_CATEGORIES),
  }), [settings, ready, refresh])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useAppSettings = () => useContext(SettingsContext)
