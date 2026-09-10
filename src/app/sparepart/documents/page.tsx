import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import { SkeletonPage } from "@/components/ui/skeletons";
import MaterialDocumentsPage from "./DocumentsClient";

export const metadata = pageMetadata({
  title: "Transaction History · Sparepart",
  description: "History of posted stock transactions.",
  path: "/sparepart/documents",
});

export default function DocumentsPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <MaterialDocumentsPage />
    </Suspense>
  );
}
