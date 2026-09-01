import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import MaterialDocumentsPage from "./DocumentsClient";

export const metadata = pageMetadata({
  title: "Transaction History · Sparepart",
  description: "History of posted stock transactions.",
  path: "/sparepart/documents",
});

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          Loading...
        </div>
      }
    >
      <MaterialDocumentsPage />
    </Suspense>
  );
}
