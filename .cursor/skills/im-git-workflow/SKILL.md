---
name: im-git-workflow
description: Create branches and prepare commits/PRs for im-operations-hub. Use when the user asks to implement a feature, bugfix, hotfix, release prep, changelog/version update, or pull request work in this repository.
disable-model-invocation: true
---

# im-operations-hub Git Workflow

Repository: `rafadil12/im-operations-hub` on GitHub. Integration branch `dev`,
production branch `main`.

Commit message wording, staging, identity, and safety rules live in `AGENTS.md`
(section GIT & COMMIT RULES). This skill covers the surrounding flow.

Two gates are mandatory. Do not combine them into one `*(release):` commit
before the user has reviewed the work.

## Goal

**Work gate (default)** — after implement / fix / "next" / "commit":

1. Choose the base branch (`dev`, or `main` for urgent production hotfix)
2. Create the working branch
3. Implement (do **not** bump `VERSION` / `package.json`)
4. Validate what is relevant
5. Normal conventional commit — never `*(release):`
6. Push the branch
7. **STOP for user review.** Report branch + compare URL. Do **not** open a PR.

**Release gate** — only when the user has reviewed and says `ok release`,
`release`, or `buatkan PR`:

8. Bump `VERSION` + `package.json`
9. Write dated `CHANGELOG.md` from the actual branch diff
10. Full validation
11. One `feat(release): v<x.y.z> - …` commit (or `fix(release)` / `chore(release)`)
12. Push
13. Create the PR

Follow-up review comments stay in the work gate on the same branch
(`fix(scope): …`). Do not amend the work commits unless the user asks.

## Review gate (mandatory)

After the first work commit + push, STOP.

Do not:

- bump the version
- write `## [x.y.z] - YYYY-MM-DD` in CHANGELOG
- create a `*(release):` commit
- open a pull request

Wait until the user reviews. Phrases that stay in the work gate: `next`,
`lanjut`, `commit`, `push`, `perbaiki`, `belum sesuai`.

Only `ok release`, `release`, or `buatkan PR` (after review) enter the
release gate.

## Step 1: Determine the change type (needed later for the bump)

Record the change type now; bump the number only in the release gate.

- `a` = **major release** for large or breaking changes
- `b` = **feature** (minor) for new features or implementation work
- `c` = **patch** for hotfixes, bugfixes, chores, refactors, and other non-feature changes

`fix` / `bugfix` defaults to `c` unless the user explicitly asks for a bigger bump.
If the user specifies an exact version `x.y.z`, use it in the release gate.

## Step 2: Choose the base branch and create a working branch

1. Ensure the working tree is clean. If there are local changes, stop and ask
   for confirmation before proceeding — never discard them.
2. `git fetch origin`
3. Determine the base branch:
   - normal work: `dev`
   - urgent/live production hotfix: `main`
4. `git checkout <base-branch>`
5. `git pull --ff-only origin <base-branch>`
6. Create the branch:

```bash
git checkout -b <branch>
```

Branch naming (lowercase, hyphen-separated slug):

| Change type | Branch |
|---|---|
| major | `release/<x.y.z>` |
| feature | `feat/<slug>` |
| urgent production fix | `hotfix/<slug>` |
| non-urgent fix | `fix/<slug>` |
| chore | `chore/<slug>` |
| refactor | `refactor/<slug>` |

## Step 3: Implement the changes (work gate)

Do **not** bump `VERSION` or `package.json` before or during coding.

- Implement only what the request requires.
- Keep changes minimal and targeted; do not refactor unrelated code, change
  API contracts, or alter the database schema unless the task requires it.
- Optional: add bullets under `## [Unreleased]` only if the user asked.
  Never create `## [x.y.z] - YYYY-MM-DD` in this step.

## Step 4: Validate before committing (work gate)

Run what is relevant to the change:

```bash
npm run typecheck
npm run test
```

Also run lint/build when the change is likely to affect them. If validation
fails, STOP. Report what failed, why, the affected files, and whether the
failure relates to the current changes. Do not commit broken changes unless
explicitly told to.

