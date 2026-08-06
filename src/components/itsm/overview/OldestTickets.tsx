"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { OldestTicket } from "./types";

type Props = {
  rows: OldestTicket[];
};

export default function OldestTickets({ rows }: Props) {
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
            {t.itsm.oldestOpenTickets}
          </h2>

          <p className="text-sm text-text-muted">
            {t.itsm.longestPendingRequests}
          </p>
        </div>

        <AlertTriangle className="h-5 w-5 text-red-500" />
      </div>

      {visibleRows.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">
          {t.itsm.noOverdueTickets}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg/40">
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-left font-semibold">
                  {t.itsm.requestId}
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  {t.itsm.subject}
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  {t.itsm.technician}
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  {t.itsm.days}
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={`${row.requestId}-${startIndex}`}
                  className="border-b border-border-subtle transition-all duration-700 hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-medium">
                    {row.requestId}
                  </td>

                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate">
                      {row.subject}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {row.technician}
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-4 py-1.5 text-xs font-semibold text-red-600">
                      {row.daysOpen} {t.itsm.days}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}