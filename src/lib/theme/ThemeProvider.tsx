"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Theme } from "@/lib/types";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "./constants";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The active theme is driven by localStorage and applied to <html>.
 * subscribe() re-applies after mount so SSR data-theme={DEFAULT_THEME} cannot
 * desync the toggle from the visible theme.
 */
const listeners = new Set<() => void>();
let cachedTheme: Theme | null = null;

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Private browsing or blocked storage.
  }
  return DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function getSnapshot(): Theme {
  cachedTheme ??= readStoredTheme();
  return cachedTheme;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

function subscribe(onChange: () => void): () => void {
  // Prefer localStorage over SSR data-theme default so toggle and DOM stay aligned
  // after React hydrates <html data-theme={DEFAULT_THEME}>.
  const preferred = readStoredTheme();
  cachedTheme = preferred;
  applyTheme(preferred);

  listeners.add(onChange);
  // Keep tabs of the same app in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const next = event.newValue;
    if (next !== "light" && next !== "dark") return;
    cachedTheme = next;
    applyTheme(next);
    listeners.forEach((listener) => listener());
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function writeTheme(next: Theme) {
  if (cachedTheme === next) return;
  cachedTheme = next;
  applyTheme(next);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private browsing or blocked storage: the theme still applies for this session.
  }
  listeners.forEach((listener) => listener());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => writeTheme(next), []);
  const toggleTheme = useCallback(
    () => writeTheme(getSnapshot() === "dark" ? "light" : "dark"),
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}
