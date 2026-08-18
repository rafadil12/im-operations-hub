"use client";

const weeklyRequirements = [
  {
    title: "Safety Training",
    description: "Every Tuesday",
    target: "1 Training",
    completed: true,
    icon: "🎓",
  },
  {
    title: "Hazard Finding",
    description: "Weekly requirement",
    target: "1 Finding",
    completed: true,
    icon: "⚠️",
  },
  {
    title: "Cleaning Finding",
    description: "Weekly requirement",
    target: "1 Finding",
    completed: false,
    icon: "🧹",
  },
];

const trainingData = [
  {
    week: "W31",
    date: "04 Aug 2026",
    topic: "Fire Safety",
    status: "Completed",
  },
  {
    week: "W32",
    date: "11 Aug 2026",
    topic: "Electrical Safety",
    status: "Completed",
  },
  {
    week: "W33",
    date: "18 Aug 2026",
    topic: "Cyber Security",
    status: "Completed",
  },
  {
    week: "W34",
    date: "25 Aug 2026",
    topic: "Emergency Response",
    status: "Planned",
  },
];

const activityData = [
  {
    week: "W31",
    hazard: 1,
    cleaning: 1,
  },
  {
    week: "W32",
    hazard: 1,
    cleaning: 1,
  },
  {
    week: "W33",
    hazard: 1,
    cleaning: 1,
  },
  {
    week: "W34",
    hazard: 1,
    cleaning: 0,
  },
];

const actionData = [
  {
    title: "Cleaning Finding — Week 34",
    detail: "Cleaning finding has not been submitted.",
    pic: "PIC: IT Team",
    due: "18 Aug 2026",
    priority: "High",
  },
  {
    title: "Monthly Safety PPT",
    detail: "Prepare monthly safety activity summary.",
    pic: "PIC: IT Team",
    due: "31 Aug 2026",
    priority: "Medium",
  },
];

