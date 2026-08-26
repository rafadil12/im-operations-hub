import { pageMetadata } from "@/lib/seo";
import MaterialMasterPage from "./MaterialsClient";

export const metadata = pageMetadata({
  title: "Items · Sparepart",
  description:
    "Maintain item master data (code, name, brand, model, category, min stock).",
  path: "/sparepart/materials",
});

export default function MaterialsPage() {
  return <MaterialMasterPage />;
}
