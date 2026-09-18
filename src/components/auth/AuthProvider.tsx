"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthAccountPublic } from "@/lib/auth/types";
import { isSessionExpiredPayload } from "@/lib/auth/sessionExpired";
import {
  notifySessionExpired,
  resetSessionExpiredNotice,
} from "@/lib/apiClient";

type AuthContextValue = {
  account: AuthAccountPublic | null;
  guestPermissions: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  login: (input: { login: string; password: string; remember?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type MeResponse = {
  account?: AuthAccountPublic | null;
  guestPermissions?: string[];
  auth?: string;
  error?: string;
};

async function fetchMe(): Promise<{
  account: AuthAccountPublic | null;
  guestPermissions: string[];
  sessionExpired: boolean;
}> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as MeResponse;
  const sessionExpired = isSessionExpiredPayload(data);
  if (!res.ok) {
    return { account: null, guestPermissions: [], sessionExpired };
  }
  return {
    account: data.account ?? null,
    guestPermissions: Array.isArray(data.guestPermissions) ? data.guestPermissions : [],
    sessionExpired,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthAccountPublic | null>(null);
  const [guestPermissions, setGuestPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const hadAccountRef = useRef(false);
  const intentionalLogoutRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchMe();
      if (next.account) {
        hadAccountRef.current = true;
        intentionalLogoutRef.current = false;
        resetSessionExpiredNotice();
      } else if (
        (next.sessionExpired || hadAccountRef.current) &&
        !intentionalLogoutRef.current
      ) {
        notifySessionExpired();
        hadAccountRef.current = false;
      }
      setAccount(next.account);
      setGuestPermissions(next.guestPermissions);
    } catch {
      setAccount(null);
      setGuestPermissions([]);
    } finally {
      intentionalLogoutRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate session on mount
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      if (!hadAccountRef.current && !account) return;
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [account, refresh]);

  const login = useCallback(
    async (input: { login: string; password: string; remember?: boolean }) => {
      const identifier = input.login.trim();
      if (!identifier || !input.password) {
        throw new Error("Employee ID and password are required.");
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: identifier,
          password: input.password,
          remember: input.remember ?? false,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        account?: AuthAccountPublic;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.account) {
        throw new Error(data.error || "Login failed.", { cause: data.code });
      }
      resetSessionExpiredNotice();
      intentionalLogoutRef.current = false;
      hadAccountRef.current = true;
      setAccount(data.account);
      setGuestPermissions([]);
    },
    []
  );

  const logout = useCallback(async () => {
    intentionalLogoutRef.current = true;
    hadAccountRef.current = false;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAccount(null);
      await refresh();
    }
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ account, guestPermissions, loading, refresh, login, logout }),
    [account, guestPermissions, loading, refresh, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      account: null,
      guestPermissions: [],
      loading: false,
      refresh: async () => {},
      login: async () => {
        throw new Error("AuthProvider is not mounted.");
      },
      logout: async () => {},
    };
  }
  return ctx;
}
