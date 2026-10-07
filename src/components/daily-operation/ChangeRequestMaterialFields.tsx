"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import { localizedName, useLang } from "@/lib/i18n";
import type { MesDataRow } from "@/lib/types";
import { mesInputCls, mesLabelCls } from "./mesFormHelpers";

type Named = { id: number; code: string; name_en: string | null; name_cn: string | null };

type Options = {
  locations: Named[];
  levels: Named[];
  materials: Named[];
  available: number | null;
};

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
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Options>({
    locations: [],
    levels: [],
    materials: [],
    available: null,
  });

  useEffect(() => {
    if (locked) return;
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (itemId) params.set("itemId", String(itemId));
      if (locationId) params.set("locationId", String(locationId));
      if (levelId) params.set("levelId", String(levelId));
      apiGet<Options>(`/sparepart-issue-options?${params.toString()}`)
        .then(setOptions)
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [locked, query, itemId, locationId, levelId]);

  if (locked) {
    return (
      <div className="mt-4 rounded-lg border border-border-subtle bg-bg/40 p-3">
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
          <ReadOnly label={t.sparepart.locationCode} value={initial?.sparepart_location_code ?? "-"} />
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
    <div className="mt-4 rounded-lg border border-border-subtle p-3">
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
            <label className={mesLabelCls}>{t.sparepart.code}</label>
            <input
              className={mesInputCls}
              value={query}
              disabled={saving}
              placeholder={t.common.search}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className={`${mesInputCls} mt-2`}
              value={itemId ?? ""}
              disabled={saving}
              onChange={(e) => onItemId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t.common.none}</option>
              {options.materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {localizedName(item, lang)}
                </option>
              ))}
            </select>
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
            <select
              className={mesInputCls}
              value={locationId ?? ""}
              disabled={saving}
              onChange={(e) => onLocationId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t.common.none}</option>
              {options.locations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.code} — {localizedName(row, lang)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={mesLabelCls}>{t.sparepart.level}</label>
            <select
              className={mesInputCls}
              value={levelId ?? ""}
              disabled={saving}
              onChange={(e) => onLevelId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t.common.none}</option>
              {options.levels.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.code} — {localizedName(row, lang)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-text-dim sm:col-span-2">
            {t.sparepart.stockCurrent}: {options.available ?? "-"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-dim">{label}</p>
      <p className="mt-0.5 text-xs text-text">{value || "-"}</p>
    </div>
  );
}
