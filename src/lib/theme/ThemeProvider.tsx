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
 * Theme is driven by localStorage; the head bootstrap script applies it before
 * paint. React must not own data-theme on <html> or hydrate will flash.
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
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  // Match bootstrap script so first paint and later toggles stay consistent.
  root.style.backgroundColor = theme === "light" ? "#f4f6fa" : "#0b1220";
}

function getSnapshot(): Theme {
  cachedTheme ??= readStoredTheme();
  return cachedTheme;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

function subscribe(onChange: () => void): () => void {
  // Align with localStorage if something else drifted the DOM; skip no-op writes
  // so we do not flash after the head bootstrap script already applied the theme.
  const preferred = readStoredTheme();
  cachedTheme = preferred;
  if (document.documentElement.dataset.theme !== preferred) {
    applyTheme(preferred);
  }

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
    []
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
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
