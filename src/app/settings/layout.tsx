import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AdminGate } from "@/components/settings/AdminGate";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="Settings">
      <AdminGate>{children}</AdminGate>
    </AppShell>
  );
}
