import { pageMetadata } from "@/lib/seo";
import StorageLocationsPage from "./LocationsClient";

export const metadata = pageMetadata({
  title: "Storage Locations · Sparepart",
  description: "Maintain storage location master data.",
  path: "/sparepart/locations",
});

export default function LocationsPage() {
  return <StorageLocationsPage />;
}
