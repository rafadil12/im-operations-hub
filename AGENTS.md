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

## Report module

- Weekly report attachments (PPT, Excel, PDF, PNG, JPEG) on Add/Edit Week Report form; stored in `report_week_attachments` (week × area).
- Uploads: set `REPORT_UPLOAD_DIR` in `.env.local` (served via `/api/report/files/...`).
- Run migrations: `node --env-file=.env.local db/run-migrations.mjs`

## Safety module

- Shared logic lives under `src/lib/safety/` (types, mappers, copy, evidence, overview metrics, API helpers).
- UI: `src/components/safety/overview/` (dashboard) and `src/components/safety/management/` (submissions).
- Routes: `/safety` (overview), `/safety/management` (weekly/monthly activity uploads).

## Training module

- Divisions: sessions link to `divisions` via `division_id` (not a hard-coded category ENUM). Safety training stays in the Safety module.
- Bilingual content: `topic_en`/`topic_cn` on sessions; participant names are a separate master (`training_participants.name_en`/`name_cn`) — not linked to `users`/employees. Session attendance snapshots `participant_name_en`/`participant_name_cn`.
- Tables: `training_sessions`, `training_session_participants`, `training_participants`.
- Shared logic: `src/lib/training/`. UI: `src/components/training/{overview,session}/`.
- Routes: `/training` (overview), `/training/session` (CRUD).
- Uploads: set `TRAINING_UPLOAD_DIR` in `.env.local` (served via `/api/training/files/...`).
- Import Excel (`培训记录_Training+Notes.xlsx`, sheets MES/INTELLIGENT/IT only → map to divisions MES / Intelligent Logistics / IT):
  `node --env-file=.env.local db/import-training-notes.mjs` (add `--force` to truncate + re-import).
- Run migrations: `node --env-file=.env.local db/run-migrations.mjs`

# GIT & COMMIT RULES

When I ask you to commit or push changes, follow all rules below.

## 1. Git Identity

All commits MUST use my configured Git identity.

Before committing, inspect the current Git identity using:

git config user.name
git config user.email

Use the existing repository/local Git identity.

Do NOT:
- change git user.name
- change git user.email
- configure a new Git identity
- use Cursor, AI, Agent, OpenAI, or any other AI identity
- impersonate another developer
- add an AI identity to the commit

The commit must appear as my own Git commit using the Git identity already configured in this repository/environment.

If the Git identity is missing or appears incorrect, STOP and ask me before committing.

## 2. GitHub Credentials

When pushing to GitHub, use the GitHub credentials/authentication already configured in my environment.

Possible existing authentication methods include:
- SSH key
- Git Credential Manager
- GitHub CLI authentication
- existing Git credential helper

Do NOT ask me to provide:
- GitHub password
- Personal Access Token
- SSH private key
- authentication secrets

Do NOT print, expose, or store any credentials, tokens, cookies, private keys, or secrets.

Do NOT create or configure new credentials unless I explicitly request it.

The remote repository must use my existing GitHub authentication.

## 3. Co-authorship

Commits MUST NOT contain:

Co-authored-by:
Co-Authored-By:
Co-authored-by: Cursor
Co-authored-by: OpenAI
Co-authored-by: AI
Co-authored-by: <any AI identity>

Do NOT add any Co-authored-by trailer.

The commit must represent only my configured Git identity.

If an automated tool attempts to add a co-author trailer, remove it before committing.

## 4. Commit Message Format

Use Conventional Commits.

Format:

<type>(<scope>): <short description>

Allowed types:

feat     = new functionality
fix      = bug fix
refactor = code restructuring without changing behavior
test     = tests
docs     = documentation
chore    = maintenance/config/dependencies
perf     = performance improvement
style    = formatting/style-only changes
build    = build system changes
ci       = CI/CD changes

Examples:

feat(report): add weekly report creation form
fix(report): prevent duplicate weekly report submission
fix(inventory): correct stock balance calculation
refactor(report): simplify report data mapping
test(report): add weekly report validation tests
docs(report): update weekly report documentation
chore(deps): update frontend dependencies

## 5. Commit Message Rules

