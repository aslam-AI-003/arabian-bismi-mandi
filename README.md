# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

---

# Arabian Bismi POS: features added from SIP N' GOSSIP

Staff roles (admin/cashier), split and part payments, pending balance
collection, refunds (admin only) with a payment ledger, expenses, discount
(% or ₹), parcel charge, round off, report export (CSV/Excel/PDF), menu CSV
import, a live online/offline check with duplicate-bill protection, and a
first-time setup screen.

## Deploy order (important)

1. **Back up** the Supabase database (Dashboard → Database → Backups).
2. Run `database/sng_features_migration.sql` in the Supabase **SQL Editor**.
   It only adds tables/columns, back-fills a payment row for every old paid
   bill, and replaces the open `USING (true)` security policies with role
   checks. It is safe to run again. Every existing login becomes an **admin**.
   Then run `database/orders_auto_complete_update.sql` the same way. It makes
   orders complete by themselves once fully paid (no Preparing/Ready steps)
   and closes old open orders that are already paid.
   Then run `database/receipt_cash_change_update.sql`. It saves the cash the
   customer handed over, for the "Cash received / Change" receipt line.
   Then run `database/item_profit_update.sql`. It adds admin-only cost
   prices (Menu → Cost prices), saves the cost on each bill line for the
   Reports → Profit tab, and stores the 2 owner WhatsApp numbers.
   Then run `database/table_optional_update.sql`. It lets Dine In orders be
   saved without a table number.
3. Deploy the app (needs Node 20.19+ to build).
4. Sign in as an admin. The first-time setup screen appears once: check the
   restaurant details. (Table tracking was removed; Dine In uses a table
   number box. Old orders keep their table numbers.)
5. Add cashiers under **Staff** (mobile number + password; no email is sent).

New defaults keep billing the same as before: parcel charge 0, round off off,
cashiers can cancel but cannot give discounts. Change these in **Settings →
Billing settings / Cashier permissions**.

## Notes

- New bills, payments, refunds and cancels go through database functions
  (`place_order`, `add_payments`, `record_refund`, `cancel_order`,
  `update_order_items`). Prices come from the menu table, not the browser.
- The scripts in `scripts/` that write the menu with the anon key
  (`seed-menu.mjs`, `merge-duplicate-categories.mjs`) no longer work after the
  migration, because menu writes now need an admin login. Use Menu → Import
  CSV or the SQL Editor instead.
- Tests: `npm test` (billing math, CSV import/export).
