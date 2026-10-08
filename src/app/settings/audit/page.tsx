import { pageMetadata } from "@/lib/seo";
import { AdminGate } from "@/components/settings/AdminGate";
import { AuditLog } from "@/components/settings/AuditLog";

export const metadata = pageMetadata({
  title: "Audit · Settings",
  description: "Permanent log of system changes and sign-ins.",
  path: "/settings/audit",
});

export default function SettingsAuditPage() {
  return (
    <AdminGate>
      <AuditLog />
    </AdminGate>
  );
}
