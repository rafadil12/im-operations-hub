import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

// The page itself is a Client Component, which cannot export metadata.
export const metadata = pageMetadata({
  title: "Analysis · Daily Operation",
  description:
    "Summary and charts of daily operations: task KPIs, category distribution, user ranking and duration analysis per division.",
  path: "/daily-operation/analysis",
});

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return children;
}
