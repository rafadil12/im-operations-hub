"use client";

import { useEffect, useState } from "react";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { Modal } from "@/components/ui/Modal";
import { apiGetAbs } from "@/lib/apiClient";
import { useLang, localizedField, localizedName } from "@/lib/i18n";
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
    | "min_stock"
    | "category_code"
    | "category_name_en"
    | "category_name_cn"
    | "uom_code"
    | "image_url"
  > & { balances?: SparepartStockBalance[] };
  onClose: () => void;
};

export function MaterialDetailModal({ item, onClose }: Props) {
  const { t, lang } = useLang();
  const [fetchedBalances, setFetchedBalances] = useState<SparepartStockBalance[] | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(!item.balances);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const imgFailed = failedImageUrl !== null && failedImageUrl === item.image_url;

  useEffect(() => {
    if (item.balances) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetAbs<{ balances: SparepartStockBalance[] }>(
          `/api/sparepart/materials/${item.id}/balances`
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

  const description = localizedName(item, lang) || "-";
  const brand = localizedField(item.brand_en, item.brand_cn, lang) || "-";

  const detailGroups: { label: string; value: string | number }[][] = [
    [
      { label: t.sparepart.code, value: item.code },
      { label: t.sparepart.name, value: description },
    ],
    [
      { label: t.sparepart.brand, value: brand },
      { label: t.sparepart.model, value: item.model || "-" },
    ],
    [
      {
        label: t.sparepart.category,
        value:
          localizedName(
            {
              name_en: item.category_name_en ?? null,
              name_cn: item.category_name_cn ?? null,
            },
            lang
          ) ||
          item.category_code ||
          "-",
      },
      { label: t.sparepart.uom, value: item.uom_code || "-" },
    ],
    [
      { label: t.sparepart.minStock, value: item.min_stock ?? 0 },
      {
        label: t.sparepart.stockCurrent,
        value: item.uom_code ? `${item.stock_current} ${item.uom_code}` : item.stock_current,
      },
    ],
    [{ label: t.sparepart.notes, value: item.notes || "-" }],
  ];

  const th =
    "px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
  const td = "px-2 py-1.5 text-xs text-text";

  return (
    <>
      <Modal title={`${item.code} — ${displayName}`} onClose={onClose} size="lg">
        <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-start sm:gap-5">
          <div className="flex shrink-0 flex-col items-start gap-2">
            {showImage ? (
              <button
                type="button"
                onClick={() => setLightboxSrc(item.image_url!)}
                className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-xl border-2 border-border-subtle bg-bg hover:ring-2 hover:ring-accent/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- API image URL */}
                <img
                  src={item.image_url!}
                  alt={`${item.code} ${displayName}`}
                  className="size-full object-contain"
                  onError={() => setFailedImageUrl(item.image_url ?? null)}
                />
              </button>
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-dashed border-border bg-bg text-xs text-text-dim">
                {t.sparepart.noImage}
              </div>
            )}
          </div>
          <dl className="min-w-0 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {detailGroups.map((group) =>
              group.map((row) => (
                <div key={row.label} className="space-y-1">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-text-dim">
                    {row.label}
                  </dt>
                  <dd className="text-sm font-medium text-text">{row.value}</dd>
                </div>
              ))
            )}
          </dl>
        </div>

        <div className="mt-4">
          <h3 className="mb-3 text-sm font-semibold text-text">{t.sparepart.stockByLocation}</h3>
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
                    <th className={`${th} text-right`}>{t.sparepart.stockCurrent}</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.id} className="border-b border-border-subtle/60 last:border-0">
                      <td className={td}>{b.location_code ?? "-"}</td>
                      <td className={td}>
                        {localizedName(
                          {
                            name_en: b.location_name_en ?? b.location_name ?? null,
                            name_cn: b.location_name_cn ?? null,
                          },
                          lang
                        )}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {item.uom_code ? `${b.qty} ${item.uom_code}` : b.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {lightboxSrc ? (
        <ImageLightbox
          src={lightboxSrc}
          alt={`${item.code} ${displayName}`}
          onClose={() => setLightboxSrc(null)}
        />
      ) : null}
    </>
  );
}
