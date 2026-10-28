# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.16.0] - 2026-10-28

### Added

- Logs Center opens a detail drawer with the event id, target, before and
  after values, device, and client IP. The migration runner stores
  `ip_address` and `user_agent` on `logs_center_events`.
- The organization chart places a Supervisor between the department
  manager and the division leads. Migration seeds the Supervisor position.
- Daily attendance and leave can post a WeCom notice, including a
  generated image.

### Changed

- Organization chart zoom stays within the fitted frame, and person cards
  use a light blue tint.
- A browser that opens the app directly is logged by its connection
  address. `TRUST_PROXY=1` is only for a reverse proxy that sends
  `X-Forwarded-For` or `X-Real-IP`.
- Safety overview cards use shorter labels.

### Fixed

- Leave remarks and WeCom notices stay with the leave record.
- An ALPA leave day is shown as A on the daily attendance list.
- Shift generation treats a supervisor by user id, matching Organization
  Management.

## [0.15.0] - 2026-10-26

### Added

- Logs Center writes one remark for each successful save. The sentence
  names the object and what changed, in English and in Chinese.
- The Chinese sentence is stored and included in search. The screen shows
  the sentence for the selected language, and the actor line shows the
  localized name with the employee number.
- Named remarks cover password changes, accounts, roles, sparepart
  movements and masters, daily operation imports and masters, weekly
  reports, safety reports, training sessions, ITSM imports, and
  organization employees, leave, attendance, and shifts.
- Logs Center stores the Chinese sentence and the structured change on
  `logs_center_events`. The migration runner adds those columns when they
  are missing.

### Changed

- Changing your own password is recorded as an account update: Change
  Password.
- An unchanged save, a failed validation, and an import that changes
  nothing write no remark.
- An ITSM import remark counts new requests and updated requests
  separately.
- The action filter includes Save, Submit, Reopen, and Import.

## [0.14.1] - 2026-10-08

### Changed

- Renamed database tables to a module prefix. Daily Operation records,
  categories, subcategories, types, and statuses now start with
  `daily_operation_`. Login roles and permissions start with `access_`.
  Units of measure are `sparepart_uoms`.
- Existing rows, ids, and foreign keys move with the rename. Queries use
  the new names. `users`, `system_users`, and `sparepart_categories` are
  unchanged.

## [0.14.0] - 2026-10-08

### Added

- Logs Center, placed directly under Settings and kept off the dashboard.
  It keeps a permanent record of sign-in, sign-out, and data changes.
- Logs Center filters for module, action, and a from/to time. The range
  defaults to the current day, 00:00:00 through 23:59:59. Search matches
  remarks, name, or employee ID.
- Daily Operation activities show the record ID, search accepts that ID,
  and View opens the saved entry read-only beside Edit and Delete.

### Changed

- Activity columns keep a fixed width so the action buttons stay visible
  when a name or description is long.
- Logs Center shows the date above the time, without milliseconds. Module
  and action labels are uppercase.

## [0.13.0] - 2026-10-08

### Changed

- Organization Overview: Schedule Variance lists the newest dates first,
  in both the compact cards and the full list.

## [0.12.0] - 2026-10-07

### Added

- Change Request activities can post a sparepart goods issue (201) on save:
  one material, quantity, Issued To, and a storage location limited to points
  that have stock.
- Issued To is entered on the activity. The transaction note records the
  change request; the line note is left blank.
- Required issue fields are marked, and validation names only the fields that
  fail, including quantity above available stock.
- A linked activity cannot be deleted, and Reverse stays disabled on a
  sparepart document that an activity points to. After posting, the material
  fields stay visible but read-only and the activity type stays locked.

## [0.11.0] - 2026-10-07

### Changed

- Sparepart Stock detail: show Level Code and Level Name as separate columns
  (no longer combined as `CODE — Name`).
- Stock levels seed (`L01`–`L04`): English names are now `1ST FLOOR` …
  `4TH FLOOR` (Chinese labels unchanged).

## [0.10.0] - 2026-10-07

### Changed

- Sparepart Overview: restyle Top 5 Used as list cards (rank badge, code,
  name, category chip, qty pill) with soft card shadow that is not clipped
  on the last item.

## [0.9.0] - 2026-10-07

### Changed

- Daily Operation: rename activity type `Request` to `Access Request`
  (`mes_type.name_en`); Chinese label unchanged. Excel import still accepts
  legacy `Request` as an alias.

## [0.8.1] - 2026-10-07

### Fixed

- Insights User Ranking: compact view shows the top 10 people; expand opens
  the full ranking only when more than 10 people are in range.
- Insights User Ranking: hide the "showing top 10 · N total" hint and expand
  affordance when the ranking has 10 or fewer people.

