import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

// Metadata stays here; interactive UI lives in AnalysisClient.
export const metadata = pageMetadata({
  title: "Analysis · Daily Operation",
  description:
    "Summary and charts of daily operations: task KPIs, category distribution, user ranking and duration analysis per division.",
  path: "/daily-operation/analysis",
});

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return children;
}
