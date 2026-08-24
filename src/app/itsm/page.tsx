"use client";

import { useEffect, useState } from "react";
import { apiGet, getApiErrorMessage } from "@/lib/apiClient";
import ItsmOverview from "@/components/itsm/overview/ItsmOverview";
import type { ItsmOverviewData } from "@/components/itsm/overview";

export default function ItsmPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ItsmOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGet<ItsmOverviewData>("/overview", "itsm")
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(getApiErrorMessage(e) || "Failed to load ITSM Overview.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-10 text-center">
        Loading ITSM Overview...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-10 text-center text-red-500">
        {error ?? "Failed to load ITSM Overview."}
      </div>
    );
  }

  return <ItsmOverview data={data} />;
}
