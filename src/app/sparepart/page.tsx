"use client";

import Link from "next/link";
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

  const hasAnySparepart =
    access.canViewSparepartStock ||
    access.canPostSparepartDocument ||
    access.canViewSparepartDocuments ||
    access.canViewSparepartMaterials ||
    access.canManageSparepartLocations;

  useEffect(() => {
    if (loading) return;
    if (!hasAnySparepart) {
      router.replace("/");
    }
  }, [hasAnySparepart, loading, router]);

  if (loading || !hasAnySparepart) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.common.loading}
      </div>
    );
  }

  const links = [
    {
      href: "/sparepart/stock",
      label: t.nav.sparepartStock,
      desc: t.sparepart.stockDesc,
      visible: access.canViewSparepartStock,
    },
    {
      href: "/sparepart/post",
      label: t.nav.sparepartPost,
      desc: t.sparepart.postDesc,
      visible: access.canPostSparepartDocument,
    },
    {
      href: "/sparepart/documents",
      label: t.nav.sparepartDocuments,
      desc: t.sparepart.documentsDesc,
      visible: access.canViewSparepartDocuments,
    },
    {
      href: "/sparepart/materials",
      label: t.nav.sparepartMaterials,
      desc: t.sparepart.materialsDesc,
      visible: access.canViewSparepartMaterials,
    },
    {
      href: "/sparepart/locations",
      label: t.nav.sparepartLocations,
      desc: t.sparepart.locationsDesc,
      visible: access.canManageSparepartLocations,
    },
  ].filter((link) => link.visible);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-text">
          {t.sparepart.overviewTitle}
        </h1>
        <p className="text-sm text-text-muted">{t.sparepart.overviewDesc}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-border-subtle bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-hover"
          >
            <div className="text-sm font-medium text-text">{link.label}</div>
            <p className="mt-1 text-xs text-text-muted">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
