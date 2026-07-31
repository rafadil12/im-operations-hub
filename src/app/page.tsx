import { pageMetadata } from "@/lib/seo";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewGrid } from "@/components/overview/OverviewGrid";

export const metadata = pageMetadata({
  title: "Overview",
  description:
    "Cross-module overview of IM One: live KPI cards for daily operation, ITSM and factory modules in a single dashboard.",
  path: "/",
  absoluteTitle: true,
});

export default function Home() {
  return (
    <AppShell title="Overview">
      <OverviewGrid />
    </AppShell>
  );
}
