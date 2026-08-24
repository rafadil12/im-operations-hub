import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/seo";

// The page itself is a Client Component, which cannot export metadata.

export const metadata = pageMetadata({
  title: "Safety Management",
  description:
    "Create, edit and track safety management records, weekly activities, monthly activities and safety cases.",
  path: "/safety/management",
});

export default function ManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}