// Diagnostic: list all categories (active + inactive) and item counts
// Run: node --env-file=.env scripts/diagnose-menu.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function main() {
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .select('id, name, is_active, display_order')
    .order('display_order')
  if (catErr) {
    console.error('categories error:', catErr.message)
    return
  }

  const { data: items, error: itemErr } = await supabase
    .from('menu_items')
    .select('id, name, category_id, is_available')
  if (itemErr) {
    console.error('menu_items error:', itemErr.message)
    return
  }

  console.log(`\nTotal categories: ${cats.length}`)
  console.log(`Total menu_items: ${items.length}\n`)

  const byName = new Map()
  for (const c of cats) {
    if (!byName.has(c.name)) byName.set(c.name, [])
    byName.get(c.name).push(c)
  }

  console.log('--- Categories (name | active | #items) ---')
  for (const [name, list] of byName) {
    if (list.length > 1) {
      console.log(`⚠ DUPLICATE "${name}" — ${list.length} rows:`)
      for (const c of list) {
        const n = items.filter(i => i.category_id === c.id).length
        console.log(`    id=${c.id} active=${c.is_active} order=${c.display_order} items=${n}`)
      }
    } else {
      const c = list[0]
      const n = items.filter(i => i.category_id === c.id).length
      console.log(`${c.is_active ? '✓' : '✗ INACTIVE'}  ${name}  (items: ${n})`)
    }
  }

  const unavailable = items.filter(i => !i.is_available).length
  const orphan = items.filter(i => !i.category_id).length
  console.log(`\nUnavailable items: ${unavailable}`)
  console.log(`Items with no category: ${orphan}`)
}

main()
