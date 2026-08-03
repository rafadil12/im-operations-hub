import { Suspense } from "react";
import MaterialDocumentsPage from "./DocumentsClient";

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
