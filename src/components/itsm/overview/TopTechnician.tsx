"use client";

import { useEffect, useState } from "react";
import { Medal, User } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { TechnicianRanking } from "./types";

type Props = {
  rows: TechnicianRanking[];
};

export default function TopTechnician({ rows }: Props) {
  const { t } = useLang();

  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    if (rows.length <= 5) return;

    const interval = setInterval(() => {
      setStartIndex((prev) =>
        prev + 1 >= rows.length ? 0 : prev + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [rows]);

  const visibleRows =
    rows.length <= 5
      ? rows
      : Array.from(
          { length: 5 },
          (_, i) => rows[(startIndex + i) % rows.length]
        );

  return (
    <div className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {t.itsm.topTechnician}
          </h2>

          <p className="text-sm text-text-muted">
            {t.itsm.highestAssignedTickets}
          </p>
        </div>

        <Medal className="h-5 w-5 text-yellow-500" />
      </div>

      <div className="divide-y divide-border-subtle overflow-hidden">
        {visibleRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-muted">
            {t.itsm.noTechnicianData}
          </div>
        ) : (
          visibleRows.map((item, index) => (
            <div
              key={`${item.technician}-${startIndex}-${index}`}
              className="flex items-center justify-between px-5 py-3 transition-all duration-700 hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10">
                  <User className="h-4 w-4 text-accent" />
                </div>

                <div>
                  <div className="font-medium text-text">
                    {item.technician}
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