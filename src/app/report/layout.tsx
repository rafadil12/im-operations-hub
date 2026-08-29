import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Overview · Report",
  description: "Weekly report overview for MES, Logistics, IT, and Safety.",
  path: "/report",
});

export default function ReportLayout({ children }: { children: ReactNode }) {
  return <AppShell title="Report">{children}</AppShell>;
}
