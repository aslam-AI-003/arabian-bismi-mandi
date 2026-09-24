-- =====================================================
-- COMPLETE TAMIL NAMES FOR ARABIAN BISMI MANDI
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add Tamil name columns
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_ta VARCHAR(255);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_ta VARCHAR(255);

-- =====================================================
-- CATEGORIES - Tamil Names
-- =====================================================
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

-- =====================================================
-- MENU ITEMS - Tamil Names (ALL ITEMS)
-- =====================================================

-- MANDI
UPDATE menu_items SET name_ta = 'சிக்கன் மாண்டி' WHERE name = 'Chicken Mandi';
UPDATE menu_items SET name_ta = 'மட்டன் மாண்டி' WHERE name = 'Mutton Mandi';
UPDATE menu_items SET name_ta = 'பீஃப் மாண்டி' WHERE name = 'Beef Mandi';

-- MAJBOOS
UPDATE menu_items SET name_ta = 'சிக்கன் மஜ்பூஸ்' WHERE name = 'Chicken Majboos';
UPDATE menu_items SET name_ta = 'மட்டன் மஜ்பூஸ்' WHERE name = 'Mutton Majboos';
UPDATE menu_items SET name_ta = 'பீஃப் மஜ்பூஸ்' WHERE name = 'Beef Majboos';

-- BIRIYANI & GHEE RICE
UPDATE menu_items SET name_ta = 'சிக்கன் 65 பிரியாணி' WHERE name = 'Chicken 65 Biriyani';
UPDATE menu_items SET name_ta = 'சிக்கன் தொக்கு பிரியாணி' WHERE name = 'Chicken Thokku Biriyani';
UPDATE menu_items SET name_ta = 'பீஃப் தொக்கு பிரியாணி' WHERE name = 'Beef Thokku Biriyani';
UPDATE menu_items SET name_ta = 'நெய் சோறு + சிக்கன் கிரேவி' WHERE name = 'Ghee Rice + Chicken Gravy';

-- SMOKED CHICKEN
UPDATE menu_items SET name_ta = 'ஷவாயா சிக்கன்' WHERE name = 'Shawaya Chicken';

-- GRILL
UPDATE menu_items SET name_ta = 'கிரில் சிக்கன்' WHERE name = 'Grill Chicken';
UPDATE menu_items SET name_ta = 'கிரில் மட்டன்' WHERE name = 'Grill Mutton';

-- BBQ
UPDATE menu_items SET name_ta = 'BBQ சிக்கன்' WHERE name = 'BBQ Chicken';
UPDATE menu_items SET name_ta = 'BBQ மட்டன்' WHERE name = 'BBQ Mutton';

-- TANDOORI
UPDATE menu_items SET name_ta = 'தந்தூரி சிக்கன்' WHERE name = 'Tandoori Chicken';
UPDATE menu_items SET name_ta = 'சிக்கன் டிக்கா' WHERE name = 'Chicken Tikka';
UPDATE menu_items SET name_ta = 'மட்டன் டிக்கா' WHERE name = 'Mutton Tikka';

-- SHAWARMA
UPDATE menu_items SET name_ta = 'சிக்கன் ஷவர்மா' WHERE name = 'Chicken Shawarma';
UPDATE menu_items SET name_ta = 'சிக்கன் ஸ்பெஷல் ஷவர்மா' WHERE name = 'Chicken Spl Shawarma';
UPDATE menu_items SET name_ta = 'சிக்கன் பெரி பெரி ஷவர்மா' WHERE name = 'Chicken Peri Peri Shawarma';
UPDATE menu_items SET name_ta = 'பீஃப் ஷவர்மா' WHERE name = 'Beef Shawarma';
UPDATE menu_items SET name_ta = 'பீஃப் பெரி பெரி ஷவர்மா' WHERE name = 'Beef Peri Peri Shawarma';
UPDATE menu_items SET name_ta = 'பீஃப் ஸ்பெஷல் ஷவர்மா' WHERE name = 'Beef Spl Shawarma';

-- MOMOS
UPDATE menu_items SET name_ta = 'சிக்கன் மோமோஸ்' WHERE name = 'Chicken Momos';
UPDATE menu_items SET name_ta = 'வெஜ் மோமோஸ்' WHERE name = 'Veg Momos';
UPDATE menu_items SET name_ta = 'பீஃப் மோமோஸ்' WHERE name = 'Beef Momos';

-- BURGERS
UPDATE menu_items SET name_ta = 'சிக்கன் பர்கர்' WHERE name = 'Chicken Burger';
UPDATE menu_items SET name_ta = 'சிக்கன் சீஸ் பர்கர்' WHERE name = 'Chicken Cheese Burger';
UPDATE menu_items SET name_ta = 'பீஃப் பர்கர்' WHERE name = 'Beef Burger';
UPDATE menu_items SET name_ta = 'பீஃப் சீஸ் பர்கர்' WHERE name = 'Beef Cheese Burger';
UPDATE menu_items SET name_ta = 'வெஜ் பர்கர்' WHERE name = 'Veg Burger';

