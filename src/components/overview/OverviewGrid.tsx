"use client";

import { useEffect, useState } from "react";
import {
  overviewModules,
  type ModuleCardData,
  type ModuleId,
} from "@/data/overview-mock";
import { apiGet } from "@/lib/apiClient";
import { getCurrentMonth, toDateInput } from "@/lib/dateRange";
import { mapAnalysisToOverview } from "@/lib/mapAnalysisToOverview";
import type { AnalysisResult } from "@/lib/types";
import { ModuleCard } from "./ModuleCard";
import { CardExpandModal } from "./CardExpandModal";

type AnalysisResponse = { result: AnalysisResult };

export function OverviewGrid() {
  const [modules, setModules] = useState<ModuleCardData[]>(overviewModules);
  const [expandedId, setExpandedId] = useState<ModuleId | null>(null);
  const expanded = modules.find((module) => module.id === expandedId);

  useEffect(() => {
    let cancelled = false;
    const month = getCurrentMonth();
    const start = toDateInput(month.start);
    const end = toDateInput(month.end);

    (async () => {
      try {
        const data = await apiGet<AnalysisResponse>(
          `/analysis?start=${start}&end=${end}`,
        );
        if (cancelled) return;
        setModules((prev) =>
          prev.map((mod) =>
            mod.id === "daily-operation"
              ? mapAnalysisToOverview(mod, data.result)
              : mod,
          ),
        );
      } catch {
        // Keep mock fallback on failure.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="mb-3">
        <p className="text-sm text-text-muted">
          Overview dashboard — click a card to expand, then open the module detail.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            data={module}
            onOpen={() => setExpandedId(module.id)}
          />
        ))}
      </div>

      <p className="mt-4 text-[11px] text-text-dim">
        * Click on any card to view more details.
      </p>

      {expanded ? (
        <CardExpandModal data={expanded} onClose={() => setExpandedId(null)} />
      ) : null}
    </>
  );
}
