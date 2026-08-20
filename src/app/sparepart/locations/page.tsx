"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGetAbs, apiSendAbs } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import type { SparepartStorageLocation } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";
import { Modal } from "@/components/ui/Modal";
import { SparepartGate } from "@/components/sparepart/SparepartGate";

type ListResponse = { rows: SparepartStorageLocation[] };
type LocationSortKey = "code" | "name" | "is_active";
type SortDir = "asc" | "desc";

function ChevronIcon({
  direction,
  active,
  className = "",
}: {
  direction: "up" | "down";
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 10 6"
      className={`h-2 w-2.5 shrink-0 ${
        active ? "text-text opacity-100" : "text-text-dim opacity-50"
      } ${className}`}
      fill="currentColor"
      aria-hidden
    >
      {direction === "up" ? (
        <path d="M5 0L10 6H0L5 0Z" />
      ) : (
        <path d="M5 6L0 0H10L5 6Z" />
      )}
    </svg>
  );
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export default function StorageLocationsPage() {
  const { t, lang } = useLang();
  const { success: toastSuccess, error: toastError } = useToast();
  const [rows, setRows] = useState<SparepartStorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SparepartStorageLocation | null>(null);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameCn, setNameCn] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sortKey, setSortKey] = useState<LocationSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [openSortKey, setOpenSortKey] = useState<LocationSortKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetAbs<ListResponse>(
        "/api/sparepart/storage-locations?active=0",
      );
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t.common.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setCode("");
    setNameEn("");
    setNameCn("");
    setIsActive(true);
  };

  const openEdit = (row: SparepartStorageLocation) => {
    setEditing(row);
    setCreating(false);
    setCode(row.code);
    setNameEn(row.name_en);
    setNameCn(row.name_cn);
    setIsActive(Boolean(row.is_active));
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await apiSendAbs("/api/sparepart/storage-locations", "PUT", {
          id: editing.id,
          code: code.trim(),
          name_en: nameEn.trim(),
          name_cn: nameCn.trim(),
          is_active: isActive,
        });
      } else {
        await apiSendAbs("/api/sparepart/storage-locations", "POST", {
          code: code.trim() || undefined,
          name_en: nameEn.trim(),
          name_cn: nameCn.trim(),
          is_active: isActive,
        });
      }
      toastSuccess(editing ? t.toast.updateSuccess : t.toast.createSuccess);
      closeForm();
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.toast.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: SparepartStorageLocation) => {
    if (row.is_active) {
      toastError(t.sparepart.locationDeleteActiveBlocked);
      return;
    }
    if (!confirm(t.sparepart.locationDeleteConfirm)) return;
    try {
      await apiSendAbs(
        `/api/sparepart/storage-locations?id=${row.id}`,
        "DELETE",
      );
      toastSuccess(t.toast.deleteSuccess);
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : t.toast.saveFailed);
    }
  };

  const field =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const label = "mb-1 block text-xs font-medium text-text-muted";
  const th =
    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
  const td = "px-3 py-2 text-xs text-text-muted";

  const showForm = creating || editing;
  const sortedRows = useMemo(() => {
    const key = sortKey ?? "code";
    const dir = (sortKey == null ? "asc" : sortDir) === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (key === "is_active") {
        cmp = Number(a.is_active) - Number(b.is_active);
      } else if (key === "name") {
        cmp = compareStrings(
          localizedName(a, lang),
          localizedName(b, lang),
        );
      } else {
        cmp = compareStrings(String(a.code ?? ""), String(b.code ?? ""));
      }
      if (cmp !== 0) return cmp * dir;
      return compareStrings(a.name_en, b.name_en);
    });
  }, [lang, rows, sortDir, sortKey]);

  const renderSortHeader = (labelText: string, columnKey: LocationSortKey) => {
    const active = sortKey === columnKey;
    const open = openSortKey === columnKey;
    const chevronDir = active && sortDir === "asc" ? "up" : "down";

    function SortMenu() {
      const menuRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
          if (!menuRef.current?.contains(event.target as Node)) {
            setOpenSortKey(null);
          }
        };
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Escape") setOpenSortKey(null);
        };
        window.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKeyDown);
        return () => {
          window.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("keydown", onKeyDown);
        };
        // `open` is render-scoped in nested SortMenu; parent re-render refreshes it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [open]);

      const pick = (dir: SortDir) => {
        if (active && sortDir === dir) {
          setSortKey(null);
        } else {
          setSortKey(columnKey);
          setSortDir(dir);
        }
        setOpenSortKey(null);
      };

      return (
        <div className="relative inline-block" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpenSortKey(open ? null : columnKey)}
            aria-expanded={open}
            aria-haspopup="menu"
            className={[
              "inline-flex items-center rounded-sm uppercase tracking-wide transition-colors",
              "hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
              active || open ? "text-text" : "text-text-dim",
            ].join(" ")}
          >
            {labelText}
            <ChevronIcon
              direction={chevronDir}
              active={active || open}
              className="ml-1.5"
            />
          </button>

          {open ? (
            <div
              role="menu"
              className="absolute left-0 z-30 mt-1 min-w-[10.5rem] rounded-md border border-border bg-bg-elevated py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => pick("asc")}
                className={[
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs",
                  active && sortDir === "asc"
                    ? "bg-accent/10 text-text"
                    : "text-text-muted hover:bg-surface-hover hover:text-text",
                ].join(" ")}
              >
                <ChevronIcon direction="up" active={active && sortDir === "asc"} />
                <span className="normal-case tracking-normal">
                  {t.common.sortAsc}
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => pick("desc")}
                className={[
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs",
                  active && sortDir === "desc"
                    ? "bg-accent/10 text-text"
                    : "text-text-muted hover:bg-surface-hover hover:text-text",
                ].join(" ")}
              >
                <ChevronIcon
                  direction="down"
                  active={active && sortDir === "desc"}
                />
                <span className="normal-case tracking-normal">
                  {t.common.sortDesc}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    return <SortMenu />;
  };

  const canSave = Boolean(nameEn.trim() && nameCn.trim());

  return (
    <SparepartGate allow={(a) => a.canManageSparepartLocations}>
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">
            {t.sparepart.locationsTitle}
          </h1>
          <p className="text-sm text-text-muted">{t.sparepart.locationsDesc}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {t.common.add}
        </button>
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {t.common.loading}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-border-subtle bg-bg/40">
              <tr>
                <th className={th}>{renderSortHeader(t.sparepart.locationCode, "code")}</th>
                <th className={th}>{renderSortHeader(t.sparepart.locationName, "name")}</th>
                <th className={th}>{renderSortHeader(t.sparepart.locationActive, "is_active")}</th>
                <th className={th}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border-subtle/60 last:border-0"
                >
                  <td className={`${td} font-medium text-text`}>{row.code}</td>
                  <td className={td}>{localizedName(row, lang)}</td>
                  <td className={td}>
                    {row.is_active ? t.common.yes : t.common.no}
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="mr-2 text-accent hover:underline"
                    >
                      {t.common.edit}
                    </button>
                    {!row.is_active ? (
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        className="text-danger hover:underline"
                      >
                        {t.common.delete}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <Modal
          title={editing ? t.common.edit : t.common.add}
          onClose={closeForm}
          closeDisabled={busy}
          footer={
            <>
              <button
                type="button"
                onClick={closeForm}
                disabled={busy}
                className="rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover disabled:opacity-60"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={busy || !canSave}
                onClick={save}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ? t.common.loading : t.common.save}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className={label}>{t.sparepart.locationCode}</label>
              <input
                className={field}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="AUTO"
              />
            </div>
            <div>
              <label className={label}>{t.sparepart.locationNameEn} *</label>
              <input
                className={field}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={label}>{t.sparepart.locationNameCn} *</label>
              <input
                className={field}
                value={nameCn}
                onChange={(e) => setNameCn(e.target.value)}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t.sparepart.locationActive}
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
    </SparepartGate>
  );
}
