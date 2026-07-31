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
import {
  AUTH_STORAGE_KEY,
  clearStoredAccount,
  createMockAccount,
  readStoredAccount,
  writeStoredAccount,
} from "@/lib/auth/mockStorage";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthAccountPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setAccount(readStoredAccount());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== AUTH_STORAGE_KEY) return;
      setAccount(readStoredAccount());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const login = useCallback(
    async (input: {
      login: string;
      password: string;
      remember?: boolean;
    }) => {
      const identifier = input.login.trim();
      if (!identifier || !input.password) {
        throw new Error("Employee ID / email and password are required.");
      }

      // Mock auth (localStorage) until DB accounts are ready.
      const next = createMockAccount(identifier);
      writeStoredAccount(next);
      setAccount(next);
    },
    [],
  );

  const logout = useCallback(async () => {
    clearStoredAccount();
    setAccount(null);
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
