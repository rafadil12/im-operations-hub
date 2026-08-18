"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useLang } from "@/lib/i18n";

export default function SafetyLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { lang } = useLang();

  return (
    <AppShell title={lang === "cn" ? "安全管理" : "Safety"}>
      {children}
    </AppShell>
  );
}