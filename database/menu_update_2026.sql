-- ============================================================
-- ARABIAN BISMI MANDI — FULL MENU UPDATE (from
-- Arabian_Bismi_Mandi_Flipbook_Ready_Menu_Updated.pdf)
-- Run this ONCE in Supabase SQL Editor.
-- Safe to re-run: it will UPDATE prices instead of duplicating
-- rows if an item with the same name+variant+category already
-- exists.
-- ============================================================

-- ------------------------------------------------------------
-- STEP 1: Make items idempotent (adds a unique key so re-running
-- this script later, e.g. for the next price update, just
-- updates prices instead of creating duplicates)
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_name_variant_category
  ON menu_items (name, COALESCE(variant, ''), category_id);

-- ------------------------------------------------------------
-- STEP 2: New categories used by the updated menu
-- (Mandi, Majboos, Biriyani & Ghee Rice, Smoked Chicken, Grill,
-- BBQ, Tandoori, Shawarma, Momos, Burgers, Fries & Snacks, Dosa,
-- Rice & Noodles, Parotta, Ice Cream already exist)
-- ------------------------------------------------------------
INSERT INTO categories (name, icon, display_order)
SELECT 'Kebab & Tawa Spl', '🍢', 16
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Kebab & Tawa Spl');

INSERT INTO categories (name, icon, display_order)
SELECT 'Egg & Indian Breads', '🍳', 17
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Egg & Indian Breads');

INSERT INTO categories (name, icon, display_order)
SELECT 'Gravy Varieties', '🍛', 18
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Gravy Varieties');

INSERT INTO categories (name, icon, display_order)
SELECT 'Chinese Special', '🥡', 19
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Chinese Special');

INSERT INTO categories (name, icon, display_order)
SELECT 'Mojito & Drinks', '🍹', 20
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Mojito & Drinks');

-- ------------------------------------------------------------
-- STEP 3: Menu items
-- ------------------------------------------------------------

