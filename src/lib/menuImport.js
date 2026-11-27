// CSV menu import. Format: Category,Item,Price,Description,Variant,Cost
// (Description, Variant and Cost are optional; Cost = cost of one plate). A header row is detected and its
// column names decide the order.

/** Minimal RFC 4180 CSV parser (quotes, commas and newlines inside quotes). */
export function parseCsv(text) {
  const out = []
  let row = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1 } else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',' || ch === '\t') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell); out.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row) }
  return out.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean))
}

const DEFAULT_COLS = { category: 0, name: 1, price: 2, description: 3, variant: 4, cost: 5 }

function headerColumns(row) {
  const lower = row.map((c) => c.toLowerCase())
  if (!lower.some((c) => c.includes('category')) || !lower.some((c) => /item|name/.test(c))) return null
  const find = (re) => lower.findIndex((c) => re.test(c))
  return {
    category: find(/category/),
    name: find(/^(item|name|item name)$/) >= 0 ? find(/^(item|name|item name)$/) : find(/item|name/),
    price: find(/^(price|rate|amount|selling price|mrp)$/) >= 0 ? find(/^(price|rate|amount|selling price|mrp)$/) : find(/price|rate|amount/),
    cost: find(/cost/),
    description: find(/desc/),
    variant: find(/variant|size|portion/),
  }
}

/** Returns { items: [{ category, name, price, description, variant }], errors: [] } */
export function csvToMenu(text) {
  const rows = parseCsv(String(text || '').replace(/^\ufeff/, ''))
  const items = []
  const errors = []
  let cols = DEFAULT_COLS
  rows.forEach((r, i) => {
    if (i === 0) {
      const h = headerColumns(r)
      if (h) { cols = h; return }
    }
    const get = (k) => (cols[k] >= 0 ? (r[cols[k]] || '').trim() : '')
    const category = get('category')
    const name = get('name')
    const priceRaw = get('price')
    const price = Number(priceRaw.replace(/[₹,\s]|rs\.?/gi, ''))
    if (!category || !name) { errors.push(`Line ${i + 1}: category and item name are required.`); return }
    if (priceRaw === '' || !Number.isFinite(price) || price < 0) {
      errors.push(`Line ${i + 1}: "${name}" has an invalid price "${priceRaw}".`)
      return
    }
    const costRaw = get('cost')
    const cost = costRaw === '' ? null : Number(costRaw.replace(/[₹,\s]|rs\.?/gi, ''))
    if (cost != null && (!Number.isFinite(cost) || cost < 0)) {
      errors.push(`Line ${i + 1}: "${name}" has an invalid cost "${costRaw}".`)
      return
    }
    items.push({ category, name, price, description: get('description'), variant: get('variant') || null, ...(cost != null ? { cost } : {}) })
  })
  return { items, errors }
}

const key = (...parts) => parts.map((p) => String(p || '').trim().toLowerCase()).join('::')

/**
 * Creates missing categories and menu items. Items that already exist (same
 * category + name + variant) are skipped, so prices you edited are never
 * overwritten.
 */
export async function importMenu(supabase, items) {
  const [catRes, itemRes] = await Promise.all([
    supabase.from('categories').select('id, name, display_order'),
    supabase.from('menu_items').select('id, name, variant, category_id'),
  ])
  if (catRes.error) throw catRes.error
  if (itemRes.error) throw itemRes.error

  const catByName = new Map(catRes.data.map((c) => [key(c.name), c]))
  const existing = new Map(itemRes.data.map((m) => [key(m.category_id, m.name, m.variant), m.id]))
  const costRows = [] // costs for items that already exist (cost may be updated)
  let maxOrder = catRes.data.reduce((m, c) => Math.max(m, c.display_order || 0), 0)
  let createdCats = 0
  let skipped = 0
  const toInsert = []

  for (const it of items) {
    let cat = catByName.get(key(it.category))
    if (!cat) {
      maxOrder += 1
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: it.category.trim(), icon: '🍽️', display_order: maxOrder, is_active: true }])
        .select('id, name, display_order')
        .single()
      if (error) throw error
      cat = data
      catByName.set(key(it.category), cat)
      createdCats += 1
    }
    const k = key(cat.id, it.name, it.variant)
    if (existing.has(k)) {
      skipped += 1
      if (it.cost != null && existing.get(k)) costRows.push({ menu_item_id: existing.get(k), cost_price: it.cost })
      continue
    }
    existing.set(k, null)
    toInsert.push({
      _cost: it.cost,
      category_id: cat.id,
      name: it.name.trim(),
      variant: it.variant || null,
      price: it.price,
      description: it.description || null,
      is_available: true,
    })
  }

  for (let i = 0; i < toInsert.length; i += 200) {
    const batch = toInsert.slice(i, i + 200)
    const { data, error } = await supabase.from('menu_items').insert(batch.map(({ _cost, ...row }) => row)).select('id')
    if (error) throw error
    ;(data || []).forEach((row, j) => { if (batch[j]._cost != null) costRows.push({ menu_item_id: row.id, cost_price: batch[j]._cost }) })
  }
  let costsSaved = 0
  if (costRows.length) {
    const { error } = await supabase.from('pos_item_costs').upsert(costRows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: 'menu_item_id' })
    if (error) throw error
    costsSaved = costRows.length
  }
  return { createdCats, createdItems: toInsert.length, skipped, costsSaved }
}
