  import type { ReactNode } from "react";
  import { pageMetadata } from "@/lib/seo";

  export const metadata = pageMetadata({
    title: "Management · ITSM",
    description:
      "Create, edit and track ITSM requests with filters for date range, requester, technician, status and priority.",
    path: "/itsm/management",
  });

  export default function ManagementLayout({
    children,
  }: {
    children: ReactNode;
  }) {
    return children;
  }