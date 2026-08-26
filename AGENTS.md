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
- Materials import/template is master data only (Code, Name EN/CN, Brand EN/CN, Model, Category, Min Stock, UoM, Notes) — no opening stock or location. Stock changes go through goods movements (101/201/311). Import requires Code, Name EN, Name CN, Category, and Min Stock on every row; Brand/Model/Notes may be empty; UoM is optional (default PCS). Category must be IT, AGV, ASSEMBLY, or MES (DB code for Assembly is `ASM`; Excel `ASSEMBLY`/`ASM` both map to it). Active material codes already in the database are rejected; soft-deleted codes may be restored via import. Min stock must be an integer ≥ 0 (low stock = min > 0 and on-hand ≤ min).
- UoM lives on the material master (`uoms` + `sparepart_items.uom_id`). Qty on documents/balances is always in that base UoM.
- Opening stock for AGV/ASSEMBLY from `AGV & ASSEMBLY STOCK DATA.xlsx`: `node --env-file=.env.local db/import-agv-assembly-stock.mjs` (upserts master, posts 101 per location, idempotent via `OPENING-{code}`).
- Historical ledger import from `IT备品备件清单.xlsx`: `node --env-file=.env.local db/import-excel-movements.mjs --force`
  - Locations for **101 and 201** come from sheet **IT Stock库存** column **Lokasi/地点** (same list per material code).
  - Multi-loc overrides are hardcoded in the script (IT00004 → Server Room only; IT00056/57/58 → Gudang Internal; IT00104 → split Server Room + Meja IT).
  - Documents are attributed to seeded **Super Admin** (`employee_no=SUPERADMIN`).
- Run migrations: `node --env-file=.env.local db/run-migrations.mjs`

## Safety module

- Shared logic lives under `src/lib/safety/` (types, mappers, copy, evidence, overview metrics, API helpers).
- UI: `src/components/safety/overview/` (dashboard) and `src/components/safety/management/` (submissions).
- Routes: `/safety` (overview), `/safety/management` (weekly/monthly activity uploads).

## Training module

- Categories (phase 1): `mes`, `intelligent`, `it` — Safety training stays in the Safety module.
- Tables: `training_sessions`, `training_session_participants`, `training_participants`.
- Shared logic: `src/lib/training/`. UI: `src/components/training/{overview,activities}/`.
- Routes: `/training` (overview), `/training/activities` (CRUD).
- Uploads: set `TRAINING_UPLOAD_DIR` in `.env.local` (served via `/api/training/files/...`).
- Import Excel (`培训记录_Training+Notes.xlsx`, sheets MES/INTELLIGENT/IT only):
  `node --env-file=.env.local db/import-training-notes.mjs` (add `--force` to truncate + re-import).
- Run migrations: `node --env-file=.env.local db/run-migrations.mjs`
