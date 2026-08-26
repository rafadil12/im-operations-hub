import { pageMetadata } from "@/lib/seo";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewGrid } from "@/components/overview/OverviewGrid";

export const metadata = pageMetadata({
  title: "Dashboard",
  description:
    "Cross-module dashboard of IM One: live KPI cards for Daily Operation, ITSM, Safety, Sparepart and factory modules in a single view.",
  path: "/",
  absoluteTitle: true,
});

export default function Home() {
  return (
    <AppShell title="Dashboard">
      <OverviewGrid />
    </AppShell>
  );
}
