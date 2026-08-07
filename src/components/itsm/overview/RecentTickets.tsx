"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { RecentTicket } from "./types";

type Props = {
  rows: RecentTicket[];
};

export default function RecentTickets({ rows }: Props) {
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
    <div className="min-w-0 rounded-xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-text">
            {t.itsm.recentTickets}
          </h2>

          <p className="text-sm text-text-muted">
            {t.itsm.latestCreatedItsmRequests}
          </p>
        </div>

        <Clock3 className="h-5 w-5 shrink-0 text-blue-500" />
      </div>

      {visibleRows.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">
          {t.itsm.noRecentTickets}
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[42%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
            </colgroup>

            <thead className="bg-bg/40">
              <tr className="border-b border-border-subtle">
                <th className="px-3 py-3 text-left font-semibold">
                  {t.itsm.requestId}
                </th>

                <th className="px-3 py-3 text-left font-semibold">
                  {t.itsm.subject}
                </th>

                <th className="px-3 py-3 text-left font-semibold">
                  {t.itsm.technician}
                </th>

                <th className="px-3 py-3 text-left font-semibold">
                  {t.itsm.status}
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={`${row.requestId}-${startIndex}`}
                  className="border-b border-border-subtle transition-all duration-700 hover:bg-surface-hover"
                >
                  <td className="px-3 py-3 font-medium">
                    <div className="truncate">{row.requestId}</div>
                  </td>

                  <td className="min-w-0 px-3 py-3">
                    <div className="truncate" title={row.subject}>
                      {row.subject}
                    </div>
                  </td>

                  <td className="min-w-0 px-3 py-3">
                    <div className="truncate" title={row.technician}>
                      {row.technician}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <span className="inline-flex max-w-full items-center truncate rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-green-700">
                      {row.status}
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
