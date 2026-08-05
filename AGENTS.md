<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Sparepart multi-location stock

- Truth of stock: `sparepart_stock_balances` (material × storage location).
- Posting (101/201/311) requires `storage_location_id`; transfer 311 also needs `to_storage_location_id`.
- Reversals: POST `/api/sparepart/documents/[id]/reverse` (102/202/312). Do not edit/delete mat docs.
- Idempotency: optional `client_request_id` on goods movements.
- Import location must be a **single** location (no comma-split). Migration 005 one-shot exceptions are not reused by import.
- Run migrations: `node --env-file=.env.local db/run-migrations.mjs`