-- FRIES & SNACKS
UPDATE menu_items SET name_ta = 'ஃப்ரெஞ்ச் ஃப்ரைஸ்' WHERE name = 'French Fries';
UPDATE menu_items SET name_ta = 'சீஸி ஃப்ரைஸ்' WHERE name = 'Cheesy Fries';
UPDATE menu_items SET name_ta = 'பெரி பெரி ஃப்ரைஸ்' WHERE name = 'Peri Peri Fries';
UPDATE menu_items SET name_ta = 'சிக்கன் லோடட் ஃப்ரைஸ்' WHERE name = 'Chicken Loaded Fries';
UPDATE menu_items SET name_ta = 'சிக்கன் நக்கெட்ஸ்' WHERE name = 'Chicken Nuggets';
UPDATE menu_items SET name_ta = 'சிக்கன் விங்ஸ்' WHERE name = 'Chicken Wings';
UPDATE menu_items SET name_ta = 'ஆனியன் ரிங்ஸ்' WHERE name = 'Onion Rings';

-- DOSA
UPDATE menu_items SET name_ta = 'பிளெயின் தோசை' WHERE name = 'Plain Dosa';
UPDATE menu_items SET name_ta = 'மசாலா தோசை' WHERE name = 'Masala Dosa';
UPDATE menu_items SET name_ta = 'ஆனியன் தோசை' WHERE name = 'Onion Dosa';
UPDATE menu_items SET name_ta = 'நான்-வெஜ் தோசை' WHERE name = 'Non-Veg Dosa';
UPDATE menu_items SET name_ta = 'சிக்கன் தோசை' WHERE name = 'Chicken Dosa';
UPDATE menu_items SET name_ta = 'முட்டை தோசை' WHERE name = 'Egg Dosa';

-- RICE & NOODLES
UPDATE menu_items SET name_ta = 'சிக்கன் ஃப்ரைட் ரைஸ்' WHERE name = 'Chicken Fried Rice';
UPDATE menu_items SET name_ta = 'எக் ஃப்ரைட் ரைஸ்' WHERE name = 'Egg Fried Rice';
UPDATE menu_items SET name_ta = 'வெஜ் ஃப்ரைட் ரைஸ்' WHERE name = 'Veg Fried Rice';
UPDATE menu_items SET name_ta = 'சிக்கன் நூடுல்ஸ்' WHERE name = 'Chicken Noodles';
UPDATE menu_items SET name_ta = 'எக் நூடுல்ஸ்' WHERE name = 'Egg Noodles';
UPDATE menu_items SET name_ta = 'வெஜ் நூடுல்ஸ்' WHERE name = 'Veg Noodles';

-- PAROTTA
UPDATE menu_items SET name_ta = 'பரோட்டா' WHERE name = 'Parotta';
UPDATE menu_items SET name_ta = 'சிக்கன் பரோட்டா' WHERE name = 'Chicken Parotta';
UPDATE menu_items SET name_ta = 'முட்டை பரோட்டா' WHERE name = 'Egg Parotta';
UPDATE menu_items SET name_ta = 'கொத்து பரோட்டா' WHERE name = 'Kothu Parotta';
UPDATE menu_items SET name_ta = 'சிக்கன் கொத்து பரோட்டா' WHERE name = 'Chicken Kothu Parotta';

-- ICE CREAM
UPDATE menu_items SET name_ta = 'வெண்ணிலா ஐஸ்கிரீம்' WHERE name = 'Vanilla Ice Cream';
UPDATE menu_items SET name_ta = 'சாக்லேட் ஐஸ்கிரீம்' WHERE name = 'Chocolate Ice Cream';
UPDATE menu_items SET name_ta = 'ஸ்ட்ராபெரி ஐஸ்கிரீம்' WHERE name = 'Strawberry Ice Cream';
UPDATE menu_items SET name_ta = 'பட்டர்ஸ்காட்ச் ஐஸ்கிரீம்' WHERE name = 'Butter Scotch Ice Cream';
UPDATE menu_items SET name_ta = 'மாங்கோ ஐஸ்கிரீம்' WHERE name = 'Mango Ice Cream';

-- BEVERAGES (if any)
UPDATE menu_items SET name_ta = 'கோலா' WHERE name = 'Cola';
UPDATE menu_items SET name_ta = 'லெமன்' WHERE name = 'Lemon';
UPDATE menu_items SET name_ta = 'ஃப்ரெஷ் ஜூஸ்' WHERE name = 'Fresh Juice';
UPDATE menu_items SET name_ta = 'மாங்கோ ஜூஸ்' WHERE name = 'Mango Juice';
UPDATE menu_items SET name_ta = 'ஆரஞ்சு ஜூஸ்' WHERE name = 'Orange Juice';
UPDATE menu_items SET name_ta = 'தண்ணீர்' WHERE name = 'Water';
UPDATE menu_items SET name_ta = 'மினரல் வாட்டர்' WHERE name = 'Mineral Water';

-- =====================================================
-- DEFAULT: Set Tamil name = English name for remaining items
-- =====================================================
UPDATE menu_items SET name_ta = name WHERE name_ta IS NULL;
UPDATE categories SET name_ta = name WHERE name_ta IS NULL;

-- =====================================================
-- VERIFY THE UPDATES
-- =====================================================
SELECT 'Categories Updated' as status, count(*) as count FROM categories WHERE name_ta IS NOT NULL;
SELECT 'Menu Items Updated' as status, count(*) as count FROM menu_items WHERE name_ta IS NOT NULL;
