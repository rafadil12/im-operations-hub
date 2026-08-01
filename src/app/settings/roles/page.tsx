import { pageMetadata } from "@/lib/seo";
import { RolesManager } from "@/components/settings/RolesManager";

export const metadata = pageMetadata({
  title: "Roles · Settings",
  description: "Manage application roles and their permissions.",
  path: "/settings/roles",
});

export default function SettingsRolesPage() {
  return <RolesManager />;
}
