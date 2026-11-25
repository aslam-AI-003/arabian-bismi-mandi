// Bill math for the POS preview. The database (place_order) computes the
// final bill with the same rules, so the preview and the saved bill match.
// All math is done in integer paise to avoid floating point drift.

const toPaise = (rupees) => Math.round((Number(rupees) || 0) * 100)
const toRupees = (paise) => Math.round(paise) / 100

export const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI']

export const DEFAULT_BILL_CONFIG = {
  parcelCharge: 0,
  parcelMode: 'per_item', // 'per_item' | 'per_order'
  parcelOrderTypes: ['TAKEAWAY', 'DELIVERY'],
  roundOff: false,
}

/** Build the bill config from the key/value settings map. */
export function billConfigFromSettings(s = {}) {
  const charge = Number(s.parcel_charge)
  return {
    parcelCharge: Number.isFinite(charge) && charge > 0 ? charge : 0,
    parcelMode: s.parcel_mode === 'per_order' ? 'per_order' : 'per_item',
    parcelOrderTypes: String(s.parcel_order_types ?? 'TAKEAWAY,DELIVERY').split(',').map((x) => x.trim()).filter(Boolean),
    roundOff: s.round_off === 'true',
  }
}

const qtyOf = (line) => {
  const q = Math.floor(Number(line.quantity))
  return Number.isFinite(q) && q > 0 ? q : 0
}

/**
 * @param {Array<{price:number, quantity:number}>} items
 * @param {{type:'PERCENTAGE'|'FIXED'|null, value:number}} discount
 * @param {string} orderType DINE_IN | TAKEAWAY | DELIVERY
 */
export function computeBill(items = [], discount = {}, orderType = 'DINE_IN', config = DEFAULT_BILL_CONFIG) {
  const cfg = { ...DEFAULT_BILL_CONFIG, ...config }
  let subP = 0
  let units = 0
  for (const line of items) {
    const q = qtyOf(line)
    subP += toPaise(line.price) * q
    units += q
  }

  let discP = 0
  const value = Math.max(Number(discount?.value) || 0, 0)
  if (discount?.type === 'PERCENTAGE') discP = Math.round((subP * Math.min(value, 100)) / 100)
  else if (discount?.type === 'FIXED') discP = toPaise(value)
  discP = Math.min(Math.max(discP, 0), subP)

  let parcelP = 0
  if (items.length > 0 && cfg.parcelCharge > 0 && cfg.parcelOrderTypes.includes(orderType)) {
    const c = toPaise(cfg.parcelCharge)
    parcelP = cfg.parcelMode === 'per_order' ? c : c * units
  }

  const rawP = subP - discP + parcelP
  const totalP = cfg.roundOff ? Math.round(rawP / 100) * 100 : rawP

  return {
    itemCount: units,
    subtotal: toRupees(subP),
    discount: toRupees(discP),
    parcelCharge: toRupees(parcelP),
    roundOff: toRupees(totalP - rawP),
    total: toRupees(totalP),
  }
}

export const sumAmounts = (list = []) => toRupees(list.reduce((s, p) => s + toPaise(p.amount), 0))

export const round2 = (n) => toRupees(toPaise(n))

/** Remaining amount to collect on an order. */
export function balanceDue(order) {
  if (!order || order.order_status === 'CANCELLED') return 0
  return toRupees(Math.max(toPaise(order.total_amount) - toPaise(order.paid_amount), 0))
}

/** Validate split payment rows before sending. Returns an error string or null. */
export function validatePayments(due, rows = []) {
  if (rows.length === 0) return 'Add at least one payment.'
  for (const r of rows) {
    if (!PAYMENT_METHODS.includes(r.method)) return 'Invalid payment method.'
    const a = Number(r.amount)
    if (!Number.isFinite(a) || a <= 0) return 'Each payment amount must be more than zero.'
  }
  if (toPaise(sumAmounts(rows)) > toPaise(due)) return 'Payments are more than the amount due.'
  return null
}

export function cashChange(tendered, due) {
  const t = toPaise(tendered)
  const d = toPaise(due)
  return t > d ? toRupees(t - d) : 0
}

/** Totals per method from ledger rows: { CASH, CARD, UPI, ... } (payments minus refunds). */
export function netByMethod(payments = []) {
  const out = { CASH: 0, CARD: 0, UPI: 0 }
  for (const p of payments) {
    const sign = p.kind === 'REFUND' ? -1 : 1
    const m = p.method === 'WALLET' ? 'UPI' : p.method
    out[m] = (out[m] || 0) + sign * toPaise(p.amount)
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, toRupees(v)]))
}

export const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  }))

