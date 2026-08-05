"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import ItsmOverview from "@/components/itsm/overview/ItsmOverview";
import type { ItsmOverviewData } from "@/components/itsm/overview";

export default function ItsmPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ItsmOverviewData | null>(null);

  useEffect(() => {
    apiGet<ItsmOverviewData>("/overview", "itsm")
      .then(setData)
      .finally(() => setLoading(false));
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
        Failed to load ITSM Overview.
      </div>
    );
  }

  return <ItsmOverview data={data} />;
}