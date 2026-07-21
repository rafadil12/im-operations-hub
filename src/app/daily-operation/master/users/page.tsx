import { getDict } from "@/lib/i18n";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

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
