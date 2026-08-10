<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Sparepart multi-location stock

- Truth of stock: `sparepart_stock_balances` (material × storage location).
- `sparepart_items.stock_current` is a denormalized total (`SUM(balances)`); do not store lifetime `stock_in`/`stock_out` on the item — derive from mat docs (101/201) if needed.
- Posting (101/201/311) requires `storage_location_id`; transfer 311 also needs `to_storage_location_id`. No default location on material master — user must pick location on each post.
- Reversals: POST `/api/sparepart/documents/[id]/reverse` (102/202/312). Do not edit/delete mat docs.
- Idempotency: optional `client_request_id` on goods movements.
- Materials import/template is master data only (Code, Name, Brand, Model, Notes) — no opening stock or location. Stock changes go through goods movements (101/201/311).
- Historical ledger import from `IT备品备件清单.xlsx`: `node --env-file=.env.local db/import-excel-movements.mjs --force`
  - Locations for **101 and 201** come from sheet **IT Stock库存** column **Lokasi/地点** (same list per material code).
  - Multi-loc overrides are hardcoded in the script (IT00004 → Server Room only; IT00056/57/58 → Gudang Internal; IT00104 → split Server Room + Meja IT).
  - Documents are attributed to seeded **Super Admin** (`employee_no=SUPERADMIN`).
- Run migrations: `node --env-file=.env.local db/run-migrations.mjs`
