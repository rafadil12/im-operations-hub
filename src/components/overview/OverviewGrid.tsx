"use client";

import { useState } from "react";
import { overviewModules, type ModuleId } from "@/data/overview-mock";
import { ModuleCard } from "./ModuleCard";
import { CardExpandModal } from "./CardExpandModal";

export function OverviewGrid() {
  const [expandedId, setExpandedId] = useState<ModuleId | null>(null);
  const expanded = overviewModules.find((module) => module.id === expandedId);

  return (
    <>
      <div className="mb-3">
        <p className="text-sm text-text-muted">
          Overview dashboard — click a card to expand, then open the module detail.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {overviewModules.map((module) => (
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
