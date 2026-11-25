// One-time menu updater — does the SAME thing as database/menu_update_2026.sql,
// but goes through the Supabase JS client (same anon key the app itself uses)
// instead of the SQL Editor.
//
// Run it from the project root:
//   node --env-file=.env scripts/seed-menu.mjs
//
// Safe to run more than once: existing items (matched by name + variant +
// category) get their price updated instead of being duplicated.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Run with: node --env-file=.env scripts/seed-menu.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// New categories needed by the updated flipbook menu.
// (Mandi, Majboos, Biriyani & Ghee Rice, Smoked Chicken, Grill, BBQ,
// Tandoori, Shawarma, Momos, Burgers, Fries & Snacks, Dosa, Rice & Noodles,
// Parotta, Ice Cream already exist from the original schema.)
const newCategories = [
  { name: 'Kebab & Tawa Spl', icon: '🍢', display_order: 16 },
  { name: 'Egg & Indian Breads', icon: '🍳', display_order: 17 },
  { name: 'Gravy Varieties', icon: '🍛', display_order: 18 },
  { name: 'Chinese Special', icon: '🥡', display_order: 19 },
  { name: 'Mojito & Drinks', icon: '🍹', display_order: 20 },
]

// [itemName, variant|null, price, categoryName]
const items = [
  // MANDI
  ['Chicken Mandi', 'Single', 150, 'Mandi'],
  ['Chicken Mandi', 'Couple', 500, 'Mandi'],
  ['Chicken Mandi', 'Family', 1000, 'Mandi'],
  ['Mutton Mandi', 'Single', 400, 'Mandi'],
  ['Mutton Mandi', 'Couple', 800, 'Mandi'],
  ['Mutton Mandi', 'Family', 1600, 'Mandi'],
  ['Beef Mandi', 'Single', 350, 'Mandi'],
  ['Beef Mandi', 'Couple', 700, 'Mandi'],
  ['Beef Mandi', 'Family', 1400, 'Mandi'],

  // MAJBOOS
  ['Chicken Majboos', 'Single', 150, 'Majboos'],
  ['Chicken Majboos', 'Couple', 500, 'Majboos'],
  ['Chicken Majboos', 'Family', 1000, 'Majboos'],
  ['Mutton Majboos', 'Single', 400, 'Majboos'],
  ['Mutton Majboos', 'Couple', 800, 'Majboos'],
  ['Mutton Majboos', 'Family', 1600, 'Majboos'],
  ['Beef Majboos', 'Single', 350, 'Majboos'],
  ['Beef Majboos', 'Couple', 700, 'Majboos'],
  ['Beef Majboos', 'Family', 1400, 'Majboos'],

  // BIRIYANI & GHEE RICE
  ['Chicken Thokku Biriyani', null, 120, 'Biriyani & Ghee Rice'],
  ['Chicken 65 Biriyani', null, 130, 'Biriyani & Ghee Rice'],
  ['Beef Thokku Biriyani', null, 120, 'Biriyani & Ghee Rice'],
  ['Ghee Rice + Chicken Gravy', null, 130, 'Biriyani & Ghee Rice'],
  ['Ghee Rice + Beef Gravy', null, 130, 'Biriyani & Ghee Rice'],

  // SMOKED CHICKEN
  ['Chicken 65', '100g', 70, 'Smoked Chicken'],
  ['Chicken Lollipop', '5 pcs', 99, 'Smoked Chicken'],
  ['Chicken Wings', '4 pcs', 120, 'Smoked Chicken'],

  // GRILL
  ['Grill Chicken', 'Quarter', 110, 'Grill'],
  ['Grill Chicken', 'Half', 220, 'Grill'],
  ['Grill Chicken', 'Full', 400, 'Grill'],
  ['Shawaya Chicken', 'Quarter', 120, 'Grill'],
  ['Shawaya Chicken', 'Half', 240, 'Grill'],
  ['Shawaya Chicken', 'Full', 430, 'Grill'],

  // BBQ
  ['Alfaham Chicken', 'Quarter', 110, 'BBQ'],
  ['Alfaham Chicken', 'Half', 220, 'BBQ'],
  ['Alfaham Chicken', 'Full', 400, 'BBQ'],
  ['Hariyali Chicken', 'Quarter', 120, 'BBQ'],
  ['Hariyali Chicken', 'Half', 240, 'BBQ'],
  ['Hariyali Chicken', 'Full', 430, 'BBQ'],
  ['Ifa Chicken', 'Quarter', 150, 'BBQ'],
  ['Ifa Chicken', 'Half', 250, 'BBQ'],
  ['Ifa Chicken', 'Full', 450, 'BBQ'],

  // TANDOORI
  ['Spicy Tandoori Chicken', 'Quarter', 110, 'Tandoori'],
  ['Spicy Tandoori Chicken', 'Half', 220, 'Tandoori'],
  ['Spicy Tandoori Chicken', 'Full', 400, 'Tandoori'],
  ['Hariyali Tandoori Chicken', 'Quarter', 120, 'Tandoori'],
  ['Hariyali Tandoori Chicken', 'Half', 240, 'Tandoori'],
  ['Hariyali Tandoori Chicken', 'Full', 430, 'Tandoori'],

  // MOMOS
  ['Chicken Momos', 'Steamed/Fried, 5 pcs', 80, 'Momos'],
  ['Schezwan Momos', 'Steamed/Fried, 5 pcs', 90, 'Momos'],

  // BURGERS
  ['Chicken Burger', null, 90, 'Burgers'],
  ['Chicken Cheese Burger', null, 100, 'Burgers'],
  ['Beef Burger', null, 100, 'Burgers'],
  ['Beef Cheese Burger', null, 110, 'Burgers'],

  // FRIES & SNACKS
  ['French Fries', null, 60, 'Fries & Snacks'],
  ['Peri Peri Fries', null, 70, 'Fries & Snacks'],
  ['Cheesy Fries', null, 80, 'Fries & Snacks'],
  ['Chicken Loaded Fries', null, 130, 'Fries & Snacks'],
  ['Beef Loaded Fries', null, 150, 'Fries & Snacks'],
  ['Chicken Nuggets', null, 70, 'Fries & Snacks'],
  ['Chicken Popcorn', null, 80, 'Fries & Snacks'],

  // SHAWARMA
  ['Chicken Shawarma', null, 80, 'Shawarma'],
  ['Beef Shawarma', null, 80, 'Shawarma'],
  ['Chicken Peri Peri Shawarma', null, 90, 'Shawarma'],
  ['Beef Peri Peri Shawarma', null, 90, 'Shawarma'],
  ['Lays Shawarma', null, 50, 'Shawarma'],
  ['Chicken Spl Shawarma', null, 100, 'Shawarma'],
  ['Beef Spl Shawarma', null, 100, 'Shawarma'],

  // KEBAB & TAWA SPL
  ['Chicken Sheekh Kebab', '2 pcs', 100, 'Kebab & Tawa Spl'],
  ['Chicken Tikka', '6 pcs', 100, 'Kebab & Tawa Spl'],
  ['Beef Sheekh Kebab', '2 pcs', 120, 'Kebab & Tawa Spl'],
  ['Beef Tikka', '6 pcs', 120, 'Kebab & Tawa Spl'],
  ['Chicken Tawa Curry', null, 70, 'Kebab & Tawa Spl'],
  ['Beef Tawa Curry', null, 80, 'Kebab & Tawa Spl'],

  // PAROTTA
  ['Bun Parotta', null, 12, 'Parotta'],
  ['Nool Parotta', null, 12, 'Parotta'],
  ['Wheat Parotta', null, 15, 'Parotta'],
  ['Veechu Parotta', null, 40, 'Parotta'],
  ['Egg Veechu Parotta', null, 50, 'Parotta'],
  ['Chicken Kari Parotta', null, 80, 'Parotta'],
  ['Beef Kari Parotta', null, 80, 'Parotta'],
  ['Chicken Kothu Parotta', null, 100, 'Parotta'],
  ['Beef Kothu Parotta', null, 100, 'Parotta'],

  // DOSA
  ['Plain Dosa', null, 50, 'Dosa'],
  ['Ghee Dosa', null, 60, 'Dosa'],
  ['Egg Dosa', null, 60, 'Dosa'],
  ['Onion Dosa', null, 60, 'Dosa'],
  ['Podi Dosa', null, 60, 'Dosa'],
  ['Ghee Podi Dosa', null, 70, 'Dosa'],
  ['Chicken Dosa', null, 80, 'Dosa'],
  ['Beef Dosa', null, 80, 'Dosa'],

  // RICE & NOODLES
  ['Chicken Rice', null, 90, 'Rice & Noodles'],
  ['Schezwan Rice', null, 100, 'Rice & Noodles'],
  ['Chicken Noodles', null, 100, 'Rice & Noodles'],
  ['Schezwan Noodles', null, 120, 'Rice & Noodles'],
  ['Beef Rice', null, 100, 'Rice & Noodles'],
  ['Beef Schezwan Rice', null, 120, 'Rice & Noodles'],
  ['Beef Noodles', null, 100, 'Rice & Noodles'],
  ['Beef Schezwan Noodles', null, 120, 'Rice & Noodles'],

  // EGG & INDIAN BREADS
  ['Off Boil Egg', null, 12, 'Egg & Indian Breads'],
  ['Full Boil Egg', null, 12, 'Egg & Indian Breads'],
  ['Omlette', null, 15, 'Egg & Indian Breads'],
  ['Chicken Omlette', null, 30, 'Egg & Indian Breads'],
  ['Beef Omlette', null, 30, 'Egg & Indian Breads'],
  ['Chicken Kalaki', null, 25, 'Egg & Indian Breads'],
  ['Beef Kalaki', null, 25, 'Egg & Indian Breads'],
  ['Chicken Bread Omlette', null, 50, 'Egg & Indian Breads'],
  ['Beef Bread Omlette', null, 60, 'Egg & Indian Breads'],
  ['Chappathi', '2 pcs', 25, 'Egg & Indian Breads'],
  ['Idiyappam', '1 pc', 10, 'Egg & Indian Breads'],

  // GRAVY VARIETIES
  ['ABM Spl Chicken Gravy', null, 80, 'Gravy Varieties'],
  ['Chicken Pepper Gravy', null, 90, 'Gravy Varieties'],
  ['ABM Spl Chicken Chettinad', null, 90, 'Gravy Varieties'],
  ['Chicken Kadai', null, 90, 'Gravy Varieties'],
  ['ABM Spl Chicken Sukka', null, 90, 'Gravy Varieties'],
  ['Chicken Varuval', null, 100, 'Gravy Varieties'],
  ['ABM Spl Beef Masala', null, 90, 'Gravy Varieties'],
  ['Beef Pepper Gravy', null, 100, 'Gravy Varieties'],
  ['ABM Spl Beef Chettinad', null, 100, 'Gravy Varieties'],
  ['Beef Sukka', null, 90, 'Gravy Varieties'],
  ['Beef Varuval', null, 100, 'Gravy Varieties'],

  // CHINESE SPECIAL
  ['Chilli Chicken', null, 100, 'Chinese Special'],
  ['Chicken Manchurian', null, 100, 'Chinese Special'],
  ['Chicken Schezwan', null, 110, 'Chinese Special'],
  ['Dragon Chicken', null, 100, 'Chinese Special'],
  ['Garlic Chicken', null, 100, 'Chinese Special'],
  ['Black Pepper Chicken', null, 110, 'Chinese Special'],
  ['Chilli Beef', null, 100, 'Chinese Special'],
  ['Beef Manchurian', null, 100, 'Chinese Special'],
  ['Beef Schezwan', null, 110, 'Chinese Special'],
  ['Dragon Beef', null, 110, 'Chinese Special'],
  ['Garlic Beef', null, 100, 'Chinese Special'],
  ['Black Pepper Beef', null, 110, 'Chinese Special'],

  // MOJITO & DRINKS
  ['Mint Mojito', null, 50, 'Mojito & Drinks'],
  ['Blue Lagoon', null, 60, 'Mojito & Drinks'],
  ['Green Apple Mojito', null, 60, 'Mojito & Drinks'],
  ['Strawberry Mojito', null, 60, 'Mojito & Drinks'],
  ['Watermelon Mojito', null, 60, 'Mojito & Drinks'],

  // ICE CREAM
  ['Vanilla Ice Cream', null, 40, 'Ice Cream'],
  ['Chocolate Ice Cream', null, 50, 'Ice Cream'],
  ['Strawberry Ice Cream', null, 50, 'Ice Cream'],
  ['Butter Scotch Ice Cream', null, 60, 'Ice Cream'],
]

