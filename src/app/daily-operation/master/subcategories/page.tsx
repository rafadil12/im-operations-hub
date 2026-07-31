import { pageMetadata } from "@/lib/seo";
import { MasterManager } from "@/components/daily-operation/master/MasterManager";

export const metadata = pageMetadata({
  title: "Subcategories · Master Data",
  description:
    "Maintain the subcategories nested under each Daily Operation category, keeping task classification consistent.",
  path: "/daily-operation/master/subcategories",
});

export default function MasterSubcategoriesPage() {
  return (
    <MasterManager
      titleKey="masterSubcategories"
      endpoint="/subcategories"
      relation="category"
    />
  );
}
