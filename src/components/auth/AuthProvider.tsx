"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthAccountPublic } from "@/lib/auth/types";

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
};

async function fetchMe(): Promise<{ account: AuthAccountPublic | null; guestPermissions: string[] }> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return { account: null, guestPermissions: [] };
  const data = (await res.json()) as MeResponse;
  return {
    account: data.account ?? null,
    guestPermissions: Array.isArray(data.guestPermissions) ? data.guestPermissions : [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthAccountPublic | null>(null);
  const [guestPermissions, setGuestPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchMe();
      setAccount(next.account);
      setGuestPermissions(next.guestPermissions);
    } catch {
      setAccount(null);
      setGuestPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate session on mount
    void refresh();
  }, [refresh]);

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
      setAccount(data.account);
      setGuestPermissions([]);
    },
    []
  );

  const logout = useCallback(async () => {
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
