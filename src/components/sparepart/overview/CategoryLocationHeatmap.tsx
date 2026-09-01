"use client";

import { localizedName, useLang } from "@/lib/i18n";
import { localizedCategoryLabel } from "@/lib/sparepart/categories";
import type {
  SparepartOverviewCategoryTab,
  SparepartOverviewHeatmapCell,
} from "@/lib/sparepart/overview";

export function CategoryLocationHeatmap({
  cells,
  categories,
}: {
  cells: SparepartOverviewHeatmapCell[];
  categories: SparepartOverviewCategoryTab[];
}) {
  const { lang } = useLang();
  const locations = Array.from(
    new Map(
      cells.map((c) => [
        c.locationId,
        localizedName(
          {
            name_en: c.locationNameEn ?? c.locationName,
            name_cn: c.locationNameCn ?? null,
          },
          lang
        ),
      ])
    ).entries()
  );
  const categoryCodes = Array.from(new Set(cells.map((c) => c.categoryCode)));
  const max = Math.max(1, ...cells.map((c) => c.qty));
  const lookup = new Map(cells.map((c) => [`${c.categoryCode}|${c.locationId}`, c.qty]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-text-dim"> </th>
            {locations.map(([id, name]) => (
              <th key={id} className="px-2 py-1.5 text-center font-semibold text-text-dim">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categoryCodes.map((code) => (
            <tr key={code}>
              <td className="px-2 py-1.5 font-medium text-text">
                {localizedCategoryLabel(code, categories, lang)}
              </td>
              {locations.map(([id]) => {
                const qty = lookup.get(`${code}|${id}`) ?? 0;
                const t = qty / max;
                const bg = `rgba(99, 102, 241, ${0.08 + t * 0.7})`;
                return (
                  <td
                    key={id}
                    className="px-2 py-1.5 text-center tabular-nums text-text"
                    style={{ background: qty ? bg : undefined }}
                  >
                    {qty.toLocaleString()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
