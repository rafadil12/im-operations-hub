"use client";

import { useState } from "react";
import { apiGetAbs } from "@/lib/apiClient";
import { localizedField, useLang } from "@/lib/i18n";
import {
  DOCUMENTS_TD as td,
  DOCUMENTS_TH as th,
  appendLevelLabel,
  formatLocationLabel,
  formatPostingDateTime,
  movementLabel,
} from "@/lib/sparepart/documentDisplay";
import { SparepartGate } from "@/components/sparepart/SparepartGate";
import { MaterialCombobox } from "@/components/sparepart/MaterialCombobox";
import type { SparepartMovementHistoryRow } from "@/lib/types";

export default function MovementHistoryPage() {
  const { t, lang } = useLang();
  const [itemId, setItemId] = useState("");
  const [rows, setRows] = useState<SparepartMovementHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextItemId: string) => {
    if (!nextItemId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetAbs<{ rows: SparepartMovementHistoryRow[] }>(
        `/api/sparepart/movement-history?item_id=${nextItemId}`
      );
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SparepartGate allow={(access) => access.canViewSparepartDocuments}>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-text">{t.sparepart.movementHistoryTitle}</h1>
          <p className="mt-1 text-sm text-text-muted">{t.sparepart.movementHistoryDesc}</p>
        </div>

        <div className="max-w-md">
          <label className="mb-1 block text-xs font-medium text-text-muted">
            {t.sparepart.item}
          </label>
          <MaterialCombobox
            value={itemId}
            onChange={(nextId) => {
              setItemId(nextId);
              void load(nextId);
            }}
          />
        </div>

        {error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        {!itemId ? (
          <p className="text-sm text-text-muted">{t.sparepart.movementHistoryEmpty}</p>
        ) : loading ? (
          <p className="text-sm text-text-muted">{t.common.loading}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-muted">{t.common.noData}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
            <table className="w-full border-collapse text-xs">
              <thead className="border-b border-border-subtle bg-bg/40">
                <tr>
                  <th className={th}>{t.sparepart.date}</th>
                  <th className={th}>{t.sparepart.docNumber}</th>
                  <th className={th}>{t.sparepart.movementType}</th>
                  <th className={th}>{t.sparepart.qty}</th>
                  <th className={th}>{t.sparepart.fromLocation}</th>
                  <th className={th}>{t.sparepart.toLocation}</th>
                  <th className={th}>{t.sparepart.note}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const from = appendLevelLabel(
                    formatLocationLabel(
                      row.from_location_code,
                      row.from_location_name_en,
                      row.from_location_name_cn,
                      lang
                    ),
                    row.from_level_code,
                    row.from_level_name_en,
                    row.from_level_name_cn,
                    lang
                  );
                  const to = appendLevelLabel(
                    formatLocationLabel(
                      row.to_location_code,
                      row.to_location_name_en,
                      row.to_location_name_cn,
                      lang
                    ),
                    row.to_level_code,
                    row.to_level_name_en,
                    row.to_level_name_cn,
                    lang
                  );
                  const itemName = localizedField(row.item_name_en, row.item_name_cn, lang);
                  return (
                    <tr
                      key={`${row.doc_id}-${row.line_no}`}
                      className="border-t border-border-subtle/60"
                    >
                      <td className={td}>{formatPostingDateTime(row.posting_date)}</td>
                      <td className={`${td} font-medium text-text`}>{row.doc_number}</td>
                      <td className={td}>{movementLabel(row.movement_type, t)}</td>
                      <td className={`${td} tabular-nums`}>{row.qty}</td>
                      <td className={td}>{from}</td>
                      <td className={td}>{to === "-" ? "—" : to}</td>
                      <td className={td}>{row.note || itemName || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SparepartGate>
  );
}
