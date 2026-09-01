import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

// Metadata stays here; interactive UI lives in ActivitiesClient.
export const metadata = pageMetadata({
  title: "Activities · Daily Operation",
  description: "Track and manage daily operational activities.",
  path: "/daily-operation/activities",
});

export default function ActivitiesLayout({ children }: { children: ReactNode }) {
  return children;
}
