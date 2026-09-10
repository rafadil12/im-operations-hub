# IM One

Internal operations hub for factory IM teams: daily operation records, ITSM, safety, sparepart inventory, organization, training, weekly reports, and a cross-module overview — bilingual EN/CN.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, MySQL (`mysql2`).

IM One is an internal tool: every route sends `noindex, nofollow` and `/robots.txt` disallows all crawlers. There is intentionally no `sitemap.xml`.

## Modules

| Module | Status | Routes |
| --- | --- | --- |
| Overview | Live | `/` |
| ITSM | Live | `/itsm`, `/itsm/management`, `/itsm/analysis` |
| Daily Operation | Live | `/daily-operation/activities`, `/daily-operation/insights`, `/daily-operation/configuration/*` |
| Safety | Live | `/safety`, `/safety/management` |
| Sparepart | Live | `/sparepart`, `/sparepart/stock`, `/sparepart/post`, `/sparepart/documents`, `/sparepart/materials`, `/sparepart/locations` |
| Organization | Live | `/organization/overview`, `/organization/employees`, `/organization/shift`, `/organization/attendance/*` |
| Training | Live | `/training`, `/training/session` |
| Report | Live | `/report`, `/report/summary`, `/report/reports` |
| Settings | Live | `/settings/roles`, `/settings/accounts` |

Overview KPI cards for all seven operational modules (Daily Operation, ITSM, Safety, Sparepart, Organization, Training, Report) load from live APIs.

## Getting started

```bash
npm install
# create .env.local from the table below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visitors can browse in **Guest Mode** (read-oriented access across modules; writes stay behind login). Sign in at `/login` with employee ID + password.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Yes | MySQL connection. |
| `AUTH_SECRET` | Yes | Session signing secret (at least 16 characters). Required for login cookies. |
| `COOKIE_SECURE` | No | Set to `true` or `1` to mark the session cookie `Secure` (HTTPS only). Leave unset or `false` for HTTP LAN deploys so browsers can store `im_ops_session`. |
| `TRUST_PROXY` | No | Set to `1` behind a reverse proxy so login rate limiting uses the real client IP from `X-Forwarded-For` / `X-Real-IP` (ensure the proxy strips client-supplied forwarded headers). |
| `DB_POOL_SIZE` | No | MySQL pool size. Defaults to `10`. |
| `NEXT_PUBLIC_SITE_URL` | No | Absolute base URL of the deployment (for example `https://im-one.example.com`). Used as `metadataBase` for canonical and Open Graph URLs. Falls back to `http://localhost:3000`. |
| `SPAREPART_UPLOAD_DIR` | For sparepart images | Directory for material photos (JPG/PNG, max 1 MB, filename = material code). |
| `SAFETY_UPLOAD_DIR` | For safety evidence | Weekly/monthly activity uploads, served via `/api/safety/files/...`. |
| `TRAINING_UPLOAD_DIR` | For training attachments | Session files, served via `/api/training/files/...`. |
| `REPORT_UPLOAD_DIR` | For weekly report attachments | PPT/Excel/PDF/PNG/JPEG, served via `/api/report/files/...`. |
| `WECOM_WEBHOOK_URL` | No | WeCom group webhook. When set, creating/updating a Daily Operation activity posts a markdown notification. |

