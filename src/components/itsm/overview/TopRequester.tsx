"use client";

import { Users, Trophy } from "lucide-react";
import type { RequesterRanking } from "./types";

type Props = {
  rows: RequesterRanking[];
};

export default function TopRequester({ rows }: Props) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-text">
            Top Requester
          </h2>

          <p className="text-sm text-text-muted">
            Highest submitted tickets
          </p>
        </div>

        <Trophy className="h-5 w-5 text-amber-500" />
      </div>

      <div className="divide-y divide-border-subtle">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-text-muted">
            No requester data.
          </div>
        ) : (
          rows.map((item, index) => (
            <div
              key={`${item.requester}-${index}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-surface-hover transition-colors"
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
                    Rank #{index + 1}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-text">
                  {item.totalTickets}
                </div>

                <div className="text-xs text-text-muted">
                  Tickets
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}