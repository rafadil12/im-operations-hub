import {
  formatOverviewDate,
  getLocalizedValue,
  type SafetyLanguage,
  type SafetyRow,
  safetyText,
} from "@/lib/safety";
import { SectionHeader } from "./SectionHeader";
import { StatusBadge } from "./StatusBadge";

type SafetyOverviewTrainingTableSectionProps = {
  safetyLanguage: SafetyLanguage;
  recentTraining: SafetyRow[];
  pic: string;
  trainingRate: number;
};

export function SafetyOverviewTrainingTableSection({
  safetyLanguage,
  recentTraining,
  pic,
  trainingRate,
}: SafetyOverviewTrainingTableSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
      <SectionHeader
        title={safetyText("safetyTraining", safetyLanguage)}
        description={safetyText("trainingCompletionByWeek", safetyLanguage)}
      />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[650px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                {safetyText("overviewWeek", safetyLanguage)}
              </th>

              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                {safetyText("date", safetyLanguage)}
              </th>

              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                {safetyText("pic", safetyLanguage)}
              </th>

              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                {safetyText("description", safetyLanguage)}
              </th>

              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-dim">
                {safetyText("status", safetyLanguage)}
              </th>
            </tr>
          </thead>

          <tbody>
            {recentTraining.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-xs text-text-muted">
                  {safetyText("noTrainingData", safetyLanguage)}
                </td>
              </tr>
            ) : (
              recentTraining.map((row) => (
                <tr key={row.id} className="border-b border-border-subtle last:border-b-0">
                  <td className="px-3 py-3 text-xs font-medium text-text">W{row.week ?? "—"}</td>

                  <td className="px-3 py-3 text-xs text-text-muted">
                    {formatOverviewDate(row.submission_date, safetyLanguage)}
                  </td>

                  <td className="px-3 py-3 text-xs text-text">
                    {getLocalizedValue(row.pic_en ?? row.pic, row.pic_cn, safetyLanguage) || pic}
                  </td>

                  <td className="px-3 py-3 text-xs text-text-muted">
                    {getLocalizedValue(
                      row.description_en ?? row.description,
                      row.description_cn,
                      safetyLanguage
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <StatusBadge status={row.status} language={safetyLanguage} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {safetyText("trainingAttendance", safetyLanguage)}
          </span>

          <span className="text-xs font-semibold text-text">{trainingRate}%</span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-cyan-500"
            style={{
              width: `${trainingRate}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
