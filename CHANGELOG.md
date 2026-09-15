# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/rafadil12/im-operations-hub/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/rafadil12/im-operations-hub/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/rafadil12/im-operations-hub/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/rafadil12/im-operations-hub/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/rafadil12/im-operations-hub/releases/tag/v0.1.0