// Database error codes (see database/sng_features_migration.sql) -> messages.
const ERRORS = {
  TABLE_OCCUPIED: { en: 'That table already has a running order.', ta: 'அந்த டேபிளில் ஏற்கனவே ஆர்டர் உள்ளது.' },
  TABLE_REQUIRED: { en: 'Select a table for dine-in.', ta: 'டைன்-இன்க்கு டேபிள் தேர்வு செய்யவும்.' },
  DISCOUNT_NOT_ALLOWED: { en: 'Only an admin can give discounts.', ta: 'தள்ளுபடி அட்மின் மட்டுமே கொடுக்க முடியும்.' },
  CANCEL_NOT_ALLOWED: { en: 'Only an admin can cancel orders.', ta: 'ஆர்டர் ரத்து அட்மின் மட்டுமே செய்ய முடியும்.' },
  ADMIN_ONLY: { en: 'Only an admin can do this.', ta: 'இது அட்மின் மட்டுமே செய்ய முடியும்.' },
  NOT_STAFF: { en: 'This login has no active staff profile. Ask the admin.', ta: 'இந்த லாகினுக்கு அனுமதி இல்லை. அட்மினை கேளுங்கள்.' },
  CONFLICT: { en: 'This order was changed on another device. Reload and try again.', ta: 'இந்த ஆர்டர் வேறு சாதனத்தில் மாற்றப்பட்டது. ரீலோட் செய்யவும்.' },
  PAYMENT_EXCEEDS_TOTAL: { en: 'Payments are more than the bill total.', ta: 'செலுத்தும் தொகை பில் தொகையை விட அதிகம்.' },
  ORDER_HAS_PAYMENTS: { en: 'This order already has payments, so items cannot be changed.', ta: 'பணம் செலுத்திய ஆர்டரில் பொருட்களை மாற்ற முடியாது.' },
  REFUND_FIRST: { en: 'Money has been paid on this order. Refund it first, then cancel.', ta: 'இந்த ஆர்டரில் பணம் செலுத்தப்பட்டுள்ளது. முதலில் திருப்பி கொடுத்து பின் ரத்து செய்யவும்.' },
  LAST_ADMIN: { en: 'Keep at least one active admin.', ta: 'குறைந்தது ஒரு அட்மின் இருக்க வேண்டும்.' },
}

export function dbErrorMessage(error, language = 'en') {
  const msg = String(error?.message || error || 'Something went wrong')
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg)) {
    return language === 'ta' ? 'இணைய இணைப்பு இல்லை. மீண்டும் முயற்சிக்கவும்.' : 'No internet connection. Try again.'
  }
  const code = msg.split(':')[0].trim()
  if (ERRORS[code]) return ERRORS[code][language] || ERRORS[code].en
  // "CODE: human text" -> human text
  const m = msg.match(/^[A-Z_]+:\s*(.+)$/)
  return m ? m[1] : msg
}

/**
 * Extra receipt lines for the new billing features. Every value is empty or
 * zero for old-style bills, so those receipts print exactly as before.
 */
export function receiptExtras(order = {}) {
  const parcel = Number(order.parcel_charge) || 0
  const roundOff = Number(order.round_off) || 0
  const pays = (order.payments || []).filter((p) => p.kind === 'PAYMENT')
  const byMethod = netByMethod(pays)
  const methods = Object.entries(byMethod).filter(([, v]) => v > 0)
  const due = balanceDue(order)
  const refunded = Number(order.refunded_amount) || 0
  const unpaid = order.payment_status === 'PENDING' && Number(order.total_amount) > 0
  const r2 = (v) => Number(v).toFixed(2)
  // One line per payment, like SIP N' GOSSIP: "Paid - CASH  200.00"
  // with "Cash received 500.00 / Change 300.00" under cash payments.
  const paymentLines = pays.map((p) => ({
    label: `Paid - ${p.method}`,
    amount: Number(p.amount) || 0,
    note: p.method === 'CASH' && Number(p.tendered) > 0
      ? `Cash received ₹${r2(p.tendered)} / Change ₹${r2(p.change_given || 0)}`
      : (p.reference ? `Ref: ${p.reference}` : ''),
  }))
  const created = order.created_at ? new Date(order.created_at) : null
  return {
    billNo: order.order_number || '',
    cashier: order.created_by_name || '',
    dateTime: created ? created.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '',
    typeLabel: { DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery' }[order.order_type] || (order.order_type || ''),
    paymentLines,
    parcel,
    roundOff,
    splitLines: methods.length > 1 ? methods.map(([m, v]) => ({ label: m, amount: v })) : [],
    paid: Number(order.paid_amount) || 0,
    due,
    refunded,
    paymentLabel: unpaid ? 'PENDING' : (order.payment_method || 'CASH'),
  }
}

/** "2 x ₹20.00" under an item when more than one was ordered, else ''. */
export function unitLine(item) {
  const q = Number(item.quantity) || 0
  return q > 1 ? `${q} x ₹${Number(item.unit_price ?? item.price ?? 0).toFixed(2)}` : ''
}
