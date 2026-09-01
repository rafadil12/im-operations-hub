import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/configuration/MasterManager";

export const metadata = pageMetadata({
  title: "Subcategories · Configuration",
  description:
    "Maintain the subcategories nested under each Daily Operation category, keeping task classification consistent.",
  path: "/daily-operation/configuration/subcategories",
});

export default function ConfigurationSubcategoriesPage() {
  return (
    <MasterManager titleKey="masterSubcategories" endpoint="/subcategories" relation="category" />
  );
}
