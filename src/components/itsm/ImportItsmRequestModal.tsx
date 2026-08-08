"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";

type ImportRowError = {
  row: number;
  field?: string;
  message: string;
};

export type ItsmImportResult = {
  imported: number;
  updated: number;
  total: number;
};

type Props = {
  onClose: () => void;
  onImported: (result: ItsmImportResult) => void;
};

export function ImportItsmRequestModal({ onClose, onImported }: Props) {
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

      const res = await fetch("/api/itsm/itsm-request/import", {
        method: "POST",
        body: form,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: ImportRowError[];
        imported?: number;
        updated?: number;
        total?: number;
      };

      if (!res.ok) {
        setError(data.error ?? t.toast.importFailed);
        setRowErrors(Array.isArray(data.errors) ? data.errors : []);
        return;
      }

      const imported = data.imported ?? 0;
      const updated = data.updated ?? 0;
      onImported({
        imported,
        updated,
        total: data.total ?? imported + updated,
      });
    } catch {
      setError(t.toast.networkError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t.itsm.importTitle}
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
      <p className="mb-3 text-sm text-text-muted">{t.itsm.importHint}</p>

      <input
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        disabled={busy}
        className="block w-full text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-accent/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setError(null);
          setRowErrors([]);
        }}
      />

      {file ? (
        <p className="mt-2 text-xs text-text-muted">{file.name}</p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {rowErrors.length > 0 ? (
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-md border border-border-subtle bg-bg/40 p-3 text-xs text-text">
          {rowErrors.map((err, index) => (
            <li key={`${err.row}-${err.field ?? ""}-${index}`}>
              <span className="font-medium text-danger">
                {err.row > 0
                  ? t.importModal.rowError.replace("{row}", String(err.row))
                  : t.common.error}
                {err.field ? ` · ${err.field}` : ""}:
              </span>{" "}
              {err.message}
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  );
}
