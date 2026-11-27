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

// Staff log in with their phone number instead of an email.
// Supabase Auth needs an email internally, so we convert the phone
// number to a fixed-format "fake" email behind the scenes — the UI
// only ever shows/asks for the phone number.
export const phoneToAuthEmail = (phone) => {
  const digits = (phone || '').replace(/\D/g, '')
  return `${digits}@staff.arabianbismimandi.app`
}

export const signInWithPhone = async (phone, password) => {
  return signIn(phoneToAuthEmail(phone), password)
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
    .select('*, order_items(*), payments:pos_payments(*)')
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
    .select('*, order_items(*), payments:pos_payments(*)')
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

const OFFER_IMAGES_BUCKET = 'offer-images'

// Upload an offer image file to Supabase Storage and return its public URL
export const uploadOfferImage = async (file) => {
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(OFFER_IMAGES_BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false })

  if (uploadError) return { data: null, error: uploadError }

  const { data } = supabase.storage.from(OFFER_IMAGES_BUCKET).getPublicUrl(fileName)
  return { data: { publicUrl: data.publicUrl, path: fileName }, error: null }
}

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

// ============================================
// SETTLEMENTS
// ============================================

export const getSettlement = async (date) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('settlement_date', dateStr)
    .single()
  return { data, error }
}

export const getSettlements = async (limit = 30) => {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .order('settlement_date', { ascending: false })
    .limit(limit)
  return { data, error }
}

export const upsertSettlement = async (settlementData) => {
  const { data, error } = await supabase
    .from('settlements')
    .upsert(
      { ...settlementData, updated_at: new Date().toISOString() },
      { onConflict: 'settlement_date' }
    )
    .select()
    .single()
  return { data, error }
}

// Cash Outs
export const getCashOuts = async (date) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('cash_outs')
    .select('*')
    .eq('settlement_date', dateStr)
    .order('created_at', { ascending: true })
  return { data, error }
}

export const addCashOut = async (entry) => {
  const { data, error } = await supabase
    .from('cash_outs')
    .insert([entry])
    .select()
    .single()
  return { data, error }
}

export const deleteCashOut = async (id) => {
  const { data, error } = await supabase
    .from('cash_outs')
    .delete()
    .eq('id', id)
  return { data, error }
}

// ============================================
// SNG FEATURES (see database/sng_features_migration.sql)
// Orders, payments, refunds and cancels go through database functions so
// they are atomic, permission-checked and safe to retry.
// ============================================

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args)
  return { data, error }
}

/** Lightweight round trip to the database (used by the online indicator). */
export const pingDatabase = async () => {
  const { error } = await supabase.from('settings').select('key', { head: true, count: 'exact' }).limit(1)
  if (error) throw error
  return true
}

export const settingsToMap = (rows = []) => Object.fromEntries(rows.map((r) => [r.key, r.value]))

export const saveSettings = async (map) => {
  const now = new Date().toISOString()
  const rows = Object.entries(map).map(([key, value]) => ({
    key,
    value: value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value),
    updated_at: now,
  }))
  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
  return { error }
}

// Orders
export const placeOrder = (order, items, payments = []) =>
  rpc('place_order', { p_order: order, p_items: items, p_payments: payments })

export const updateOrderItems = (orderId, expectedVersion, items, extra = {}) =>
  rpc('update_order_items', { p_order_id: orderId, p_expected_version: expectedVersion, p_items: items, p_extra: extra })

export const addPayments = (orderId, payments) =>
  rpc('add_payments', { p_order_id: orderId, p_payments: payments })

export const recordRefund = (orderId, refund) =>
  rpc('record_refund', { p_order_id: orderId, p_refund: refund })

export const cancelOrder = (orderId, reason) =>
  rpc('cancel_order', { p_order_id: orderId, p_reason: reason || null })

export const getOrderById = async (orderId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), payments:pos_payments(*)')
    .eq('id', orderId)
    .single()
  if (data?.order_items) data.order_items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  return { data, error }
}

export const getPaymentsByDateRange = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('pos_payments')
    .select('*, orders(order_number, order_status, order_type)')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true })
  return { data, error }
}

export const getPendingBalanceOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), payments:pos_payments(*)')
    .in('payment_status', ['PENDING', 'PARTIAL'])
    .neq('order_status', 'CANCELLED')
    .gt('total_amount', 0)
    .order('created_at', { ascending: true })
  return { data, error }
}

// Dining tables
export const getTables = async (includeInactive = false) => {
  let query = supabase
    .from('dining_tables')
    .select('*, active_order:orders!active_order_id(id, order_number, order_status, payment_status, total_amount, paid_amount, created_at, version, customer_name)')
    .order('display_order')
    .order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  return { data, error }
}

export const createTables = async (rows) => {
  const { data, error } = await supabase.from('dining_tables').insert(rows).select()
  return { data, error }
}

export const updateTable = async (id, values) => {
  const { data, error } = await supabase
    .from('dining_tables')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteTable = async (id) => {
  const { error } = await supabase.from('dining_tables').delete().eq('id', id)
  return { error }
}

export const subscribeToTables = (callback) => supabase
  .channel('dining_tables')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_tables' }, callback)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
  .subscribe()

// Expenses
export const getExpenses = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('pos_expenses')
    .select('*')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
  return { data, error }
}

export const saveExpense = async (expense) => {
  const row = { ...expense, updated_at: new Date().toISOString() }
  const query = expense.id
    ? supabase.from('pos_expenses').update(row).eq('id', expense.id)
    : supabase.from('pos_expenses').insert([row])
  const { data, error } = await query.select().single()
  return { data, error }
}

