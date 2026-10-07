"use client";

import { useEffect, useState } from "react";
import { MaterialCombobox } from "@/components/sparepart/MaterialCombobox";
import { SparepartDropdown } from "@/components/sparepart/SparepartDropdown";
import { apiGetAbs } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import type { MesDataRow, SparepartItem, SparepartStockBalance } from "@/lib/types";
import { mesInputCls, mesLabelCls } from "./mesFormHelpers";

type Props = {
  saving: boolean;
  locked: boolean;
  initial?: MesDataRow | null;
  issueMaterial: boolean;
  itemId: number | null;
  qty: string;
  locationId: number | null;
  levelId: number | null;
  onIssueMaterial: (value: boolean) => void;
  onItemId: (value: number | null) => void;
  onQty: (value: string) => void;
  onLocationId: (value: number | null) => void;
  onLevelId: (value: number | null) => void;
};

export function ChangeRequestMaterialFields({
  saving,
  locked,
  initial,
  issueMaterial,
  itemId,
  qty,
  locationId,
  levelId,
  onIssueMaterial,
  onItemId,
  onQty,
  onLocationId,
  onLevelId,
}: Props) {
  const { t, lang } = useLang();
  const [item, setItem] = useState<SparepartItem | null>(null);

  useEffect(() => {
    if (locked || !itemId) return;
    if (item?.id === itemId && item.balances) return;
    void apiGetAbs<{ row: SparepartItem }>(`/api/sparepart/materials/${itemId}`)
      .then((data) => setItem(data.row))
      .catch(() => setItem(null));
  }, [locked, itemId, item]);

  const stockPoints = (item?.balances ?? []).filter((balance) => Number(balance.qty) > 0);
  const stockPointValue =
    locationId && levelId ? `${locationId}:${levelId}` : "";
  const selectedPoint = stockPoints.find(
    (balance) =>
      balance.storage_location_id === locationId && balance.level_id === levelId
  );

  if (locked) {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg/40 p-3">
        <p className="text-xs font-semibold text-text">{t.fields.issueMaterial}</p>
        <p className="mt-1 text-[11px] text-text-dim">
          {t.fields.linkedMaterialDoc}: {initial?.sparepart_doc_number ?? "-"}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnly label={t.sparepart.code} value={initial?.sparepart_item_code ?? "-"} />
          <ReadOnly
            label={t.sparepart.name}
            value={localizedName(
              {
                name_en: initial?.sparepart_item_name_en ?? null,
                name_cn: initial?.sparepart_item_name_cn ?? null,
              },
              lang
            )}
          />
          <ReadOnly label={t.sparepart.qty} value={String(initial?.sparepart_qty ?? "-")} />
          <ReadOnly
            label={t.sparepart.locationCode}
            value={initial?.sparepart_location_code ?? "-"}
          />
          <ReadOnly
            label={t.sparepart.locationName}
            value={localizedName(
              {
                name_en: initial?.sparepart_location_name_en ?? null,
                name_cn: initial?.sparepart_location_name_cn ?? null,
              },
              lang
            )}
          />
          <ReadOnly label={t.sparepart.levelCode} value={initial?.sparepart_level_code ?? "-"} />
          <ReadOnly
            label={t.sparepart.levelName}
            value={localizedName(
              {
                name_en: initial?.sparepart_level_name_en ?? null,
                name_cn: initial?.sparepart_level_name_cn ?? null,
              },
              lang
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle p-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-text">
        <input
          type="checkbox"
          checked={issueMaterial}
          disabled={saving}
          onChange={(e) => onIssueMaterial(e.target.checked)}
        />
        {t.fields.issueMaterial}
      </label>
      <p className="mt-1 text-[11px] text-text-dim">{t.fields.issueMaterialHint}</p>
      {issueMaterial ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={mesLabelCls}>{t.sparepart.item}</label>
            <MaterialCombobox
              className={mesInputCls}
              value={itemId ? String(itemId) : ""}
              onChange={(next) => {
                onLocationId(null);
                onLevelId(null);
                if (!next) {
                  setItem(null);
                  onItemId(null);
                  return;
                }
                onItemId(Number(next));
                void apiGetAbs<{ row: SparepartItem }>(`/api/sparepart/materials/${next}`)
                  .then((data) => setItem(data.row))
                  .catch(() => setItem(null));
              }}
            />
          </div>
          <div>
            <label className={mesLabelCls}>{t.sparepart.qty}</label>
            <input
              className={mesInputCls}
              inputMode="numeric"
              value={qty}
              disabled={saving}
              onChange={(e) => onQty(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div>
            <label className={mesLabelCls}>{t.sparepart.location}</label>
            <SparepartDropdown
              value={stockPointValue}
              disabled={saving || !itemId}
              placeholder={t.sparepart.locationName}
              options={stockPoints.map((balance) => ({
                value: `${balance.storage_location_id}:${balance.level_id}`,
                label: stockPointLabel(balance, lang),
              }))}
              onChange={(value) => {
                const [locId, lvlId] = value.split(":");
                onLocationId(locId ? Number(locId) : null);
                onLevelId(lvlId ? Number(lvlId) : null);
              }}
            />
            {selectedPoint ? (
              <p className="mt-1 text-[11px] text-text-dim">
                {t.sparepart.stockCurrent}: {selectedPoint.qty}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function stockPointLabel(balance: SparepartStockBalance, lang: "en" | "cn"): string {
  const locationName = localizedName(
    {
      name_en: balance.location_name_en ?? balance.location_name ?? null,
      name_cn: balance.location_name_cn ?? null,
    },
    lang
  );
  const levelName = localizedName(
    {
      name_en: balance.level_name_en ?? null,
      name_cn: balance.level_name_cn ?? null,
    },
    lang
  );
  return `${balance.location_code ?? ""} — ${locationName} / ${balance.level_code ?? ""} — ${levelName} (${balance.qty})`;
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-dim">{label}</p>
      <p className="mt-0.5 text-xs text-text">{value || "-"}</p>
    </div>
  );
}
