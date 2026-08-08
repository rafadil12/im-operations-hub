This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | No | Absolute base URL of the deployment (for example `https://im-one.example.com`). Used as `metadataBase` for canonical and Open Graph URLs. Falls back to `http://localhost:3000`. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Yes | MySQL connection for MES data. |
| `AUTH_SECRET` | Yes | Session signing secret (at least 16 characters). Required for login cookies. |

Example `.env.local`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mes_dashboard
AUTH_SECRET=change-me-to-a-long-random-string
```

## Database migrations

Apply schema updates and RBAC seed (roles, permissions, admin bootstrap):

```bash
node --env-file=.env.local db/run-migrations.mjs
```

This is idempotent. Among other things it:

- Adds `system_users.role_id` and `role_permissions`
- Seeds roles: `admin`, `manager`, `operator`, `viewer`
- Seeds the 19-code permission catalog and migrates legacy `itsm.view` / settings-coupled I/O
- Assigns **admin** to user `62000970` (user id 1)
- Does **not** reset passwords unless you opt in (see below)

For **local bootstrap only**, you can reset all login passwords to the test password:

```bash
ALLOW_DEV_PASSWORD_RESET=1 node db/run-migrations.mjs
```

Never set `ALLOW_DEV_PASSWORD_RESET=1` against shared, staging, or production databases.

## Auth

Login uses **employee ID** + password against `users` / `system_users`, with an httpOnly session cookie.

If the app sits behind a reverse proxy, set `TRUST_PROXY=1` so login rate limiting uses the real client IP from `X-Forwarded-For` / `X-Real-IP` (ensure the proxy strips client-supplied forwarded headers).

**Test admin (after migration with `ALLOW_DEV_PASSWORD_RESET=1`):**

| Field | Value |
| --- | --- |
| Employee ID | `62000970` |
| Password | `Admin@123` |

Settings (`/settings/roles`, `/settings/accounts`) requires `admin.roles.manage` / `admin.accounts.manage` (or `settings.access` for entry). Assign capabilities from **Settings → Roles** using the 19-code permission catalog (overview, daily I/O, ITSM split view/import/export, admin).

IM One is an internal tool: every route sends `noindex, nofollow` and `/robots.txt` disallows all crawlers. There is intentionally no `sitemap.xml`.
