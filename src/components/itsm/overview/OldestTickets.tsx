"use client";

import { AlertTriangle } from "lucide-react";
import type { OldestTicket } from "./types";

type Props = {
  rows: OldestTicket[];
};

export default function OldestTickets({ rows }: Props) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-text">
            Oldest Open Tickets
          </h2>

          <p className="text-sm text-text-muted">
            Longest pending requests
          </p>
        </div>

        <AlertTriangle className="h-5 w-5 text-red-500" />
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">
          No overdue tickets.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg/40">
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-left font-semibold">
                  Request ID
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Subject
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Technician
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Days
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.requestId}
                  className="border-b border-border-subtle hover:bg-surface-hover"
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

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-300">
                      {row.daysOpen} Days
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