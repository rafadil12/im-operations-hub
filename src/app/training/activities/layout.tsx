import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Activities · Training",
  description: "Manage training sessions for MES, Intelligent, and IT.",
  path: "/training/activities",
});

export default function TrainingActivitiesLayout({ children }: { children: ReactNode }) {
  return children;
}
