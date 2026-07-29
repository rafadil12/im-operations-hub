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
      <div className="mb-3">
        <h1 className="text-lg font-semibold text-text">Overview</h1>
        <p className="text-sm text-text-muted">
          Overview dashboard — click a card to expand, then open the module
          detail.
        </p>
      </div>
      <OverviewGrid />
    </AppShell>
  );
}
