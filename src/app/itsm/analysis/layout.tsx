import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

// Metadata stays here; interactive UI lives in AnalysisClient.
export const metadata = pageMetadata({
  title: "Analysis · ITSM",
  description: "View ITSM ticket trends, status, technician and support group analysis.",
  path: "/itsm/analysis",
});

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return children;
}
