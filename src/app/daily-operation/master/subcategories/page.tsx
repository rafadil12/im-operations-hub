import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

export const metadata = pageMetadata({
  title: "Subcategories · Master Data",
  description:
    "Maintain the subcategories nested under each Daily Operation category, keeping task classification consistent.",
  path: "/daily-operation/master/subcategories",
});

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