If the change touches the database, remember migrations run via
`node --env-file=.env.development.local db/run-migrations.mjs` (or
`.env.local` if that is what the workspace uses). Do not run them against
production without an explicit request and a backup.

## Step 5: Work commit

Stage only the files that belong to the requested change — never `git add .`,
never stage `.env*` files or secrets.

Use a **normal** Conventional Commit from `AGENTS.md`:

```text
<type>(<scope>): <short description>
```

Do **not** use `feat(release)`, `fix(release)`, or `chore(release)` here.

Keep the subject on one line, under 72 characters. No `Co-authored-by` trailer.
Use the git identity already configured in the repository.

## Step 6: Push and stop for review

```bash
git push -u origin <branch>
```

Push unless the user explicitly asked not to. Never force push.

Then **STOP**. Report:

- the branch name
- that this is ready for review (not a release yet)
- suggested later PR title
- target branch (`dev` or `main`)
- the compare URL:

```
https://github.com/rafadil12/im-operations-hub/compare/<target>...<branch>?expand=1
```

Do not run `gh pr create`. Do not bump the version. Do not write a dated
changelog section.

## Step 7: Release gate (only after `ok release`)

Re-read the branch diff against the base. Then:

### 7a. Bump the version

Update both files to the new `x.y.z` calculated from **current** `dev`
(or `main` for a hotfix), not from a number guessed at the start of the work:

- `VERSION` — plain `x.y.z`, the source of truth
- `package.json` `"version"` — mirrors `VERSION`

### 7b. Update the changelog

Update `CHANGELOG.md` based on the actual implemented (and reviewed) changes:

- Follow Keep a Changelog 1.1.0 exactly.
- Write all changelog text in English.
- Keep `## [Unreleased]` at the top.
- Create or update `## [x.y.z] - YYYY-MM-DD` and move notable
  unreleased items into it.
- Use only these sections when relevant: `### Added`, `### Changed`,
  `### Deprecated`, `### Removed`, `### Fixed`, `### Security`.
- Bullets come from the actual git diff, concise and human-readable.
- Omit empty sections.

Map change types:

| Change | Section |
|---|---|
| feature (`b`) | `Added` and/or `Changed` |
| hotfix / fix (`c`) | `Fixed` |
| chore / refactor (`c`) | `Changed` |
| breaking cleanup or removal | `Removed` |
| risky soon-to-be-removed behavior | `Deprecated` |
| security issue | `Security` |

### 7c. Full validation

Run all of these for a release commit:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If lint fails on **pre-existing** issues unrelated to this branch, report that
and continue only when typecheck, test, and build pass — unless the user
requires a clean lint.

### 7d. Release commit

The release commit carries version files + changelog (and any last release-only
edits). Do not rewrite reviewed work history.

- feature (`b`): `feat(release): v<x.y.z> - <short summary>`
- hotfix/fix (`c`): `fix(release): v<x.y.z> - <short summary>`
- chore (`c`): `chore(release): v<x.y.z> - <short summary>`

Push after the release commit.

### 7e. Create the PR

Target branch: `dev` for normal work, `main` for a hotfix.

Prefer `gh` for GitHub PR operations (do not depend on GitHub MCP). GitHub CLI
is installed at `C:\Program Files\GitHub CLI\gh.exe` and authenticated as
`rafadil12`. If `gh` is not on PATH, use that full path.

```bash
gh auth status
```

```bash
gh pr create --base <target> --head <branch> --title "<title>" --body "## Summary
- <1-3 bullet points>

## Test plan
- [ ] <checklist>"
```

If `gh` is unavailable, give the user the compare URL instead.

Suggested PR titles:

- release: `release: v<x.y.z>`
- hotfix: `hotfix: <short summary>`

Merge only when explicitly asked:

```bash
gh pr merge <pr-number>
```

After a hotfix is merged to `main`, sync it back into `dev` with a merge or
cherry-pick so `dev` does not fall behind.

## Investigation before changes

If the user describes a symptom (example: "users complaining about logout") and
does NOT explicitly say "create a fix branch and change code":

1. Locate the likely root cause by reading the relevant code and recent commits.
2. Summarize the likely cause with file/area references.
3. Ask which path to take: fix on `dev`, or a hotfix that targets `main`.
