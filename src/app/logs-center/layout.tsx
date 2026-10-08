import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AdminGate } from "@/components/settings/AdminGate";

export default function LogsCenterLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="Logs Center">
      <AdminGate require="logs-center">{children}</AdminGate>
    </AppShell>
  );
}
