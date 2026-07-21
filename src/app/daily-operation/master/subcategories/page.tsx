import { getDict } from "@/lib/i18n";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

export default function MasterSubcategoriesPage() {
  const t = getDict();
  return (
    <MasterManager
      title={t.nav.masterSubcategories}
      description={t.dailyOp.masterDesc}
      endpoint="/subcategories"
      relation="category"
    />
  );
}
