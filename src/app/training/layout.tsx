import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Overview · Training",
  description: "Training sessions overview for MES, Intelligent, and IT.",
  path: "/training",
});

export default function TrainingLayout({ children }: { children: ReactNode }) {
  return <AppShell title="Training">{children}</AppShell>;
}