-- MANDI
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Mandi', 'Single', 150, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Mandi', 'Couple', 500, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Mandi', 'Family', 1000, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Mutton Mandi', 'Single', 400, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Mutton Mandi', 'Couple', 800, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Mutton Mandi', 'Family', 1600, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Beef Mandi', 'Single', 350, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Beef Mandi', 'Couple', 700, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Beef Mandi', 'Family', 1400, id FROM categories WHERE name = 'Mandi'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- MAJBOOS
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Majboos', 'Single', 150, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Majboos', 'Couple', 500, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Majboos', 'Family', 1000, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Mutton Majboos', 'Single', 400, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Mutton Majboos', 'Couple', 800, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Mutton Majboos', 'Family', 1600, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Beef Majboos', 'Single', 350, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Beef Majboos', 'Couple', 700, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Beef Majboos', 'Family', 1400, id FROM categories WHERE name = 'Majboos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- BIRIYANI & GHEE RICE
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Thokku Biriyani', 120, id FROM categories WHERE name = 'Biriyani & Ghee Rice'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken 65 Biriyani', 130, id FROM categories WHERE name = 'Biriyani & Ghee Rice'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Thokku Biriyani', 120, id FROM categories WHERE name = 'Biriyani & Ghee Rice'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Ghee Rice + Chicken Gravy', 130, id FROM categories WHERE name = 'Biriyani & Ghee Rice'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Ghee Rice + Beef Gravy', 130, id FROM categories WHERE name = 'Biriyani & Ghee Rice'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- SMOKED CHICKEN
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken 65', '100g', 70, id FROM categories WHERE name = 'Smoked Chicken'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Lollipop', '5 pcs', 99, id FROM categories WHERE name = 'Smoked Chicken'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Wings', '4 pcs', 120, id FROM categories WHERE name = 'Smoked Chicken'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- GRILL
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Grill Chicken', 'Quarter', 110, id FROM categories WHERE name = 'Grill'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Grill Chicken', 'Half', 220, id FROM categories WHERE name = 'Grill'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Grill Chicken', 'Full', 400, id FROM categories WHERE name = 'Grill'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Shawaya Chicken', 'Quarter', 120, id FROM categories WHERE name = 'Grill'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Shawaya Chicken', 'Half', 240, id FROM categories WHERE name = 'Grill'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Shawaya Chicken', 'Full', 430, id FROM categories WHERE name = 'Grill'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- BBQ
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Alfaham Chicken', 'Quarter', 110, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Alfaham Chicken', 'Half', 220, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Alfaham Chicken', 'Full', 400, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Hariyali Chicken', 'Quarter', 120, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Hariyali Chicken', 'Half', 240, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Hariyali Chicken', 'Full', 430, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Ifa Chicken', 'Quarter', 150, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Ifa Chicken', 'Half', 250, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Ifa Chicken', 'Full', 450, id FROM categories WHERE name = 'BBQ'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- TANDOORI
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Spicy Tandoori Chicken', 'Quarter', 110, id FROM categories WHERE name = 'Tandoori'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Spicy Tandoori Chicken', 'Half', 220, id FROM categories WHERE name = 'Tandoori'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Spicy Tandoori Chicken', 'Full', 400, id FROM categories WHERE name = 'Tandoori'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Hariyali Tandoori Chicken', 'Quarter', 120, id FROM categories WHERE name = 'Tandoori'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Hariyali Tandoori Chicken', 'Half', 240, id FROM categories WHERE name = 'Tandoori'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Hariyali Tandoori Chicken', 'Full', 430, id FROM categories WHERE name = 'Tandoori'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- MOMOS
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Momos', 'Steamed/Fried, 5 pcs', 80, id FROM categories WHERE name = 'Momos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Schezwan Momos', 'Steamed/Fried, 5 pcs', 90, id FROM categories WHERE name = 'Momos'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- BURGERS
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Burger', 90, id FROM categories WHERE name = 'Burgers'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Cheese Burger', 100, id FROM categories WHERE name = 'Burgers'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Burger', 100, id FROM categories WHERE name = 'Burgers'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Cheese Burger', 110, id FROM categories WHERE name = 'Burgers'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- FRIES & SNACKS
INSERT INTO menu_items (name, price, category_id)
SELECT 'French Fries', 60, id FROM categories WHERE name = 'Fries & Snacks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Peri Peri Fries', 70, id FROM categories WHERE name = 'Fries & Snacks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Cheesy Fries', 80, id FROM categories WHERE name = 'Fries & Snacks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Loaded Fries', 130, id FROM categories WHERE name = 'Fries & Snacks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Loaded Fries', 150, id FROM categories WHERE name = 'Fries & Snacks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Nuggets', 70, id FROM categories WHERE name = 'Fries & Snacks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Popcorn', 80, id FROM categories WHERE name = 'Fries & Snacks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- SHAWARMA
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Shawarma', 80, id FROM categories WHERE name = 'Shawarma'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Shawarma', 80, id FROM categories WHERE name = 'Shawarma'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Peri Peri Shawarma', 90, id FROM categories WHERE name = 'Shawarma'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Peri Peri Shawarma', 90, id FROM categories WHERE name = 'Shawarma'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Lays Shawarma', 50, id FROM categories WHERE name = 'Shawarma'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Spl Shawarma', 100, id FROM categories WHERE name = 'Shawarma'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Spl Shawarma', 100, id FROM categories WHERE name = 'Shawarma'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- KEBAB & TAWA SPL
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Sheekh Kebab', '2 pcs', 100, id FROM categories WHERE name = 'Kebab & Tawa Spl'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chicken Tikka', '6 pcs', 100, id FROM categories WHERE name = 'Kebab & Tawa Spl'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Beef Sheekh Kebab', '2 pcs', 120, id FROM categories WHERE name = 'Kebab & Tawa Spl'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Beef Tikka', '6 pcs', 120, id FROM categories WHERE name = 'Kebab & Tawa Spl'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Tawa Curry', 70, id FROM categories WHERE name = 'Kebab & Tawa Spl'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Tawa Curry', 80, id FROM categories WHERE name = 'Kebab & Tawa Spl'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- PAROTTA
INSERT INTO menu_items (name, price, category_id)
SELECT 'Bun Parotta', 12, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Nool Parotta', 12, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Wheat Parotta', 15, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Veechu Parotta', 40, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Egg Veechu Parotta', 50, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Kari Parotta', 80, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Kari Parotta', 80, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Kothu Parotta', 100, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Kothu Parotta', 100, id FROM categories WHERE name = 'Parotta'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- DOSA
INSERT INTO menu_items (name, price, category_id)
SELECT 'Plain Dosa', 50, id FROM categories WHERE name = 'Dosa'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Ghee Dosa', 60, id FROM categories WHERE name = 'Dosa'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Egg Dosa', 60, id FROM categories WHERE name = 'Dosa'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Onion Dosa', 60, id FROM categories WHERE name = 'Dosa'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Podi Dosa', 60, id FROM categories WHERE name = 'Dosa'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Ghee Podi Dosa', 70, id FROM categories WHERE name = 'Dosa'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Dosa', 80, id FROM categories WHERE name = 'Dosa'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Dosa', 80, id FROM categories WHERE name = 'Dosa'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- RICE & NOODLES
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Rice', 90, id FROM categories WHERE name = 'Rice & Noodles'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Schezwan Rice', 100, id FROM categories WHERE name = 'Rice & Noodles'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Noodles', 100, id FROM categories WHERE name = 'Rice & Noodles'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Schezwan Noodles', 120, id FROM categories WHERE name = 'Rice & Noodles'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Rice', 100, id FROM categories WHERE name = 'Rice & Noodles'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Schezwan Rice', 120, id FROM categories WHERE name = 'Rice & Noodles'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Noodles', 100, id FROM categories WHERE name = 'Rice & Noodles'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Schezwan Noodles', 120, id FROM categories WHERE name = 'Rice & Noodles'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- EGG & INDIAN BREADS
INSERT INTO menu_items (name, price, category_id)
SELECT 'Off Boil Egg', 12, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Full Boil Egg', 12, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Omlette', 15, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Omlette', 30, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Omlette', 30, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Kalaki', 25, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Kalaki', 25, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Bread Omlette', 50, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Bread Omlette', 60, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Chappathi', '2 pcs', 25, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, variant, price, category_id)
SELECT 'Idiyappam', '1 pc', 10, id FROM categories WHERE name = 'Egg & Indian Breads'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- GRAVY VARIETIES (Chicken)
INSERT INTO menu_items (name, price, category_id)
SELECT 'ABM Spl Chicken Gravy', 80, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Pepper Gravy', 90, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'ABM Spl Chicken Chettinad', 90, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Kadai', 90, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'ABM Spl Chicken Sukka', 90, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Varuval', 100, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
-- GRAVY VARIETIES (Beef)
INSERT INTO menu_items (name, price, category_id)
SELECT 'ABM Spl Beef Masala', 90, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Pepper Gravy', 100, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'ABM Spl Beef Chettinad', 100, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Sukka', 90, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Varuval', 100, id FROM categories WHERE name = 'Gravy Varieties'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- CHINESE SPECIAL (Chicken)
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chilli Chicken', 100, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Manchurian', 100, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chicken Schezwan', 110, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Dragon Chicken', 100, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Garlic Chicken', 100, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Black Pepper Chicken', 110, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
-- CHINESE SPECIAL (Beef)
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chilli Beef', 100, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Manchurian', 100, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Beef Schezwan', 110, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Dragon Beef', 110, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Garlic Beef', 100, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Black Pepper Beef', 110, id FROM categories WHERE name = 'Chinese Special'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- MOJITO & DRINKS
INSERT INTO menu_items (name, price, category_id)
SELECT 'Mint Mojito', 50, id FROM categories WHERE name = 'Mojito & Drinks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Blue Lagoon', 60, id FROM categories WHERE name = 'Mojito & Drinks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Green Apple Mojito', 60, id FROM categories WHERE name = 'Mojito & Drinks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Strawberry Mojito', 60, id FROM categories WHERE name = 'Mojito & Drinks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Watermelon Mojito', 60, id FROM categories WHERE name = 'Mojito & Drinks'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- ICE CREAM
INSERT INTO menu_items (name, price, category_id)
SELECT 'Vanilla Ice Cream', 40, id FROM categories WHERE name = 'Ice Cream'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Chocolate Ice Cream', 50, id FROM categories WHERE name = 'Ice Cream'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Strawberry Ice Cream', 50, id FROM categories WHERE name = 'Ice Cream'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;
INSERT INTO menu_items (name, price, category_id)
SELECT 'Butter Scotch Ice Cream', 60, id FROM categories WHERE name = 'Ice Cream'
ON CONFLICT (name, COALESCE(variant, ''), category_id) DO UPDATE SET price = EXCLUDED.price;

-- ============================================================
-- STEP 4: Verify
-- ============================================================
SELECT c.name AS category, count(mi.id) AS items
FROM categories c
LEFT JOIN menu_items mi ON mi.category_id = c.id
GROUP BY c.name
ORDER BY c.display_order;

-- DONE ✅ — go to Menu page in the app, hard-refresh, you should
-- see every category above populated and editable.
