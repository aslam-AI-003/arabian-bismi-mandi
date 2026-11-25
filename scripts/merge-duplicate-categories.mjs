// Cleans up duplicate/split categories found by diagnose-menu.mjs:
//   - Reactivates "Rice & Noodles" (was is_active = false)
//   - Moves items out of legacy split categories into the canonical ones
//     (skips moving an item if an item with the same name+variant already
//     exists in the canonical category — deletes the legacy duplicate instead)
//   - Deletes the now-empty legacy categories
//
// Run: node --env-file=.env scripts/merge-duplicate-categories.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const mergeMap = {
  'Chicken Rice & Noodles': 'Rice & Noodles',
  'Beef Rice & Noodles': 'Rice & Noodles',
  'Egg': 'Egg & Indian Breads',
  'Indian Breads': 'Egg & Indian Breads',
  'Chicken Gravy': 'Gravy Varieties',
  'Beef Gravy': 'Gravy Varieties',
  'Chicken Chinese': 'Chinese Special',
  'Beef Chinese': 'Chinese Special',
  'Mojito': 'Mojito & Drinks',
  'Kebab': 'Kebab & Tawa Spl',
}

function keyOf(name, variant) {
  return `${name.trim().toLowerCase()}|${(variant || '').trim().toLowerCase()}`
}

async function main() {
  // 1. Reactivate Rice & Noodles
  const { error: reactErr } = await supabase
    .from('categories')
    .update({ is_active: true })
    .eq('name', 'Rice & Noodles')
  if (reactErr) console.error('Failed to reactivate Rice & Noodles:', reactErr.message)
  else console.log('✓ Reactivated "Rice & Noodles"')

  // 2. Load all categories + items fresh
  const { data: cats, error: catErr } = await supabase.from('categories').select('id, name')
  if (catErr) { console.error(catErr.message); return }
  const catIdByName = new Map(cats.map(c => [c.name, c.id]))

  const { data: items, error: itemErr } = await supabase
    .from('menu_items')
    .select('id, name, variant, category_id, price')
  if (itemErr) { console.error(itemErr.message); return }

  let moved = 0, deletedDup = 0, deletedCats = 0

  for (const [legacyName, canonicalName] of Object.entries(mergeMap)) {
    const legacyId = catIdByName.get(legacyName)
    const canonicalId = catIdByName.get(canonicalName)
    if (!legacyId) { console.log(`(skip) legacy category "${legacyName}" not found`); continue }
    if (!canonicalId) { console.log(`(skip) canonical category "${canonicalName}" not found`); continue }

    const canonicalKeys = new Set(
      items.filter(i => i.category_id === canonicalId).map(i => keyOf(i.name, i.variant))
    )
    const legacyItems = items.filter(i => i.category_id === legacyId)

    for (const item of legacyItems) {
      const k = keyOf(item.name, item.variant)
      if (canonicalKeys.has(k)) {
        // duplicate already exists in canonical category -> remove legacy row
        const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
        if (error) console.error(`  ✗ delete dup "${item.name}" failed:`, error.message)
        else deletedDup++
      } else {
        // move it over
        const { error } = await supabase.from('menu_items').update({ category_id: canonicalId }).eq('id', item.id)
        if (error) console.error(`  ✗ move "${item.name}" failed:`, error.message)
        else { moved++; canonicalKeys.add(k) }
      }
    }

    // delete the now-empty legacy category
    const { error: delCatErr } = await supabase.from('categories').delete().eq('id', legacyId)
    if (delCatErr) console.error(`  ✗ delete category "${legacyName}" failed:`, delCatErr.message)
    else { deletedCats++; console.log(`✓ merged "${legacyName}" -> "${canonicalName}"`) }
  }

  console.log(`\nDone. Items moved: ${moved}, duplicate items removed: ${deletedDup}, legacy categories deleted: ${deletedCats}`)
}

main()
