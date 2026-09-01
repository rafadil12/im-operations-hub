import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleTabs } from "@/components/daily-operation/ModuleTabs";

export default function DailyOperationLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="Daily Operation">
      <ModuleTabs />
      {children}
    </AppShell>
  );
}
