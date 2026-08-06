"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Trophy } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { RequesterRanking } from "./types";

type Props = {
  rows: RequesterRanking[];
};

export default function TopRequester({ rows }: Props) {
  const { t } = useLang();
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    if (rows.length <= 5) return;

    const timer = setInterval(() => {
      setStartIndex((prev) => (prev + 1) % rows.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (rows.length <= 5) return rows;

    return Array.from({ length: 5 }, (_, i) => {
      return rows[(startIndex + i) % rows.length];
    });
  }, [rows, startIndex]);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {t.itsm.topRequester}
          </h2>

          <p className="text-sm text-text-muted">
            {t.itsm.highestSubmittedTickets}
          </p>
        </div>

        <Trophy className="h-5 w-5 text-amber-500" />
      </div>

      <div className="divide-y divide-border-subtle overflow-hidden">
        {visibleRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-muted">
            {t.itsm.noRequesterData}
          </div>
        ) : (
          visibleRows.map((item, index) => (
            <div
              key={`${item.requester}-${startIndex}-${index}`}
              className="flex items-center justify-between px-5 py-3 transition-all duration-700 hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10">
                  <Users className="h-4 w-4 text-accent" />
                </div>

                <div>
                  <div className="font-medium text-text">
                    {item.requester}
                  </div>

                  <div className="text-xs text-text-muted">
                    {t.itsm.rank} #{((startIndex + index) % rows.length) + 1}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-text">
                  {item.totalTickets}
                </div>

                <div className="text-xs text-text-muted">
                  {t.itsm.tickets}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}