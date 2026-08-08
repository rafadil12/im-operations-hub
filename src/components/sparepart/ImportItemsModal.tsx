"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";

type ImportRowError = {
  row: number;
  field?: string;
  message: string;
};

type Props = {
  onClose: () => void;
  onImported: (count: number) => void;
};

export function ImportItemsModal({ onClose, onImported }: Props) {
  const { t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);

  const handleUpload = async () => {
    if (!file) {
      setError(t.importModal.selectFile);
      return;
    }

    setBusy(true);
    setError(null);
    setRowErrors([]);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/sparepart/materials/import", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: ImportRowError[];
        imported?: number;
      };

      if (!res.ok) {
        setError(data.error ?? t.toast.importFailed);
        setRowErrors(Array.isArray(data.errors) ? data.errors : []);
        return;
      }

      onImported(data.imported ?? 0);
    } catch {
      setError(t.toast.networkError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t.sparepart.importTitle}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover disabled:opacity-60"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy || !file}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? t.common.importing : t.importModal.upload}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-text-muted">{t.sparepart.importHint}</p>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text"
        />
        {error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        {rowErrors.length > 0 ? (
          <ul className="max-h-40 overflow-auto rounded-md border border-border-subtle bg-bg p-2 text-xs text-text-muted">
            {rowErrors.slice(0, 30).map((err, i) => (
              <li key={`${err.row}-${i}`}>
                {t.importModal.rowError.replace("{row}", String(err.row))}
                {err.field ? ` (${err.field})` : ""}: {err.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}
