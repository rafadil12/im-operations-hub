"use client";

import type { ReactNode } from "react";

/** Shared by Sparepart + Training so side-by-side trend panels match. */
export const ROW2_TREND_HEIGHT = { compact: 140, expanded: 280 } as const;

/**
 * Shared mid + bottom zones for overview cards in the same row.
 * Default: equal flex mid/bottom so bands align (ITSM / Daily / Safety).
 * `bottomFit`: bottom hugs chart height so mid lists keep room (Sparepart / Training).
 */
export function TwoZoneCardBody({
  mid,
  bottom,
  bottomFit = false,
}: {
  mid: ReactNode;
  bottom: ReactNode;
  bottomFit?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 grid-cols-1 content-stretch gap-4 md:grid-cols-2">
        {mid}
      </div>

      <section
        className={[
          "flex flex-col rounded-lg border border-border-subtle bg-bg/30 p-3",
          bottomFit ? "shrink-0" : "min-h-[12.5rem] flex-1",
        ].join(" ")}
      >
        {bottom}
      </section>
    </div>
  );
}
