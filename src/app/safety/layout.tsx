import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { pageMetadata } from "@/lib/seo";

// Overview page is a Client Component and cannot export metadata; /safety/management
// overrides this via its nested layout.
export const metadata = pageMetadata({
  title: "Overview · Safety",
  description: "IM Safety Training & Weekly Safety Activity Overview.",
  path: "/safety",
});

export default function SafetyLayout({ children }: { children: ReactNode }) {
  return <AppShell title="Safety">{children}</AppShell>;
}
