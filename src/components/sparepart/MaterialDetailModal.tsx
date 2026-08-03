"use client";

import { Modal } from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";
import type { SparepartItem } from "@/lib/types";

type Props = {
  item: SparepartItem;
  onClose: () => void;
};

export function MaterialDetailModal({ item, onClose }: Props) {
  const { t } = useLang();

  const rows: { label: string; value: string | number }[] = [
    { label: t.sparepart.code, value: item.code },
    { label: t.sparepart.name, value: item.name },
    { label: t.sparepart.brand, value: item.brand || "-" },
    { label: t.sparepart.model, value: item.model || "-" },
    { label: t.sparepart.location, value: item.location || "-" },
    { label: t.sparepart.notes, value: item.notes || "-" },
    { label: t.sparepart.stockIn, value: item.stock_in },
    { label: t.sparepart.stockOut, value: item.stock_out },
    { label: t.sparepart.stockCurrent, value: item.stock_current },
  ];

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
    </Modal>
  );
}
