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
          title={t.auth.sessionExpiredTitle}
          onClose={goToLogin}
          size="md"
          footer={
            <button
              type="button"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
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
