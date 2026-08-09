"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLang } from "@/lib/i18n";

export default function SparepartIndexPage() {
  const router = useRouter();
  const { loading } = useAuth();
  const access = useRoleAccess();
  const { t } = useLang();

  useEffect(() => {
    if (loading) return;
    if (access.canViewSparepartStock) {
      router.replace("/sparepart/stock");
      return;
    }
    if (access.canPostSparepartDocument) {
      router.replace("/sparepart/post");
      return;
    }
    if (access.canViewSparepartDocuments) {
      router.replace("/sparepart/documents");
      return;
    }
    if (access.canViewSparepartMaterials) {
      router.replace("/sparepart/materials");
      return;
    }
    if (access.canManageSparepartLocations) {
      router.replace("/sparepart/locations");
      return;
    }
    router.replace("/");
  }, [access, loading, router]);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
      {t.common.loading}
    </div>
  );
}
