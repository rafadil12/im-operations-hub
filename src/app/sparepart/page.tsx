"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { SparepartOverview } from "@/components/sparepart/overview";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { apiGetAbs, getApiErrorMessage } from "@/lib/apiClient";
import { getCurrentMonth, toDateInput } from "@/lib/dateRange";
import { useLang } from "@/lib/i18n";
import type { SparepartOverviewData } from "@/lib/sparepartOverview";

const month = getCurrentMonth();
const defaultRange = {
  start: toDateInput(month.start),
  end: toDateInput(month.end),
};

const ctrl =
  "cursor-pointer rounded-md border border-border bg-bg/40 px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent";

export default function SparepartIndexPage() {
  const router = useRouter();
  const { loading } = useAuth();
  const access = useRoleAccess();
  const { t } = useLang();
  const [category, setCategory] = useState<string | null>(null);
  const [range, setRange] = useState(defaultRange);
  const [draft, setDraft] = useState(defaultRange);
  const [data, setData] = useState<SparepartOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const hasAnySparepart =
    access.canViewSparepartStock ||
    access.canPostSparepartDocument ||
    access.canViewSparepartDocuments ||
    access.canViewSparepartMaterials ||
    access.canManageSparepartLocations;

  const load = useCallback(
    async (code: string | null, applied: { start: string; end: string }) => {
      setFetching(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (code) qs.set("category", code);
        qs.set("start", applied.start);
        qs.set("end", applied.end);
        const next = await apiGetAbs<SparepartOverviewData>(
          `/api/sparepart/overview?${qs.toString()}`,
        );
        setData(next);
      } catch (e) {
        setData(null);
        setError(getApiErrorMessage(e) || t.common.error);
      } finally {
        setFetching(false);
      }
    },
    [t.common.error],
  );

  useEffect(() => {
    if (loading) return;
    if (!hasAnySparepart) {
      router.replace("/");
    }
  }, [hasAnySparepart, loading, router]);

  useEffect(() => {
    if (loading || !access.canViewSparepartStock) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch overview when filter changes
    void load(category, range);
  }, [access.canViewSparepartStock, category, load, loading, range]);

  if (loading || !hasAnySparepart) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
        {t.common.loading}
      </div>
    );
  }

  if (!access.canViewSparepartStock) {
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">
            {t.sparepart.overviewTitle}
          </h1>
          <p className="text-sm text-text-muted">{t.sparepart.overviewDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className={ctrl}
            value={draft.start}
            onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
          />
          <span className="text-xs text-text-dim">–</span>
          <input
            type="date"
            className={ctrl}
            value={draft.end}
            onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => setRange(draft)}
            className="cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {t.common.apply}
          </button>
        </div>
      </div>

      {fetching && !data ? (
        <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center text-sm text-text-muted">
          {t.common.loading}
        </div>
      ) : null}

      {error && !data ? (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-8 text-center text-sm text-danger">
          {error}
        </div>
      ) : null}

      {data ? (
        <SparepartOverview
          data={data}
          category={category}
          onCategoryChange={setCategory}
        />
      ) : null}
    </div>
  );
}
