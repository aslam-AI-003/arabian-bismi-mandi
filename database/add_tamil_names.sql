-- =====================================================
-- ADD TAMIL NAMES TO DATABASE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add Tamil name columns
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_ta VARCHAR(255);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_ta VARCHAR(255);

-- Step 2: Update Categories with Tamil Names
UPDATE categories SET name_ta = 'மாண்டி' WHERE name = 'Mandi';
UPDATE categories SET name_ta = 'மஜ்பூஸ்' WHERE name = 'Majboos';
UPDATE categories SET name_ta = 'பிரியாணி & நெய் சோறு' WHERE name = 'Biriyani & Ghee Rice';
UPDATE categories SET name_ta = 'ஸ்மோக்ட் சிக்கன்' WHERE name = 'Smoked Chicken';
UPDATE categories SET name_ta = 'கிரில்' WHERE name = 'Grill';
UPDATE categories SET name_ta = 'BBQ' WHERE name = 'BBQ';
UPDATE categories SET name_ta = 'தந்தூரி' WHERE name = 'Tandoori';
UPDATE categories SET name_ta = 'ஷவர்மா' WHERE name = 'Shawarma';
UPDATE categories SET name_ta = 'மோமோஸ்' WHERE name = 'Momos';
UPDATE categories SET name_ta = 'பர்கர்' WHERE name = 'Burgers';
UPDATE categories SET name_ta = 'பொரியல் & ஸ்னாக்ஸ்' WHERE name = 'Fries & Snacks';
UPDATE categories SET name_ta = 'தோசை' WHERE name = 'Dosa';
UPDATE categories SET name_ta = 'அரிசி & நூடுல்ஸ்' WHERE name = 'Rice & Noodles';
UPDATE categories SET name_ta = 'பரோட்டா' WHERE name = 'Parotta';
UPDATE categories SET name_ta = 'ஐஸ்கிரீம்' WHERE name = 'Ice Cream';

-- Step 3: Update Menu Items with Tamil Names

-- Mandi Items
UPDATE menu_items SET name_ta = 'சிக்கன் மாண்டி' WHERE name = 'Chicken Mandi' AND variant IS NULL;
UPDATE menu_items SET name_ta = 'சிக்கன் மாண்டி' WHERE name = 'Chicken Mandi' AND variant = 'Single';
UPDATE menu_items SET name_ta = 'சிக்கன் மாண்டி' WHERE name = 'Chicken Mandi' AND variant = 'Couple';
UPDATE menu_items SET name_ta = 'சிக்கன் மாண்டி' WHERE name = 'Chicken Mandi' AND variant = 'Family';
UPDATE menu_items SET name_ta = 'மட்டன் மாண்டி' WHERE name = 'Mutton Mandi' AND variant IS NULL;
UPDATE menu_items SET name_ta = 'மட்டன் மாண்டி' WHERE name = 'Mutton Mandi' AND variant = 'Single';
UPDATE menu_items SET name_ta = 'மட்டன் மாண்டி' WHERE name = 'Mutton Mandi' AND variant = 'Couple';
UPDATE menu_items SET name_ta = 'மட்டன் மாண்டி' WHERE name = 'Mutton Mandi' AND variant = 'Family';
UPDATE menu_items SET name_ta = 'பீஃப் மாண்டி' WHERE name = 'Beef Mandi' AND variant IS NULL;
UPDATE menu_items SET name_ta = 'பீஃப் மாண்டி' WHERE name = 'Beef Mandi' AND variant = 'Couple';

-- Biriyani Items
UPDATE menu_items SET name_ta = 'சிக்கன் 65 பிரியாணி' WHERE name = 'Chicken 65 Biriyani';
UPDATE menu_items SET name_ta = 'சிக்கன் தொக்கு பிரியாணி' WHERE name = 'Chicken Thokku Biriyani';
UPDATE menu_items SET name_ta = 'பீஃப் தொக்கு பிரியாணி' WHERE name = 'Beef Thokku Biriyani';
UPDATE menu_items SET name_ta = 'நெய் சோறு + சிக்கன் கிரேவி' WHERE name = 'Ghee Rice + Chicken Gravy';

-- Smoked Chicken & Grill
UPDATE menu_items SET name_ta = 'ஷவாயா சிக்கன்' WHERE name = 'Shawaya Chicken';
UPDATE menu_items SET name_ta = 'கிரில் சிக்கன்' WHERE name = 'Grill Chicken';

-- Shawarma
UPDATE menu_items SET name_ta = 'சிக்கன் ஷவர்மா' WHERE name = 'Chicken Shawarma';
UPDATE menu_items SET name_ta = 'சிக்கன் ஸ்பெஷல் ஷவர்மா' WHERE name = 'Chicken Spl Shawarma';
UPDATE menu_items SET name_ta = 'சிக்கன் பெரி பெரி ஷவர்மா' WHERE name = 'Chicken Peri Peri Shawarma';
UPDATE menu_items SET name_ta = 'பீஃப் ஷவர்மா' WHERE name = 'Beef Shawarma';
UPDATE menu_items SET name_ta = 'பீஃப் பெரி பெரி ஷவர்மா' WHERE name = 'Beef Peri Peri Shawarma';

-- Burgers
UPDATE menu_items SET name_ta = 'சிக்கன் பர்கர்' WHERE name = 'Chicken Burger';
UPDATE menu_items SET name_ta = 'சிக்கன் சீஸ் பர்கர்' WHERE name = 'Chicken Cheese Burger';
UPDATE menu_items SET name_ta = 'பீஃப் பர்கர்' WHERE name = 'Beef Burger';
UPDATE menu_items SET name_ta = 'பீஃப் சீஸ் பர்கர்' WHERE name = 'Beef Cheese Burger';

-- Fries & Snacks
UPDATE menu_items SET name_ta = 'ஃப்ரெஞ்ச் ஃப்ரைஸ்' WHERE name = 'French Fries';
UPDATE menu_items SET name_ta = 'சீஸி ஃப்ரைஸ்' WHERE name = 'Cheesy Fries';
UPDATE menu_items SET name_ta = 'பெரி பெரி ஃப்ரைஸ்' WHERE name = 'Peri Peri Fries';
UPDATE menu_items SET name_ta = 'சிக்கன் லோடட் ஃப்ரைஸ்' WHERE name = 'Chicken Loaded Fries';

-- Ice Cream
UPDATE menu_items SET name_ta = 'வெண்ணிலா ஐஸ்கிரீம்' WHERE name = 'Vanilla Ice Cream';
UPDATE menu_items SET name_ta = 'சாக்லேட் ஐஸ்கிரீம்' WHERE name = 'Chocolate Ice Cream';
UPDATE menu_items SET name_ta = 'ஸ்ட்ராபெரி ஐஸ்கிரீம்' WHERE name = 'Strawberry Ice Cream';
UPDATE menu_items SET name_ta = 'பட்டர்ஸ்காட்ச் ஐஸ்கிரீம்' WHERE name = 'Butter Scotch Ice Cream';

-- Set default Tamil name = English name for any items not covered
UPDATE menu_items SET name_ta = name WHERE name_ta IS NULL;
UPDATE categories SET name_ta = name WHERE name_ta IS NULL;

-- Verify the updates
SELECT id, name, name_ta FROM categories ORDER BY name;
SELECT id, name, name_ta, variant FROM menu_items ORDER BY name LIMIT 20;
