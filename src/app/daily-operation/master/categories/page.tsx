import { getDict } from "@/lib/i18n";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

export default function MasterCategoriesPage() {
  const t = getDict();
  return (
    <MasterManager
      title={t.nav.masterCategories}
      description={t.dailyOp.masterDesc}
      endpoint="/categories"
      relation="division"
    />
  );
}
