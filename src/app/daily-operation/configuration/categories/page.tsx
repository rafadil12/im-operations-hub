import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/configuration/MasterManager";

export const metadata = pageMetadata({
  title: "Categories · Configuration",
  description:
    "Maintain the bilingual task categories used to classify Daily Operation records across every division.",
  path: "/daily-operation/configuration/categories",
});

export default function ConfigurationCategoriesPage() {
  return <MasterManager titleKey="masterCategories" endpoint="/categories" relation="division" />;
}
