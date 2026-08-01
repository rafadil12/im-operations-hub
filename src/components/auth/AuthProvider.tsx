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
  loading: boolean;
  refresh: () => Promise<void>;
  login: (input: {
    login: string;
    password: string;
    remember?: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<AuthAccountPublic | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { account?: AuthAccountPublic | null };
  return data.account ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthAccountPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchMe();
      setAccount(next);
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate session on mount
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (input: {
      login: string;
      password: string;
      remember?: boolean;
    }) => {
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
      };
      if (!res.ok || !data.account) {
        throw new Error(data.error || "Login failed.");
      }
      setAccount(data.account);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAccount(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ account, loading, refresh, login, logout }),
    [account, loading, refresh, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      account: null,
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
