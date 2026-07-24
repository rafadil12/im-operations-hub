"use client";

import { Modal } from "./Modal";
import { useLang } from "@/lib/i18n";

type Props = {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function ConfirmDialog({ title, message, onCancel, onConfirm, busy }: Props) {
  const { t } = useLang();
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? t.common.loading : t.common.delete}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted">{message}</p>
    </Modal>
  );
}
