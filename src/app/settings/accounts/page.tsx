import { pageMetadata } from "@/lib/seo";
import { AccountsManager } from "@/components/settings/AccountsManager";

export const metadata = pageMetadata({
  title: "Accounts · Settings",
  description: "Assign roles to login accounts.",
  path: "/settings/accounts",
});

export default function SettingsAccountsPage() {
  return <AccountsManager />;
}
