"use client";

import type { ReactNode } from "react";

/**
 * Shared mid + bottom zones for ITSM / Daily / Safety overview cards.
 * Both zones take equal flex space so yellow/red bands align across the row.
 */
export function TwoZoneCardBody({ mid, bottom }: { mid: ReactNode; bottom: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 grid-cols-1 content-stretch gap-4 md:grid-cols-2">
        {mid}
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle bg-bg/30 p-3">
        {bottom}
      </section>
    </div>
  );
}
