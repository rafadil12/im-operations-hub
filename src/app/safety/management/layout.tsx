import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

// The page itself is a Client Component, which cannot export metadata.
export const metadata = pageMetadata({
  title: "Management · Daily Operation",
  description:
    "Create, edit and track daily operation records with filters for date range, division, status and task type.",
  path: "/daily-operation/management",
});

export default function ManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
