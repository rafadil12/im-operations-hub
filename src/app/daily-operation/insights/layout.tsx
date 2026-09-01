import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

// Metadata stays here; interactive UI lives in InsightsClient.
export const metadata = pageMetadata({
  title: "Insights · Daily Operation",
  description: "Explore trends, performance, and operational analytics.",
  path: "/daily-operation/insights",
});

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return children;
}
