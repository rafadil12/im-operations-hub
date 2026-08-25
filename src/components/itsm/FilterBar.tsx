"use client";

import { useState, type KeyboardEvent } from "react";
import { useLang } from "@/lib/i18n";

export type Filters = {
  start: string;
  end: string;
  requestId: string;
  subject: string;
  requester: string;
  technician: string;
};

type Props = {
  initial: Filters;
  onApply: (filters: Filters) => void;
};

const ctrl =
  "rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent w-full";

export function FilterBar({ initial, onApply }: Props) {
  const { t } = useLang();

  const [draft, setDraft] = useState<Filters>(initial);

  const update = (patch: Partial<Filters>) =>
    setDraft((prev) => ({
      ...prev,
      ...patch,
    }));

  const apply = () => onApply(draft);

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") apply();
  };

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
        <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.itsm.requestId}</label>
        <input
          type="text"
          className={ctrl}
          placeholder={t.itsm.requestId}
          value={draft.requestId}
          onChange={(e) => update({ requestId: e.target.value })}
          onKeyDown={onSearchKeyDown}
        />
      </div>

      <div className="min-w-60 flex-1">
        <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.itsm.subject}</label>
        <input
          type="text"
          className={ctrl}
          placeholder={t.itsm.subject}
          value={draft.subject}
          onChange={(e) => update({ subject: e.target.value })}
          onKeyDown={onSearchKeyDown}
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">{t.itsm.requester}</label>
        <input
          type="text"
          className={ctrl}
          placeholder={t.itsm.requester}
          value={draft.requester}
          onChange={(e) => update({ requester: e.target.value })}
          onKeyDown={onSearchKeyDown}
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase text-text-dim">
          {t.itsm.technician}
        </label>
        <input
          type="text"
          className={ctrl}
          placeholder={t.itsm.technician}
          value={draft.technician}
          onChange={(e) => update({ technician: e.target.value })}
          onKeyDown={onSearchKeyDown}
        />
      </div>

      <button
        type="button"
        onClick={apply}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
      >
        {t.common.apply}
      </button>
    </div>
  );
}
