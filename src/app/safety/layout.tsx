import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function SafetyLayout({ children }: { children: ReactNode }) {
  return <AppShell title="Safety">{children}</AppShell>;
}
