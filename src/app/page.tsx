import { AppShell } from "@/components/layout/AppShell";
import { OverviewGrid } from "@/components/overview/OverviewGrid";

export default function Home() {
  return (
    <AppShell title="Overview">
      <OverviewGrid />
    </AppShell>
  );
}
