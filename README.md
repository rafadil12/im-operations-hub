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
- Assigns **admin** to user `62000970` (user id 1)
- Resets all login passwords to the test password below

## Auth

Login uses **employee ID** + password against `users` / `system_users`, with an httpOnly session cookie.

**Test admin (after migration):**

| Field | Value |
| --- | --- |
| Employee ID | `62000970` |
| Password | `Admin@123` |

Settings (`/settings/roles`, `/settings/accounts`) is visible and usable only for the **admin** role. Use Accounts to assign roles to other users for testing.

IM One is an internal tool: every route sends `noindex, nofollow` and `/robots.txt` disallows all crawlers. There is intentionally no `sitemap.xml`.
