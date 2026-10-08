import { pageMetadata } from "@/lib/seo";
import { AdminGate } from "@/components/settings/AdminGate";
import { LogAccount } from "@/components/settings/LogAccount";

export const metadata = pageMetadata({
  title: "Log Account · Settings",
  description: "Permanent log of system changes and sign-ins.",
  path: "/settings/log-account",
});

export default function SettingsLogAccountPage() {
  return (
    <AdminGate>
      <LogAccount />
    </AdminGate>
  );
}