export const deleteExpense = async (id) => {
  const { error } = await supabase.from('pos_expenses').delete().eq('id', id)
  return { error }
}

// Staff
export const getMyStaffProfile = async (userId) => {
  const { data, error } = await supabase.from('pos_staff').select('*').eq('user_id', userId).maybeSingle()
  return { data, error }
}

export const getStaffList = async () => {
  const { data, error } = await supabase.from('pos_staff').select('*').order('role').order('name')
  return { data, error }
}

export const getBootstrapStatus = () => rpc('staff_bootstrap_status', {})

export const claimFirstAdmin = (name) => rpc('claim_first_admin', { p_name: name })

export const createStaff = (phone, password, name, role) =>
  rpc('admin_create_staff', { p_phone: phone, p_password: password, p_name: name, p_role: role })

export const updateStaff = (userId, name, role, active) =>
  rpc('admin_update_staff', { p_user_id: userId, p_name: name, p_role: role, p_active: active })

export const setStaffPassword = (userId, password) =>
  rpc('admin_set_staff_password', { p_user_id: userId, p_password: password })

const OPEN_STATUSES = ['PENDING', 'PREPARING', 'READY']

/**
 * Orders for the Orders page tabs.
 * active: open, nothing paid · pending: open, part paid ·
 * completed / cancelled: created between from and to (ISO strings).
 */
export const getOrdersForTab = async (tab, from, to) => {
  let query = supabase
    .from('orders')
    .select('*, order_items(*), payments:pos_payments(*)')
    .order('created_at', { ascending: false })
  if (tab === 'active') query = query.in('order_status', OPEN_STATUSES).eq('paid_amount', 0)
  else if (tab === 'pending') query = query.in('order_status', OPEN_STATUSES).gt('paid_amount', 0)
  else {
    query = query
      .eq('order_status', tab === 'cancelled' ? 'CANCELLED' : 'COMPLETED')
      .gte('created_at', from)
      .lte('created_at', to)
  }
  const { data, error } = await query.limit(1000)
  data?.forEach((o) => o.order_items?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
  return { data, error }
}

// ============================================
// DASHBOARD (paged: Supabase returns at most 1000 rows per request)
// ============================================
const PAGE = 1000

async function fetchAllPages(build) {
  const all = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) return { data: null, error }
    all.push(...(data || []))
    if (!data || data.length < PAGE) return { data: all, error: null }
  }
}

/** Orders created in [from, to] with items (for the selected period). */
export const getDashboardOrders = (from, to) => fetchAllPages(() => supabase
  .from('orders')
  .select('id, order_number, order_type, order_status, payment_status, table_number, customer_name, customer_phone, total_amount, paid_amount, refunded_amount, created_at, order_items(menu_item_id, item_name, variant, quantity, total_price)')
  .gte('created_at', from)
  .lte('created_at', to)
  .order('created_at', { ascending: true }))

/** Light rows for the sales trend chart (up to 12 months). */
export const getTrendOrders = (from, to) => fetchAllPages(() => supabase
  .from('orders')
  .select('total_amount, order_status, created_at')
  .eq('order_status', 'COMPLETED')
  .gte('created_at', from)
  .lte('created_at', to)
  .order('created_at', { ascending: true }))

export const getDashboardPayments = (from, to) => fetchAllPages(() => supabase
  .from('pos_payments')
  .select('kind, method, amount, orders(order_status)')
  .gte('created_at', from)
  .lte('created_at', to)
  .order('created_at', { ascending: true }))

/** Number of open orders (not completed / cancelled). */
export const getOpenOrderCount = async () => {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('order_status', ['PENDING', 'PREPARING', 'READY'])
  return { count: count || 0, error }
}

/** menu_item_id -> category name, for the category sales chart. */
export const getMenuCategoryMap = async () => {
  const { data, error } = await supabase.from('menu_items').select('id, categories(name)')
  return { data: new Map((data || []).map((m) => [m.id, m.categories?.name || 'Other'])), error }
}

// ============================================
// REPORTS (paged)
// ============================================
export const getReportOrders = (from, to) => fetchAllPages(() => supabase
  .from('orders')
  .select('id, order_number, order_type, order_status, payment_status, payment_method, table_number, customer_name, customer_phone, subtotal, discount_type, discount_value, discount_amount, parcel_charge, round_off, total_amount, paid_amount, refunded_amount, cancel_reason, created_by_name, created_at, order_items(menu_item_id, item_name, variant, quantity, total_price)')
  .gte('created_at', from)
  .lte('created_at', to)
  .order('created_at', { ascending: true }))

export const getReportPayments = (from, to) => fetchAllPages(() => supabase
  .from('pos_payments')
  .select('kind, method, amount, reference, reason, created_by_name, created_at, orders(order_number, order_status)')
  .gte('created_at', from)
  .lte('created_at', to)
  .order('created_at', { ascending: true }))

/** Light rows for the "vs previous period" comparison. */
export const getCompareData = async (from, to, fromDate, toDate) => {
  const [o, p, e] = await Promise.all([
    fetchAllPages(() => supabase.from('orders').select('order_status, total_amount').gte('created_at', from).lte('created_at', to).order('created_at')),
    fetchAllPages(() => supabase.from('pos_payments').select('kind, amount, orders(order_status)').eq('kind', 'REFUND').gte('created_at', from).lte('created_at', to).order('created_at')),
    getExpenses(fromDate, toDate),
  ])
  return { data: { orders: o.data || [], ledger: p.data || [], expenses: e.data || [] }, error: o.error || p.error || e.error }
}
