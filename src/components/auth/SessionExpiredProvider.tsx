"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "@/components/ui/Modal";
import { registerSessionExpiredHandler } from "@/lib/apiClient";
import { useLang } from "@/lib/i18n";

type SessionExpiredContextValue = {
  showSessionExpired: () => void;
};

const SessionExpiredContext = createContext<SessionExpiredContextValue | null>(null);

/** Same stroke lock glyph as the login form. */
function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function SessionExpiredProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  const goToLogin = useCallback(() => {
    setOpen(false);
    if (pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, router]);

  const showSessionExpired = useCallback(() => {
    if (pathname === "/login") return;
    setOpen(true);
  }, [pathname]);

  useEffect(() => {
    registerSessionExpiredHandler(showSessionExpired);
    return () => registerSessionExpiredHandler(null);
  }, [showSessionExpired]);

  const value = useMemo(() => ({ showSessionExpired }), [showSessionExpired]);

  return (
    <SessionExpiredContext.Provider value={value}>
      {children}
      {open ? (
        <Modal
          title={
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                <LockIcon />
              </span>
              <span>{t.auth.sessionExpiredTitle}</span>
            </span>
          }
          onClose={goToLogin}
          size="md"
          footer={
            <button
              type="button"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              onClick={goToLogin}
            >
              {t.auth.signIn}
            </button>
          }
        >
          <p className="text-sm text-text-muted">{t.auth.sessionExpiredMessage}</p>
        </Modal>
      ) : null}
    </SessionExpiredContext.Provider>
  );
}

export function useSessionExpired(): SessionExpiredContextValue {
  const ctx = useContext(SessionExpiredContext);
  if (!ctx) {
    return {
      showSessionExpired: () => {},
    };
  }
  return ctx;
}
