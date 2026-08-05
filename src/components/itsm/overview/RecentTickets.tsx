"use client";

import { Clock3 } from "lucide-react";
import type { RecentTicket } from "./types";
import StatusBadge from "@/components/itsm/StatusBadge";

type Props = {
  rows: RecentTicket[];
};

export default function RecentTickets({ rows }: Props) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-text">
            Recent Tickets
          </h2>

          <p className="text-sm text-text-muted">
            Latest created ITSM requests
          </p>
        </div>

        <Clock3 className="h-5 w-5 text-blue-500" />
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-text-muted">
          No recent tickets.
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

                <th className="px-4 py-3 text-left font-semibold">
                  Status
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

                  <td className="px-4 py-3">
                    <StatusBadge
                      label={row.status}
                      toneKey={row.status}
                    />
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