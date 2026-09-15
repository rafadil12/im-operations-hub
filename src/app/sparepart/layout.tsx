import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { pageMetadata } from "@/lib/seo";

// Index page is a Client Component and cannot export metadata; child routes
// override this with their own pageMetadata.
export const metadata = pageMetadata({
  title: "Overview · Sparepart",
  description:
    "Stock levels, movements, and distribution across categories and locations.",
  path: "/sparepart",
});

export default function SparepartLayout({ children }: { children: ReactNode }) {
  return <AppShell title="Sparepart">{children}</AppShell>;
}