async function main() {
  console.log('Connecting to', supabaseUrl)

  // 1. Load existing categories
  const { data: existingCats, error: catErr } = await supabase.from('categories').select('id, name')
  if (catErr) {
    console.error('Could not read categories — check your anon key / RLS policies:', catErr.message)
    process.exit(1)
  }
  const catMap = new Map(existingCats.map(c => [c.name, c.id]))
  console.log(`Found ${existingCats.length} existing categories.`)

  // 2. Create missing categories
  for (const cat of newCategories) {
    if (catMap.has(cat.name)) continue
    const { data, error } = await supabase.from('categories').insert([cat]).select().single()
    if (error) {
      console.error(`  ✗ Failed to create category "${cat.name}":`, error.message)
      continue
    }
    catMap.set(cat.name, data.id)
    console.log(`  + Created category: ${cat.name}`)
  }

  // 3. Load existing menu items (to decide insert vs update)
  const { data: existingItems, error: itemErr } = await supabase
    .from('menu_items')
    .select('id, name, variant, category_id, price')
  if (itemErr) {
    console.error('Could not read menu_items:', itemErr.message)
    process.exit(1)
  }
  const itemKey = (name, variant, categoryId) => `${name}|${variant || ''}|${categoryId}`
  const itemMap = new Map(existingItems.map(i => [itemKey(i.name, i.variant, i.category_id), i]))
  console.log(`Found ${existingItems.length} existing menu items.`)

  let created = 0, updated = 0, skipped = 0
  for (const [name, variant, price, categoryName] of items) {
    const categoryId = catMap.get(categoryName)
    if (!categoryId) {
      console.error(`  ✗ Skipping "${name}" — category "${categoryName}" not found`)
      skipped++
      continue
    }
    const key = itemKey(name, variant, categoryId)
    const existing = itemMap.get(key)

    if (existing) {
      if (Number(existing.price) !== price) {
        const { error } = await supabase.from('menu_items').update({ price }).eq('id', existing.id)
        if (error) {
          console.error(`  ✗ Failed to update "${name}":`, error.message)
        } else {
          updated++
        }
      }
    } else {
      const { error } = await supabase
        .from('menu_items')
        .insert([{ name, variant, price, category_id: categoryId }])
      if (error) {
        console.error(`  ✗ Failed to create "${name}":`, error.message)
      } else {
        created++
      }
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Unchanged: ${items.length - created - updated - skipped}`)
}

main()
