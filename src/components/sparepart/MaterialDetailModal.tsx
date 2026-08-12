"use client";

import { useEffect, useState } from "react";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { Modal } from "@/components/ui/Modal";
import { apiGetAbs } from "@/lib/apiClient";
import { useLang, localizedName } from "@/lib/i18n";
import type { SparepartItem, SparepartStockBalance } from "@/lib/types";

type Props = {
  item: Pick<
    SparepartItem,
    | "id"
    | "code"
    | "name_en"
    | "name_cn"
    | "brand_en"
    | "brand_cn"
    | "model"
    | "notes"
    | "stock_current"
    | "image_url"
  > & { balances?: SparepartStockBalance[] };
  onClose: () => void;
};

export function MaterialDetailModal({ item, onClose }: Props) {
  const { t, lang } = useLang();
  const [fetchedBalances, setFetchedBalances] = useState<
    SparepartStockBalance[] | null
  >(null);
  const [loadingBalances, setLoadingBalances] = useState(!item.balances);
  const [imgFailed, setImgFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    setLightboxOpen(false);
  }, [item.image_url]);

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
  const showImage = Boolean(item.image_url) && !imgFailed;
  const displayName = localizedName(item, lang);

  const rows: { label: string; value: string | number }[] = [
    { label: t.sparepart.code, value: item.code },
    { label: t.sparepart.nameEn, value: item.name_en || "-" },
    { label: t.sparepart.nameCn, value: item.name_cn || "-" },
    { label: t.sparepart.brandEn, value: item.brand_en || "-" },
    { label: t.sparepart.brandCn, value: item.brand_cn || "-" },
    { label: t.sparepart.model, value: item.model || "-" },
    { label: t.sparepart.notes, value: item.notes || "-" },
    { label: t.sparepart.stockCurrent, value: item.stock_current },
  ];

  const th =
    "px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
  const td = "px-2 py-1.5 text-xs text-text";

  return (
    <>
      <Modal title={`${item.code} — ${displayName}`} onClose={onClose} size="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2">
            {showImage ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="flex size-28 items-center justify-center overflow-hidden rounded-md border border-border-subtle bg-bg hover:ring-2 hover:ring-accent/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- API image URL */}
                <img
                  src={item.image_url!}
                  alt={`${item.code} ${displayName}`}
                  className="size-full object-contain"
                  onError={() => setImgFailed(true)}
                />
              </button>
            ) : (
              <div className="flex size-28 items-center justify-center rounded-md border border-dashed border-border bg-bg text-xs text-text-dim">
                {t.sparepart.noImage}
              </div>
            )}
          </div>
          <dl className="min-w-0 flex-1 space-y-1.5">
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[8rem_1fr] gap-2">
                <dt className="text-xs text-text-muted">{row.label}</dt>
                <dd className="text-sm text-text">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">
            {t.sparepart.stockByLocation}
          </h3>
          {showLoading ? (
            <p className="text-xs text-text-muted">{t.common.loading}</p>
          ) : balances.length === 0 ? (
            <p className="text-xs text-text-muted">{t.sparepart.noBalances}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="w-full border-collapse">
                <thead className="border-b border-border-subtle bg-bg/40">
                  <tr>
                    <th className={th}>{t.sparepart.locationCode}</th>
                    <th className={th}>{t.sparepart.locationName}</th>
                    <th className={`${th} text-right`}>{t.sparepart.qty}</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-border-subtle/60 last:border-0"
                    >
                      <td className={td}>{b.location_code ?? "-"}</td>
                      <td className={td}>{b.location_name ?? "-"}</td>
                      <td className={`${td} text-right tabular-nums`}>{b.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {lightboxOpen && item.image_url ? (
        <ImageLightbox
          src={item.image_url}
          alt={`${item.code} ${displayName}`}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}
