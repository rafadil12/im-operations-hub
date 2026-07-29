import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

export const metadata = pageMetadata({
  title: "Categories · Master Data",
  description:
    "Maintain the bilingual task categories used to classify Daily Operation records across every division.",
  path: "/daily-operation/master/categories",
});

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
