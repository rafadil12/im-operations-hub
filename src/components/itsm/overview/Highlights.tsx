"use client";

import { Building2, UserRound, Timer, Trophy } from "lucide-react";

import { useLang } from "@/lib/i18n";
import type { HighlightData } from "./types";

type Props = {
  data: HighlightData;
};

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function RankingCard({
  rank,
  label,
  value,
  tickets,
  percent,
  subtitle,
  icon,
  accent,
}: {
  rank?: string;
  label: string;
  value: string;
  tickets: number;
  percent: number;
  subtitle: string;
  icon: React.ReactNode;
  accent: "blue" | "orange" | "green" | "violet";
}) {
  const accentMap = {
    blue: {
      icon: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
      bar: "bg-blue-500",
      glow: "bg-blue-500/10",
    },
    orange: {
      icon: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
      bar: "bg-orange-500",
      glow: "bg-orange-500/10",
    },
    green: {
      icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      bar: "bg-emerald-500",
      glow: "bg-emerald-500/10",
    },
    violet: {
      icon: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
      bar: "bg-violet-500",
      glow: "bg-violet-500/10",
    },
  }[accent];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl ${accentMap.glow}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentMap.icon}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted">
              {label}
            </p>
            {rank ? (
              <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-semibold text-text-dim">
                <Trophy size={11} /> {rank}
              </span>
            ) : null}
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-bg px-2 py-1 font-mono text-[9px] font-bold text-text-muted">
          {percent.toFixed(1)}%
        </span>
      </div>

      <div className="relative mt-4 min-w-0">
        <p className="truncate text-base font-extrabold text-text" title={value}>
          {value}
        </p>
        <p className="mt-1 text-[10px] font-medium text-text-muted">{subtitle}</p>
      </div>

      <div className="relative mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-bg">
          <div
            className={`h-full rounded-full ${accentMap.bar} transition-[width] duration-700 ease-out`}
            style={{ width: `${clampPercent(percent)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[9px]">
          <span className="text-text-dim">{tickets.toLocaleString()} tickets</span>
          <span className="font-mono font-semibold text-text-muted">
            {percent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Highlights({ data }: Props) {
  const { t } = useLang();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <RankingCard
        label={t.itsm.highestPriorityGroup}
        value={data.highestPriorityGroup}
        subtitle={t.itsm.mostActiveSupportGroup}
        tickets={data.highestPriorityGroupTickets ?? 0}
        percent={data.highestPriorityGroupPercent ?? 0}
        icon={<Building2 size={18} />}
        accent="blue"
      />

      <RankingCard
        rank="#1"
        label={t.itsm.busiestTechnician}
        value={data.busiestTechnician}
        subtitle={t.itsm.highestAssignedTickets}
        tickets={data.busiestTechnicianTickets ?? 0}
        percent={data.busiestTechnicianPercent ?? 0}
        icon={<UserRound size={18} />}
        accent="violet"
      />

      <RankingCard
        rank="#1"
        label={t.itsm.topRequester}
        value={data.topRequester}
        subtitle={t.itsm.mostSubmittedTickets}
        tickets={data.topRequesterTickets ?? 0}
        percent={data.topRequesterPercent ?? 0}
        icon={<UserRound size={18} />}
        accent="orange"
      />

      <RankingCard
        label={t.itsm.incidents}
        value={data.incidentCount.toLocaleString()}
        subtitle={t.itsm.nonServiceRequestTickets}
        tickets={data.incidentCount ?? 0}
        percent={data.incidentPercent ?? 0}
        icon={<Timer size={18} />}
        accent="green"
      />
    </div>
  );
}
