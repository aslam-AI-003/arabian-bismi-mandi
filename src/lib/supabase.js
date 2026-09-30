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
export const getMenuItems = async (categoryId = null, includeUnavailable = false) => {
  let query = supabase
    .from('menu_items')
    .select('*, categories(name, icon)')
  
  if (!includeUnavailable) {
    query = query.eq('is_available', true)
  }
  
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  
  const { data, error } = await query.order('name')
  return { data, error }
}

export const createMenuItem = async (itemData) => {
  const { data, error } = await supabase
    .from('menu_items')
    .insert([itemData])
    .select()
    .single()
  return { data, error }
}

export const updateMenuItem = async (id, itemData) => {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ ...itemData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteMenuItem = async (id) => {
  const { data, error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
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

export const getOrdersByDateRange = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export const getActiveOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .in('order_status', ['PENDING', 'PREPARING', 'READY'])
    .order('created_at', { ascending: true })
  
  return { data, error }
}

// ============================================
// OFFERS
// ============================================

export const getOffers = async (activeOnly = false) => {
  let query = supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (activeOnly) {
    query = query.eq('is_active', true)
  }
  
  const { data, error } = await query
  return { data, error }
}

export const createOffer = async (offerData) => {
  const { data, error } = await supabase
    .from('offers')
    .insert([offerData])
    .select()
    .single()
  return { data, error }
}

export const updateOffer = async (id, offerData) => {
  const { data, error } = await supabase
    .from('offers')
    .update({ ...offerData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteOffer = async (id) => {
  const { data, error } = await supabase
    .from('offers')
    .delete()
    .eq('id', id)
  return { data, error }
}

// ============================================
// CUSTOMERS (from orders)
// ============================================

export const getCustomers = async () => {
  // Get unique customers from orders who have phone numbers
  const { data, error } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, created_at')
    .not('customer_phone', 'is', null)
    .not('customer_phone', 'eq', '')
    .order('created_at', { ascending: false })
  
  if (error) return { data: null, error }
  
  // Aggregate unique customers with order count and last visit
  const customerMap = new Map()
  data?.forEach(order => {
    const phone = order.customer_phone?.trim()
    if (!phone) return
    
    if (customerMap.has(phone)) {
      const existing = customerMap.get(phone)
      existing.order_count += 1
      // Keep the most recent name
      if (order.customer_name && !existing.customer_name) {
        existing.customer_name = order.customer_name
      }
    } else {
      customerMap.set(phone, {
        customer_phone: phone,
        customer_name: order.customer_name || '',
        order_count: 1,
        last_visit: order.created_at,
      })
    }
  })
  
  const customers = Array.from(customerMap.values())
    .sort((a, b) => new Date(b.last_visit) - new Date(a.last_visit))
  
  return { data: customers, error: null }
}
