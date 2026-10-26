import { pageMetadata } from "@/lib/seo";
import { LogsCenter } from "@/components/logs-center/LogsCenter";

export const metadata = pageMetadata({
  title: "Logs Center",
  description: "Permanent log of system changes and sign-ins.",
  path: "/logs-center",
});

export default function LogsCenterPage() {
  return <LogsCenter />;
}
