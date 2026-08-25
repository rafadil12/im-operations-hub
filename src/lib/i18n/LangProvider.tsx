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
import type { Lang } from "@/lib/types";
import en, { type Dict } from "./en";
import cn from "./cn";

const STORAGE_KEY = "im-ops-lang";
const DEFAULT_LANG: Lang = "en";
const dictionaries: Record<Lang, Dict> = { en, cn };

function dictFor(lang: Lang): Dict {
  return dictionaries[lang] ?? en;
}

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
};

const LangContext = createContext<LangContextValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "cn" || raw === "en" ? raw : DEFAULT_LANG;
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate lang from localStorage
    setLangState(readStoredLang());
    setReady(true);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "cn" ? "zh-CN" : "en";
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang === "cn" ? "zh-CN" : "en";
  }, [lang, ready]);

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, t: dictFor(lang) }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: dictFor(DEFAULT_LANG),
    };
  }
  return ctx;
}