## [0.8.0] - 2026-09-22

### Changed

- Movement History: split the Material column into Material Code and
  Description (both toggleable via Filter Columns).

## [0.7.0] - 2026-09-22

### Added

- Report Summary: area (category) filter beside year/week/sub-item filters.

### Changed

- Summary filter dropdowns use fixed widths with ellipsis and hover tooltips.
- Shared dropdown menus cap visible height (~10 options) with scroll for the
  rest.

## [0.6.1] - 2026-09-22

### Changed

- Restyle Add / Edit / View Week Report form: numbered sections, dashed
  identity fields, AVG completion ring, completion progress bar, wider
  content column, and Attachments section below Sub-items.

## [0.6.0] - 2026-09-22

### Added

- Stock Overview export dropdown with a dedicated stock status report Excel
  (consumption this month, last outbound, stock status, amount placeholder).
- Shared bilingual export download filenames for Sparepart, Training, and
  Daily Operation exports (ITSM and Organization unchanged).

### Fixed

- Avoid Header clock hydration mismatch by rendering the live datetime only
  after client hydration.

## [0.5.0] - 2026-09-19

### Added

- Report → Weekly Report → Projects: list, create/edit/view project
  progress reports with draft/submitted status and file attachments.
- Sidebar entry, `report.project.*` permissions, and migration for
  `report_project_reports`, `report_project_lines`, and attachments.

### Changed

- Open Project Report Add / Edit / View in centered full-screen modals
  instead of side drawers.

## [0.4.0] - 2026-09-19

### Added

- Nest Sparepart Roles permissions under Material Movement (Documents,
  History, Posting) to match the sidebar.
- Separate `sparepart.history.read` and `sparepart.history.export` codes,
  with migration backfill from `document.read` and guest History read only.

### Fixed

- Point the ITSM overview barrel at `TicketMonitoring` (removed stale
  RecentTickets / OldestTickets exports that broke the production build).
- Remove an orphan Chinese `itsmAnalysis.ticketMonitoringSubtitle` key and
  type submission status literals in report count tests.

## [0.3.0] - 2026-09-18

### Added

- Auto-generate the next storage location code (`SL001`, `SL002`, …) on Add,
  read-only in the form, with server-side fallback when code is omitted.

## [0.2.3] - 2026-09-18

### Fixed

- Count dashboard Report Submitted weeks by Fridays in the calendar month
  (denominator 4 or 5), and require all areas submitted per week.
- Show Overview Current Week Submitted as areas submitted for the selected
  week, separate from the month dashboard count.

## [0.2.2] - 2026-09-18

### Fixed

- Render and store training session topics in ALL CAPS, including while typing.

## [0.2.1] - 2026-09-15

### Fixed

- Redirect `/daily-operation` to `/daily-operation/activities` and remove the
  unused hub landing page.

## [0.2.0] - 2026-09-10

### Added

- Auto-generate a read-only material code after a category is selected.
- Add Category and UoM from the item form dropdowns via a popup.
- ERP Item Code on the material master (form, items list, and detail).
- Material Movement menu with Movement Documents, Movement History, and
  Stock Transactions.
- Per-material movement history ledger.
- Stock levels L01–L04 (item × storage location × level) on posting,
  balances, and documents. Existing stock backfills to L01.

### Changed

- Brand EN and Brand CN are required, with charset checks and auto-capitalized
  English text fields.
- Inactive and delete are blocked when material stock is not zero.
- Keep a fixed height and empty state for Top 5 Used on Sparepart Overview.
- Transfer 311 can move between levels, including the same location on a
  different floor.

## [0.1.2] - 2026-09-10

### Fixed

- Show the ASSEMBLY category Chinese label as 流水线 instead of 管道, including
  assembly rack location names.
- Localize Unit of Measure names on Stock Overview when Chinese is selected.
- Show document line descriptions using the material name for the active
  language.

## [0.1.1] - 2026-09-10

### Fixed

- Keep the sidebar scroll position when navigating between pages so menus
  such as Reports stay in view instead of jumping back to the top.

## [0.1.0] - 2026-07-21

### Added

- Initial baseline of the IM Operations Hub: report, safety, training, and
  sparepart modules, authentication and RBAC, and the dashboard.

[Unreleased]: https://github.com/rafadil12/im-operations-hub/compare/v0.2.3...HEAD
[0.2.3]: https://github.com/rafadil12/im-operations-hub/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/rafadil12/im-operations-hub/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/rafadil12/im-operations-hub/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/rafadil12/im-operations-hub/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/rafadil12/im-operations-hub/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/rafadil12/im-operations-hub/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/rafadil12/im-operations-hub/releases/tag/v0.1.0
