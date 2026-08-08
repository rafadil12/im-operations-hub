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

    apiGet<ItsmOverviewData>("/overview", "itsm")
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        // #region agent log
        fetch('http://127.0.0.1:7441/ingest/b0db2ec0-9a05-4761-88ea-3462e0be0a54',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'72cffc'},body:JSON.stringify({sessionId:'72cffc',runId:'post-fix',hypothesisId:'B',location:'itsm/page.tsx:catch',message:'itsm overview fetch handled',data:{errorMessage:getApiErrorMessage(e)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
