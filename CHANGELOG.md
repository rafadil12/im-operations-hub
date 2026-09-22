# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