export default function SafetyOverviewPage() {
  const completedRequirements = weeklyRequirements.filter(
    (item) => item.completed,
  ).length;

  const totalRequirements = weeklyRequirements.length;

  const weeklyCompletion = Math.round(
    (completedRequirements / totalRequirements) * 100,
  );

  const totalHazard = activityData.reduce(
    (sum, item) => sum + item.hazard,
    0,
  );

  const totalCleaning = activityData.reduce(
    (sum, item) => sum + item.cleaning,
    0,
  );

  const totalFinding = totalHazard + totalCleaning;

  return (
    <div className="space-y-5">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">
            Safety Overview
          </h1>

          <p className="mt-1 text-sm text-text-muted">
            IT Safety Training & Weekly Safety Activity Overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted">
            August 2026
          </div>

          <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success">
            <span className="size-2 rounded-full bg-success" />
            On Track
          </div>
        </div>
      </div>

      {/* =====================================================
          KPI
      ====================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Safety Training"
          value="3 / 4"
          description="This month"
          icon="🎓"
        />

        <KpiCard
          title="Hazard Finding"
          value={`${totalHazard} / 4`}
          description="Monthly target"
          icon="⚠️"
        />

        <KpiCard
          title="Cleaning Finding"
          value={`${totalCleaning} / 4`}
          description="Monthly target"
          icon="🧹"
        />

        <KpiCard
          title="Total Finding"
          value={String(totalFinding)}
          description="This month"
          icon="🔎"
        />

        <KpiCard
          title="Safety Meeting"
          value="4 / 4"
          description="Weekly meeting"
          icon="📅"
        />

        <KpiCard
          title="Completion Rate"
          value={`${weeklyCompletion}%`}
          description="Current week"
          icon="📊"
        />
      </div>

      {/* =====================================================
          WEEKLY REQUIREMENT
      ====================================================== */}

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5">
        <SectionHeader
          title="Weekly Safety Requirement"
          description="Week 34 — Required safety activities"
        />

        <div className="grid gap-3 md:grid-cols-3">
          {weeklyRequirements.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border-subtle bg-bg/30 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-lg">
                    {item.icon}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs text-text-muted">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div
                  className={[
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    item.completed
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger",
                  ].join(" ")}
                >
                  {item.completed ? "✓" : "!"}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-text-dim">
                  Requirement
                </span>

                <span className="text-xs font-medium text-text-muted">
                  {item.target}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border-subtle bg-bg/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-dim">
                Weekly Completion
              </p>

              <p className="mt-1 text-2xl font-semibold text-text">
                {completedRequirements} / {totalRequirements}
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-semibold text-accent">
                {weeklyCompletion}%
              </p>

              <p className="text-xs text-text-muted">
                Current week
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${weeklyCompletion}%` }}
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          ACTIVITY TREND + FINDING STATUS
      ====================================================== */}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* ACTIVITY TREND */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5">
          <SectionHeader
            title="Safety Activity Trend"
            description="Weekly safety findings"
          />

          <div className="mt-5">
            <div className="flex h-64 items-end gap-4 border-b border-border-subtle px-2 pb-8">
              {activityData.map((item) => (
                <div
                  key={item.week}
                  className="flex h-full flex-1 items-end justify-center gap-1"
                >
                  <div className="relative flex h-full items-end">
                    <div
                      className="w-5 rounded-t bg-warning transition-all"
                      style={{
                        height: `${item.hazard === 0 ? 4 : 100}%`,
                      }}
                      title={`${item.week} Hazard: ${item.hazard}`}
                    />

                    {item.hazard > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted">
                        {item.hazard}
                      </span>
                    )}
                  </div>

                  <div className="relative flex h-full items-end">
                    <div
                      className="w-5 rounded-t bg-success transition-all"
                      style={{
                        height: `${item.cleaning === 0 ? 4 : 100}%`,
                      }}
                      title={`${item.week} Cleaning: ${item.cleaning}`}
                    />

                    {item.cleaning > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted">
                        {item.cleaning}
                      </span>
                    )}
                  </div>

                  <span className="absolute mt-[275px] text-[10px] text-text-dim">
                    {item.week}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-5">
              <Legend
                color="bg-warning"
                label="Hazard Finding"
              />

              <Legend
                color="bg-success"
                label="Cleaning Finding"
              />
            </div>
          </div>
        </section>

        {/* FINDING STATUS */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5">
          <SectionHeader
            title="Finding Status"
            description="Current month"
          />

          <div className="mt-5 space-y-5">
            <StatusBar
              label="Closed"
              value={6}
              total={8}
              color="bg-success"
            />

            <StatusBar
              label="In Progress"
              value={1}
              total={8}
              color="bg-warning"
            />

            <StatusBar
              label="Open"
              value={1}
              total={8}
              color="bg-danger"
            />
          </div>

          <div className="mt-6 rounded-lg border border-border-subtle bg-bg/30 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-text-dim">
              Finding Closure Rate
            </p>

            <p className="mt-1 text-3xl font-semibold text-success">
              75%
            </p>

            <p className="mt-1 text-xs text-text-muted">
              6 of 8 findings closed
            </p>
          </div>
        </section>
      </div>

      {/* =====================================================
          TRAINING + COMPETITION
      ====================================================== */}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* TRAINING */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5">
          <SectionHeader
            title="Safety Training"
            description="Training schedule — Every Tuesday"
          />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                    Week
                  </th>

                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                    Date
                  </th>

                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                    Topic
                  </th>

                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {trainingData.map((item) => (
                  <tr
                    key={item.week}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <td className="px-3 py-3 text-xs font-medium text-text">
                      {item.week}
                    </td>

                    <td className="px-3 py-3 text-xs text-text-muted">
                      {item.date}
                    </td>

                    <td className="px-3 py-3 text-xs text-text">
                      {item.topic}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={[
                          "inline-flex rounded-md px-2 py-1 text-[10px] font-medium",
                          item.status === "Completed"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning",
                        ].join(" ")}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                Training Attendance
              </span>

              <span className="text-xs font-semibold text-text">
                92%
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: "92%" }}
              />
            </div>
          </div>
        </section>

        {/* COMPETITION */}

        <section className="rounded-xl border border-border bg-surface p-4 md:p-5">
          <SectionHeader
            title="Monthly Safety Competition"
            description="August 2026"
          />

          <div className="mt-4 rounded-lg border border-border-subtle bg-bg/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-lg">
                🏆
              </div>

              <div>
                <p className="text-sm font-semibold text-text">
                  IT Safety Awareness Challenge
                </p>

                <p className="mt-1 text-xs text-text-muted">
                  Monthly safety competition
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <CompetitionStat
                value="1"
                label="Competition"
              />

              <CompetitionStat
                value="32"
                label="Participants"
              />

              <CompetitionStat
                value="95"
                label="Top Score"
              />
            </div>

            <div className="mt-4 rounded-md border border-warning/20 bg-warning/10 px-3 py-3">
              <p className="text-xs text-text-muted">
                Winner
              </p>

              <p className="mt-1 text-sm font-semibold text-text">
                IT Infrastructure Team
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* =====================================================
          ACTION REQUIRED
      ====================================================== */}

      <section className="rounded-xl border border-border bg-surface p-4 md:p-5">
        <SectionHeader
          title="Action Required"
          description="Activities that need attention"
        />

        <div className="mt-4 space-y-2">
          {actionData.map((item) => (
            <div
              key={item.title}
              className="grid gap-3 rounded-lg border border-border-subtle bg-bg/20 p-3 md:grid-cols-[4px_1fr_auto]"
            >
              <div
                className={[
                  "hidden rounded-full md:block",
                  item.priority === "High"
                    ? "bg-danger"
                    : "bg-warning",
                ].join(" ")}
              />

              <div>
                <p className="text-sm font-medium text-text">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-text-muted">
                  {item.detail}
                </p>

                <p className="mt-1 text-[11px] text-text-dim">
                  {item.pic}
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-[10px] uppercase tracking-wide text-text-dim">
                  Due Date
                </p>

                <p className="mt-1 text-xs font-medium text-text">
                  {item.due}
                </p>

                <span
                  className={[
                    "mt-1 inline-flex rounded-md px-2 py-1 text-[9px] font-medium",
                    item.priority === "High"
                      ? "bg-danger/10 text-danger"
                      : "bg-warning/10 text-warning",
                  ].join(" ")}
                >
                  {item.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <div className="pb-2 text-center text-[10px] text-text-dim">
        IT Safety Management System • 2026
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function KpiCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-wide text-text-dim">
          {title}
        </p>

        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-sm">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold text-text">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-text-muted">
        {description}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">
        {title}
      </h2>

      <p className="mt-1 text-xs text-text-muted">
        {description}
      </p>
    </div>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${color}`} />
      <span className="text-[11px] text-text-muted">
        {label}
      </span>
    </div>
  );
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {label}
        </span>

        <span className="text-xs font-semibold text-text">
          {value}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-1 text-right text-[10px] text-text-dim">
        {percentage}%
      </p>
    </div>
  );
}

function CompetitionStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-3 text-center">
      <p className="text-lg font-semibold text-text">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-text-dim">
        {label}
      </p>
    </div>
  );
}