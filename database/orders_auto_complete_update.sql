-- ============================================================================
-- ORDERS: SIP N' GOSSIP STYLE FLOW (no Preparing / Ready steps)
--
-- Run AFTER sng_features_migration.sql, in the Supabase SQL Editor.
-- Safe to re-run.
--
-- 1. An order becomes COMPLETED automatically as soon as it is fully paid.
-- 2. Existing open orders (Pending / Preparing / Ready) that are already paid
--    are marked COMPLETED now, so they show in reports and free their table.
--    Unpaid open orders stay open.
-- 3. An order with money paid on it cannot be cancelled; refund it instead.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION orders_auto_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_status IN ('PENDING', 'PREPARING', 'READY')
     AND NEW.payment_status = 'PAID' THEN
    NEW.order_status := 'COMPLETED';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_orders_auto_complete ON orders;
CREATE TRIGGER trigger_orders_auto_complete
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_auto_complete();

-- One-time: close open orders that are already paid.
UPDATE orders SET order_status = 'COMPLETED', updated_at = NOW()
WHERE order_status IN ('PENDING', 'PREPARING', 'READY')
  AND payment_status IN ('PAID', 'REFUNDED');

-- Cancel only orders with nothing paid (or fully refunded).
CREATE OR REPLACE FUNCTION cancel_order(p_order_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o orders%ROWTYPE;
BEGIN
  PERFORM _require_staff();
  IF NOT is_admin() AND app_setting('cashier_can_cancel', 'true') <> 'true' THEN
    RAISE EXCEPTION 'CANCEL_NOT_ALLOWED: Only an admin can cancel orders.';
  END IF;
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found.'; END IF;
  IF o.order_status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'ORDER_CLOSED: This order is already %.', LOWER(o.order_status);
  END IF;
  IF o.paid_amount - o.refunded_amount > 0 THEN
    RAISE EXCEPTION 'REFUND_FIRST: This order has Rs.% paid. Refund it first, then cancel.', o.paid_amount - o.refunded_amount;
  END IF;
  UPDATE orders SET
    order_status = 'CANCELLED',
    cancel_reason = LEFT(NULLIF(TRIM(p_reason), ''), 200),
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    version = o.version + 1,
    updated_at = NOW()
  WHERE id = p_order_id;
  RETURN _order_json(p_order_id);
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
