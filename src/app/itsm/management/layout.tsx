import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Management · ITSM",
  description: "Track and manage IT service tickets.",
  path: "/itsm/management",
});

export default function ManagementLayout({ children }: { children: ReactNode }) {
  return children;
}
