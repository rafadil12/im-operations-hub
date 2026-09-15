"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import {
  MOVEMENT_HISTORY_COLUMNS,
  type MovementHistoryColumnId,
  type MovementHistoryColumnVisibility,
} from "@/lib/sparepart/movementHistoryColumns";

type Props = {
  visibility: MovementHistoryColumnVisibility;
  onVisibilityChange: (columnId: MovementHistoryColumnId, visible: boolean) => void;
};

function columnLabel(id: MovementHistoryColumnId, t: ReturnType<typeof useLang>["t"]): string {
  switch (id) {
    case "date":
      return t.sparepart.date;
    case "doc":
      return t.sparepart.docNumber;
    case "line":
      return t.sparepart.lineNo;
    case "material":
      return t.sparepart.item;
    case "movementType":
      return t.sparepart.movementType;
    case "qty":
      return t.sparepart.qty;
    case "uom":
      return t.sparepart.uom;
    case "fromLocation":
      return t.sparepart.fromLocation;
    case "toLocation":
      return t.sparepart.toLocation;
    case "user":
      return t.sparepart.createdBy;
    case "note":
      return t.sparepart.note;
  }
}

export function MovementHistoryColumnFilter({ visibility, onVisibilityChange }: Props) {
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleCount = MOVEMENT_HISTORY_COLUMNS.filter((id) => visibility[id]).length;

  return (
    <div className="relative z-10 shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="cursor-pointer whitespace-nowrap rounded-md border border-border bg-bg/40 px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
      >
        {t.sparepart.filterColumns}
      </button>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label={t.common.close}
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 z-30 mt-1 min-w-[180px] rounded-lg border border-border-subtle bg-surface p-2 shadow-lg">
            {MOVEMENT_HISTORY_COLUMNS.map((columnId) => (
              <label
                key={columnId}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text hover:bg-surface-hover"
              >
                <input
                  type="checkbox"
                  checked={visibility[columnId]}
                  disabled={visibility[columnId] && visibleCount <= 1}
                  onChange={(event) => onVisibilityChange(columnId, event.target.checked)}
                />
                {columnLabel(columnId, t)}
              </label>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
