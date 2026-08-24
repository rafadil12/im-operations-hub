import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleTabs } from "@/components/sparepart/ModuleTabs";

export default function SparepartLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="Sparepart">
      <ModuleTabs />
      {children}
    </AppShell>
  );
}
