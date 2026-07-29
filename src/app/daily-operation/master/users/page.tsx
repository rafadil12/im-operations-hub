import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

export const metadata = pageMetadata({
  title: "Users · Master Data",
  description:
    "Maintain the user reference data used across the Daily Operation module, including the division each user belongs to.",
  path: "/daily-operation/master/users",
});

export default function MasterUsersPage() {
  const t = getDict();
  return (
    <MasterManager
      title={t.nav.masterUsers}
      description={t.dailyOp.masterDesc}
      endpoint="/users"
      relation="division"
    />
  );
}
