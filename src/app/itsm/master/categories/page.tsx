import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

export const metadata = pageMetadata({
  title: "Categories · Master Data",
  description:
    "Maintain the bilingual task categories used to classify ITSM records across every division.",
  path: "/itsm/master/categories",
});

export default function MasterCategoriesPage() {
  return <MasterManager titleKey="masterCategories" endpoint="/categories" relation="division" />;
}
