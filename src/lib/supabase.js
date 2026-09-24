import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Categories
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  return { data, error }
}

// Menu Items
export const getMenuItems = async (categoryId = null) => {
  let query = supabase
    .from('menu_items')
    .select('*, categories(name, icon)')
    .eq('is_available', true)
  
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  
  const { data, error } = await query.order('name')
  return { data, error }
}

// Orders
export const createOrder = async (orderData) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single()
  return { data, error }
}

export const createOrderItems = async (items) => {
  const { data, error } = await supabase
    .from('order_items')
    .insert(items)
    .select()
  return { data, error }
}

export const getOrders = async (status = null, date = null) => {
  let query = supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
  
  if (status) {
    query = query.eq('order_status', status)
  }
  
  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    
    query = query
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
  }
  
  const { data, error } = await query
  return { data, error }
}

export const getTodayOrders = async () => {
  const today = new Date()
  return getOrders(null, today)
}

export const updateOrderStatus = async (orderId, status) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ order_status: status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()
  return { data, error }
}

// Settings
export const getSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
  return { data, error }
}

// Real-time subscriptions
export const subscribeToOrders = (callback) => {
  return supabase
    .channel('orders')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'orders' },
      callback
    )
    .subscribe()
}

// Reports
export const getDailySales = async (date) => {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .neq('order_status', 'CANCELLED')
  
  return { data, error }
}
