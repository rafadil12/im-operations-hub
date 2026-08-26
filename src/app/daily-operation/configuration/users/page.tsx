import { pageMetadata } from "@/lib/seo";
import { PicManager } from "@/components/daily-operation/configuration/PicManager";

export const metadata = pageMetadata({
  title: "PIC · Configuration",
  description: "Assign login accounts that can appear as PIC on Daily Operation activities.",
  path: "/daily-operation/configuration/users",
});

export default function ConfigurationUsersPage() {
  return <PicManager />;
}
