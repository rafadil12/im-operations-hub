import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleTabs } from "@/components/itsm/ModuleTabs";
import { pageMetadata } from "@/lib/seo";

// Index page is a Client Component and cannot export metadata; child routes
// override this with their own pageMetadata.
export const metadata = pageMetadata({
  title: "Overview · ITSM",
  description: "Track, analyze, and manage IT service requests.",
  path: "/itsm",
});

export default function ItsmLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="ITSM">
      <ModuleTabs />
      {children}
    </AppShell>
  );
}
