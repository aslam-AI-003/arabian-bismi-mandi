-- ============================================================================
-- ITEM PROFIT (FOOD COST) + OWNER WHATSAPP NUMBERS
--
-- Run AFTER the earlier update files, in the Supabase SQL Editor.
-- Safe to re-run. Nothing existing is changed or deleted.
--
-- 1. pos_item_costs: cost price of one plate per menu item. Kept in its own
--    table because menu_items can be read without login (public menu);
--    only admins can read or edit costs.
-- 2. order_items.unit_cost: the cost saved on each bill line when it is
--    billed, so changing a cost later never rewrites old profit.
-- 3. pos_private_settings (admin only): which expense categories count as
--    food purchases, and the two owner WhatsApp numbers for the report.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS pos_item_costs (
  menu_item_id UUID PRIMARY KEY REFERENCES menu_items(id) ON DELETE CASCADE,
  cost_price DECIMAL(10,2) NOT NULL CHECK (cost_price >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID DEFAULT auth.uid()
);

ALTER TABLE pos_item_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin item costs" ON pos_item_costs;
CREATE POLICY "admin item costs" ON pos_item_costs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON pos_item_costs TO authenticated;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2);

-- Save the current cost on every new bill line (place_order / update_order_items).
CREATE OR REPLACE FUNCTION order_items_set_cost()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.unit_cost IS NULL AND NEW.menu_item_id IS NOT NULL THEN
    SELECT cost_price INTO NEW.unit_cost FROM pos_item_costs WHERE menu_item_id = NEW.menu_item_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_order_items_set_cost ON order_items;
CREATE TRIGGER trigger_order_items_set_cost
  BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION order_items_set_cost();

-- Admin-only settings (the normal settings table is readable without login,
-- so private values such as the owners' phone numbers live here).
CREATE TABLE IF NOT EXISTS pos_private_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pos_private_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin private settings" ON pos_private_settings;
CREATE POLICY "admin private settings" ON pos_private_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON pos_private_settings TO authenticated;

INSERT INTO pos_private_settings (key, value) VALUES
  ('food_cost_categories', '["Raw materials","Meat & chicken","Vegetables"]'),
  ('owner_whatsapp_1', ''),
  ('owner_whatsapp_2', '')
ON CONFLICT (key) DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
