"use client";

import { useState } from "react";
import { getDict, localizedName } from "@/lib/i18n";
import { STATUS_VALUES, TYPE_VALUES, type Masters } from "@/lib/types";

export type Filters = {
  start: string;
  end: string;
  divisionId: string;
  status: string;
  type: string;
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
  const t = getDict();
  const [draft, setDraft] = useState<Filters>(initial);

  const update = (patch: Partial<Filters>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-surface p-3">
      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">
          {t.fields.from}
        </label>
        <input
          type="date"
          className={ctrl}
          value={draft.start}
          onChange={(e) => update({ start: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">
          {t.fields.to}
        </label>
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
              {localizedName(d)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">
          {t.fields.status}
        </label>
        <select
          className={ctrl}
          value={draft.status}
          onChange={(e) => update({ status: e.target.value })}
        >
          <option value="">{t.common.all}</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">
          {t.fields.type}
        </label>
        <select
          className={ctrl}
          value={draft.type}
          onChange={(e) => update({ type: e.target.value })}
        >
          <option value="">{t.common.all}</option>
          {TYPE_VALUES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-40">
        <label className="mb-1 block text-[10px] uppercase text-text-dim">
          {t.common.search}
        </label>
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
