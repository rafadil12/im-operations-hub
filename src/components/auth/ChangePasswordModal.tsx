"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Modal } from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n";

type Props = {
  onClose: () => void;
};

const inputCls =
  "w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm text-text outline-none focus:border-accent";
const labelCls = "mb-1 block text-xs font-medium text-text-muted";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
        aria-hidden
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7.5a11.8 11.8 0 0 1-4.2 5.1" />
        <path d="M6.1 6.1A11.8 11.8 0 0 0 1 12.5C2.7 16.9 7 20 12 20c1.4 0 2.7-.3 3.9-.7" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden
    >
      <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5c-1.7 4.4-6 7.5-11 7.5S2.7 16.9 1 12.5z" />
      <circle cx="12" cy="12.5" r="3" />
    </svg>
  );
}

export function ChangePasswordModal({ onClose }: Props) {
  const { t } = useLang();
  const { logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => {
      router.replace("/login");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [success, router]);

  const validateLocal = (): string | null => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return t.common.required;
    }
    if (newPassword !== confirmPassword) {
      return t.auth.passwordMismatch;
    }
    if (newPassword.length < 8) {
      return t.auth.passwordTooShort;
    }
    if (newPassword === currentPassword) {
      return t.auth.passwordSameAsCurrent;
    }
    return null;
  };

  const submit = async () => {
    const localError = validateLocal();
    if (localError) {
      setError(localError);
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        requireRelogin?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || t.common.error);
      }

      setSuccess(t.auth.passwordChanged);
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const passwordField = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    setShow: (v: boolean) => void,
    autoComplete: string,
  ) => (
    <div>
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      <span className="relative block">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} pr-10`}
          disabled={saving || Boolean(success)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-1 grid w-8 place-items-center text-text-dim hover:text-text"
          onClick={() => setShow(!show)}
          aria-label={show ? t.auth.hidePassword : t.auth.showPassword}
          tabIndex={-1}
        >
          <EyeIcon open={show} />
        </button>
      </span>
    </div>
  );

  return (
    <Modal
      title={t.auth.changePassword}
      onClose={onClose}
      closeDisabled={saving || Boolean(success)}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || Boolean(success)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-60"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || Boolean(success)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3">
        {error ? (
          <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
            {success}
          </p>
        ) : null}
        {passwordField(
          "current-password",
          t.auth.currentPassword,
          currentPassword,
          setCurrentPassword,
          showCurrent,
          setShowCurrent,
          "current-password",
        )}
        {passwordField(
          "new-password",
          t.auth.newPassword,
          newPassword,
          setNewPassword,
          showNew,
          setShowNew,
          "new-password",
        )}
        {passwordField(
          "confirm-password",
          t.auth.confirmPassword,
          confirmPassword,
          setConfirmPassword,
          showConfirm,
          setShowConfirm,
          "new-password",
        )}
      </div>
    </Modal>
  );
}
