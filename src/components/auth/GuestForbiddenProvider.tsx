"use client";

import Link from "next/link";
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
import { useAuth } from "@/components/auth/AuthProvider";
import { registerGuestForbiddenHandler, setClientGuestMode } from "@/lib/apiClient";
import { GUEST_FORBIDDEN_MESSAGE } from "@/lib/auth/guestForbidden";
import { useLang } from "@/lib/i18n";

type GuestForbiddenContextValue = {
  showGuestForbidden: () => void;
};

const GuestForbiddenContext = createContext<GuestForbiddenContextValue | null>(null);

export function GuestForbiddenProvider({ children }: { children: ReactNode }) {
  const { account, loading } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  const showGuestForbidden = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    registerGuestForbiddenHandler(showGuestForbidden);
    return () => registerGuestForbiddenHandler(null);
  }, [showGuestForbidden]);

  useEffect(() => {
    setClientGuestMode(!loading && !account);
  }, [account, loading]);

  const value = useMemo(() => ({ showGuestForbidden }), [showGuestForbidden]);

  return (
    <GuestForbiddenContext.Provider value={value}>
      {children}
      {open ? (
        <Modal
          title={t.auth.guestForbiddenTitle}
          onClose={() => setOpen(false)}
          size="md"
          footer={
            <Link
              href="/login"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              onClick={() => setOpen(false)}
            >
              {t.auth.signIn}
            </Link>
          }
        >
          <p className="text-sm text-text-muted">{t.auth.guestForbiddenMessage}</p>
        </Modal>
      ) : null}
    </GuestForbiddenContext.Provider>
  );
}

export function useGuestForbidden(): GuestForbiddenContextValue {
  const ctx = useContext(GuestForbiddenContext);
  if (!ctx) {
    return {
      showGuestForbidden: () => {},
    };
  }
  return ctx;
}

export { GUEST_FORBIDDEN_MESSAGE };