Example `.env.local`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mes_dashboard
AUTH_SECRET=change-me-to-a-long-random-string
# HTTP LAN: omit COOKIE_SECURE (or set false). HTTPS: COOKIE_SECURE=true
SPAREPART_UPLOAD_DIR=./uploads/sparepart
SAFETY_UPLOAD_DIR=./uploads/safety
TRAINING_UPLOAD_DIR=./uploads/training
REPORT_UPLOAD_DIR=./uploads/report
# WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
```

## Database migrations

Apply schema updates and RBAC seed (roles, permissions, Super Admin bootstrap):

```bash
node --env-file=.env.local db/run-migrations.mjs
```

This is idempotent. Among other things it:

- Adds `system_users.role_id`, `session_version`, and `role_permissions`
- Seeds roles: `superadmin` (protected, `roles.id = 1`), `admin`, `viewer`
- Seeds the permission catalog (overview, daily I/O, ITSM, safety, sparepart, organization, training, report, admin)
- Bootstraps the **Super Admin** login (`employee_no=SUPERADMIN`)
- Creates sparepart tables (materials, storage locations, stock balances, material documents)
- Creates safety, training, report, and organization tables used by those modules
- Does **not** reset passwords unless you opt in (see below)

For **local bootstrap only**, you can reset all login passwords to the test password:

```bash
ALLOW_DEV_PASSWORD_RESET=1 node --env-file=.env.local db/run-migrations.mjs
```

Never set `ALLOW_DEV_PASSWORD_RESET=1` against shared, staging, or production databases.

## Auth and RBAC

Login uses **employee ID** + password against `users` / `system_users`, with an httpOnly session cookie (`im_ops_session`). Changing a password increments `session_version` and invalidates other sessions.

**Guest Mode** is not a database role: visitors who are not logged in get a fixed read-oriented set — overview plus view/export (or equivalent read) on Daily Operation, ITSM, Safety, Training, Report, Sparepart stock/documents, and Organization. Write, import, posting, reversals, material master writes, and Settings stay behind login.

Assign capabilities from **Settings → Roles**. Settings (`/settings/roles`, `/settings/accounts`) requires `admin.roles.manage` / `admin.accounts.manage` (or `settings.access` for entry). The `superadmin` role and `SUPERADMIN` account cannot be deleted, renamed, or demoted.

**Test Super Admin (after migration; password also applied by `ALLOW_DEV_PASSWORD_RESET=1`):**

| Field | Value |
| --- | --- |
| Employee ID | `SUPERADMIN` |
| Password | `Admin@123` |

## Safety

Weekly and monthly activity uploads with evidence files. Shared logic lives under `src/lib/safety/`. Set `SAFETY_UPLOAD_DIR` before uploading.

## Organization

Employees, shifts, and attendance (daily + leave/permission). Overview KPIs come from `/api/organization/overview`.

## Training

Sessions link to `divisions` via `division_id` (not a hard-coded category ENUM). Safety training stays in the Safety module. Participant names are a separate bilingual master (`training_participants`) — not linked to `users` / employees.

Set `TRAINING_UPLOAD_DIR` before attaching files on sessions.

Import from `培训记录_Training+Notes.xlsx` (sheets MES / INTELLIGENT / IT only → divisions MES / Intelligent Logistics / IT):

```bash
node --env-file=.env.local db/import-training-notes.mjs
```

Add `--force` to truncate and re-import. Attachments in Excel are not copied; upload them later in Session.

## Report

Weekly reports are one `report_week_submissions` row per `(week_id, area_id)`. Lines can repeat the same sub-item in one week. Attachments (PPT, Excel, PDF, PNG, JPEG) are stored in `report_week_attachments` (week × area).

Set `REPORT_UPLOAD_DIR` before uploading attachments.

Import from `Data Modul Report.xlsx` (sheets MOM / SMART LOGISTICS / IT / SAFETY):

```bash
node --env-file=.env.local db/import-report-weekly.mjs
```

Add `--force` to truncate and re-import.

## Sparepart inventory

Stock is tracked per material × storage location. Changes go through SAP-style goods movements — not by editing the material master.

| Movement | Meaning | Reversal |
| --- | --- | --- |
| 101 | Receive stock | 102 |
| 201 | Issue stock | 202 |
| 311 | Transfer between locations | 312 |

- Truth of stock: `sparepart_stock_balances` (material × storage location).
- `sparepart_items.stock_current` is a denormalized total (`SUM(balances)`). Lifetime in/out is derived from mat docs (101/201), not stored on the item.
- Posting (101/201/311) requires `storage_location_id`; transfer 311 also needs `to_storage_location_id`. There is no default location on the material master — pick a location on each post.
- Reversals: POST `/api/sparepart/documents/[id]/reverse`. Do not edit or delete mat docs.
- Optional `client_request_id` on goods movements for idempotency.
- Materials import/template is master data only (Code, Name EN/CN, Brand EN/CN, Model, Category, Min Stock, UoM, Notes) — no opening stock or location. Category must be IT, AGV, ASSEMBLY, or MES (DB code for Assembly is `ASM`).

### Opening stock (AGV / ASSEMBLY)

Idempotent import from `AGV & ASSEMBLY STOCK DATA.xlsx` (does not wipe IT ledger):

```bash
node --env-file=.env.local db/import-agv-assembly-stock.mjs
```

Posts 101 per material/location with `client_request_id` `OPENING-{code}`.

### Historical ledger import

One-shot import from `IT备品备件清单.xlsx` (wipes mat docs and stock balances):

```bash
node --env-file=.env.local db/import-excel-movements.mjs --force
```

- Locations for **101 and 201** come from sheet **IT Stock库存** column **Lokasi/地点** (same list per material code).
- Multi-loc overrides are hardcoded in the script (IT00004 → Server Room only; IT00056/57/58 → Gudang Internal; IT00104 → split Server Room + Meja IT).
- Documents are attributed to the seeded Super Admin (`employee_no=SUPERADMIN`).
