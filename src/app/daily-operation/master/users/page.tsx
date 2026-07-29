import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

export const metadata = pageMetadata({
  title: "Users · Master Data",
  description:
    "Maintain the user reference data used across the Daily Operation module, including the division each user belongs to.",
  path: "/daily-operation/master/users",
});

export default function MasterUsersPage() {
  return (
    <MasterManager
      titleKey="masterUsers"
      endpoint="/users"
      relation="division"
    />
  );
}
