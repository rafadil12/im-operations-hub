import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Management · Report",
  description: "Manage weekly report lines by year, week, and area.",
  path: "/report/management",
});

export default function ReportManagementLayout({ children }: { children: React.ReactNode }) {
  return children;
}
