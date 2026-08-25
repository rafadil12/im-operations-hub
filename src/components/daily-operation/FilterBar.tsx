"use client";

import { useState } from "react";
import { localizedName, useLang } from "@/lib/i18n";
import type { Masters } from "@/lib/types";

export type Filters = {
  start: string;
  end: string;
  divisionId: string;
  statusId: string;
  typeId: string;
  q: string;
};

type Props = {
  masters: Masters | null;
  initial: Filters;
  onApply: (filters: Filters) => void;
};

const ctrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

export function FilterBar({ masters, initial, onApply }: Props) {
  const { lang, t } = useLang();
  const [draft, setDraft] = useState<Filters>(initial);

  const update = (patch: Partial<Filters>) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-surface p-3">
      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.fields.from}</label>
        <input
          type="date"
          className={ctrl}
          value={draft.start}
          onChange={(e) => update({ start: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.fields.to}</label>
        <input
          type="date"
          className={ctrl}
          value={draft.end}
          onChange={(e) => update({ end: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">
          {t.fields.division}
        </label>
        <select
          className={ctrl}
          value={draft.divisionId}
          onChange={(e) => update({ divisionId: e.target.value })}
        >
          <option value="">{t.common.all}</option>
          {masters?.divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {localizedName(d, lang)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.fields.status}</label>
        <select
          className={ctrl}
          value={draft.statusId}
          onChange={(e) => update({ statusId: e.target.value })}
        >
          <option value="">{t.common.all}</option>
          {masters?.statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {localizedName(s, lang)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.fields.type}</label>
        <select
          className={ctrl}
          value={draft.typeId}
          onChange={(e) => update({ typeId: e.target.value })}
        >
          <option value="">{t.common.all}</option>
          {masters?.types.map((v) => (
            <option key={v.id} value={v.id}>
              {localizedName(v, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-40">
        <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.common.search}</label>
        <input
          type="text"
          className={`${ctrl} w-full`}
          placeholder={t.fields.description}
          value={draft.q}
          onChange={(e) => update({ q: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onApply(draft);
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => onApply(draft)}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
      >
        {t.common.apply}
      </button>
    </div>
  );
}