1. Use imperative mood.
2. Keep the subject concise and specific.
3. Use lowercase for type, scope, and description.
4. The message must describe WHAT changed.
5. Never use vague commit messages such as:
   - update
   - changes
   - fix
   - bug fix
   - revision
   - final
   - test
   - work
   - modifications
6. Use the most relevant module as the scope.
7. Prefer one logical change per commit.
8. Do not mix unrelated changes into one commit.

## 6. Before Committing

ALWAYS inspect the repository before committing.

Run:

git status
git diff
git diff --cached

Understand what files were changed and why.

Do NOT blindly run:

git add .

Instead, stage only files that belong to the requested change.

Example:

git add path/to/file1 path/to/file2

Do NOT stage:
- unrelated files
- temporary files
- generated files unless required
- secrets
- .env files
- credentials
- private keys
- unrelated user changes

## 7. Protect Existing User Changes

The existing application and business logic are considered stable.

DO NOT:
- revert user changes
- discard user changes
- overwrite unrelated changes
- reset the repository
- use git reset --hard
- use git checkout to discard changes
- use git restore on files containing user changes
- delete unrelated work

Never use destructive Git commands unless I explicitly request them.

## 8. Validation

Before committing, run the appropriate validation for the project and the changes.

Examples:

- tests
- lint
- type checking
- build
- existing project validation commands

If validation fails:

STOP.

Report:
- what failed
- why it failed if known
- affected files
- whether the failure is related to the current changes

Do NOT commit broken changes unless I explicitly tell you to commit anyway.

Do NOT use:

git commit --no-verify

unless I explicitly request it.

## 9. Existing Commits

Do NOT amend an existing commit unless I explicitly request it.

Do NOT rewrite Git history unnecessarily.

Do NOT use:
- git commit --amend
- git rebase
- git filter-branch
- git filter-repo

unless explicitly requested.

## 10. Push Rules

When I explicitly ask you to push:

1. Verify the current branch.
2. Verify the remote.
3. Verify the commit that will be pushed.
4. Push using the existing GitHub authentication.

Before pushing, check:

git branch --show-current
git remote -v
git status

Never force push.

Never use:

git push --force
git push -f

unless I explicitly request it.

## 11. Branch Safety

Never commit directly to main/master unless I explicitly tell you to.

Prefer working on a feature/fix branch.

Examples:

feat/weekly-report
fix/weekly-report-duplicate
fix/inventory-balance
refactor/report-module

Do NOT create, switch, rename, or delete branches unless necessary for the requested task or explicitly requested.

## 12. Complex Changes

For complex changes, use a commit body.

Example:

fix(report): prevent duplicate weekly report submission

Prevent multiple submissions when the user clicks the submit
button repeatedly while the request is still pending.

- Disable submit action while request is pending
- Preserve existing API contract
- Keep current validation flow unchanged

## 13. Commit Procedure

When I say "commit", follow this sequence:

1. Check current branch.
2. Check Git identity.
3. Check Git status.
4. Inspect the diff.
5. Identify files related to the requested change.
6. Run appropriate validation.
7. Determine the correct Conventional Commit type.
8. Determine the correct scope.
9. Stage only relevant files.
10. Review staged diff.
11. Create the commit using my existing Git identity.
12. Verify the created commit.
13. Verify that no Co-authored-by trailer exists.
14. Show me the result.

After committing, report:

Commit:
<commit hash>

Message:
<commit message>

Author:
<git user.name>

Files:
<files included>

Validation:
<validation result>

Working tree:
<clean/remaining changes>

## 14. Push Procedure

When I say "push":

1. Verify the current branch.
2. Verify GitHub remote.
3. Verify the latest commit.
4. Confirm there are no unintended changes.
5. Push using my existing GitHub authentication.
6. Never expose credentials.
7. Never force push.

After pushing, report:

Branch:
<branch>

Commit:
<commit hash>

Remote:
<remote>

Push:
<success/failure>

## 15. Important

The goal is to maintain a professional, clean, traceable Git history.

Every commit should be:
- intentional
- atomic
- understandable
- attributable to my configured Git identity
- free of AI co-author attribution
- free of secrets
- validated before commit

When I say "commit", do not ask unnecessary confirmation if all Git rules can be safely followed.

If something is unsafe, ambiguous, or requires changing Git identity/credentials, STOP and ask me.