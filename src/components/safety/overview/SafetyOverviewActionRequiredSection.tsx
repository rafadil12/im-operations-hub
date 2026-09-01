import {
  getActivityTitle,
  getLocalizedValue,
  type SafetyLanguage,
  type SafetyRow,
  safetyText,
} from "@/lib/safety";
import { SectionHeader } from "./SectionHeader";

type SafetyOverviewActionRequiredSectionProps = {
  safetyLanguage: SafetyLanguage;
  actionRows: SafetyRow[];
  pic: string;
};

export function SafetyOverviewActionRequiredSection({
  safetyLanguage,
  actionRows,
  pic,
}: SafetyOverviewActionRequiredSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 md:p-5 safety-scroll-animate">
      <SectionHeader
        title={safetyText("actionRequired", safetyLanguage)}
        description={safetyText("activitiesNeedAttention", safetyLanguage)}
      />

      <div className="mt-4 space-y-2">
        {actionRows.length === 0 ? (
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/5 p-4 text-center">
            <p className="text-sm font-medium text-success">
              {safetyText("noActionRequired", safetyLanguage)}
            </p>

            <p className="mt-1 text-xs text-text-muted">
              {safetyText("allActivitiesOnTrack", safetyLanguage)}
            </p>
          </div>
        ) : (
          actionRows.map((row) => {
            const danger = true;

            return (
              <div
                key={`${row.id}-${row.week ?? "monthly"}`}
                className="grid gap-3 rounded-lg border border-rose-400/30 bg-rose-500/5 p-3 md:grid-cols-[4px_1fr_auto]"
              >
                <div className="hidden rounded-full bg-rose-500 md:block" />

                <div>
                  <p className="text-sm font-medium text-text">
                    {getActivityTitle(row.activity_type, safetyLanguage)}
                  </p>

                  <p className="mt-1 text-[11px] text-text-dim">
                    {safetyText("pic", safetyLanguage)}:{" "}
                    {getLocalizedValue(row.pic_en ?? row.pic, row.pic_cn, safetyLanguage) !== "—"
                      ? getLocalizedValue(row.pic_en ?? row.pic, row.pic_cn, safetyLanguage)
                      : pic}
                  </p>

                  <p className="text-[11px] text-text-dim">
                    {safetyText("description", safetyLanguage)}:{" "}
                    {getLocalizedValue(
                      row.description_en ?? row.description,
                      row.description_cn,
                      safetyLanguage
                    ) !== "—"
                      ? getLocalizedValue(
                          row.description_en ?? row.description,
                          row.description_cn,
                          safetyLanguage
                        )
                      : danger
                        ? safetyText("safetyCaseNeedsAttention", safetyLanguage)
                        : safetyText("activityNotSubmitted", safetyLanguage)}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-[10px] uppercase tracking-wide text-text-dim">
                    {safetyText("status", safetyLanguage)}
                  </p>

                  <span className="mt-1 inline-flex rounded-md bg-rose-500/10 px-2 py-1 text-[9px] font-medium text-danger">
                    {row.status === "case_found"
                      ? safetyText("safetyCaseNeedsAttention", safetyLanguage)
                      : safetyLanguage === "cn"
                        ? "未提交"
                        : "Not Submitted"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
