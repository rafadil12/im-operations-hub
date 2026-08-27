import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Session · Training",
  description: "Manage training sessions for MES, Intelligent, and IT.",
  path: "/training/session",
});

export default function TrainingSessionLayout({ children }: { children: ReactNode }) {
  return children;
}
