import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleTabs } from "@/components/itsm/ModuleTabs";

export default function ItsmLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="ITSM">
      <ModuleTabs />
      {children}
    </AppShell>
  );
}
