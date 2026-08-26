import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/configuration/MasterManager";

export const metadata = pageMetadata({
  title: "Users · Master Data",
  description:
    "Maintain the user reference data used across the ITSM module, including the division each user belongs to.",
  path: "/itsm/master/users",
});

export default function MasterUsersPage() {
  return <MasterManager titleKey="masterUsers" endpoint="/users" relation="division" />;
}
