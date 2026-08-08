"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { apiGetAbs } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";
import type { SparepartItem, SparepartStockBalance } from "@/lib/types";

type Props = {
  item: Pick<
    SparepartItem,
    | "id"
    | "code"
    | "name"
    | "brand"
    | "model"
    | "notes"
    | "stock_in"
    | "stock_out"
    | "stock_current"
  > & { balances?: SparepartStockBalance[] };
  onClose: () => void;
};

export function MaterialDetailModal({ item, onClose }: Props) {
  const { t } = useLang();
  const [fetchedBalances, setFetchedBalances] = useState<
    SparepartStockBalance[] | null
  >(null);
  const [loadingBalances, setLoadingBalances] = useState(!item.balances);

  useEffect(() => {
    if (item.balances) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetAbs<{ balances: SparepartStockBalance[] }>(
          `/api/sparepart/materials/${item.id}/balances`,
        );
        if (!cancelled) setFetchedBalances(data.balances);
      } catch {
        if (!cancelled) setFetchedBalances([]);
      } finally {
        if (!cancelled) setLoadingBalances(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id, item.balances]);

  const balances = item.balances ?? fetchedBalances ?? [];
  const showLoading = !item.balances && loadingBalances;

  const rows: { label: string; value: string | number }[] = [
    { label: t.sparepart.code, value: item.code },
    { label: t.sparepart.name, value: item.name },
    { label: t.sparepart.brand, value: item.brand || "-" },
    { label: t.sparepart.model, value: item.model || "-" },
    { label: t.sparepart.notes, value: item.notes || "-" },
    { label: t.sparepart.stockIn, value: item.stock_in },
    { label: t.sparepart.stockOut, value: item.stock_out },
    { label: t.sparepart.stockCurrent, value: item.stock_current },
  ];

  const th =
    "px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
  const td = "px-2 py-1.5 text-xs text-text";

  return (
    <Modal title={`${item.code} — ${item.name}`} onClose={onClose} size="md">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
              {row.label}
            </dt>
            <dd
              className={`mt-1 text-sm ${
                row.label === t.sparepart.stockCurrent && item.stock_current <= 0
                  ? "font-medium text-danger"
                  : "text-text"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-text">
          {t.sparepart.stockByLocation}
        </h3>
        {showLoading ? (
          <p className="text-xs text-text-muted">{t.common.loading}</p>
        ) : balances.length === 0 ? (
          <p className="text-xs text-text-muted">{t.sparepart.noBalances}</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border-subtle">
            <table className="w-full border-collapse">
              <thead className="bg-bg/40">
                <tr>
                  <th className={th}>{t.sparepart.locationCode}</th>
                  <th className={th}>{t.sparepart.locationName}</th>
                  <th className={`${th} text-right`}>{t.sparepart.stockCurrent}</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-border-subtle/60"
                  >
                    <td className={td}>{b.location_code}</td>
                    <td className={td}>{b.location_name}</td>
                    <td
                      className={`${td} text-right tabular-nums font-medium ${
                        b.qty <= 0 ? "text-danger" : ""
                      }`}
                    >
                      {b.qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
