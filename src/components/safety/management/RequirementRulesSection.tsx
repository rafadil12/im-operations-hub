"use client";

import {
  type ActivityConfig,
  type SafetyLanguage,
  localizeActivity,
  safetyText,
} from "@/lib/safety";

type RequirementRulesSectionProps = {
  language: SafetyLanguage;
  safetyPoints: number;
  onSafetyPointsChange: (value: string) => void;
  allActivities: ActivityConfig[];
};

export function RequirementRulesSection({
  language,
  safetyPoints,
  onSafetyPointsChange,
  allActivities,
}: RequirementRulesSectionProps) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-text">
          {safetyText("requirementRules", language)}
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          {safetyText("requirementRulesDescription", language)}
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {/* Manual monthly Safety Points card */}
        <div className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-sm">
          <div className="flex h-full items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-base">
              🎯
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text">
                {language === "cn" ? "安全积分" : "Safety Points"}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="shrink-0 text-[10px] text-text-muted">
                  {language === "cn" ? "本月" : "This Month"}
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={safetyPoints}
                  onChange={(event) => onSafetyPointsChange(event.target.value)}
                  className="h-8 w-28 rounded-md border border-border bg-bg px-2 text-sm font-semibold text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  aria-label={language === "cn" ? "本月安全积分" : "This month's safety points"}
                />

                <span className="shrink-0 text-[10px] font-medium text-text-muted">
                  {language === "cn" ? "分" : "pts"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {allActivities.map((rawActivity) => {
          const a = localizeActivity(rawActivity, language);

          return (
            <div
              key={a.id}
              className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <div className="flex h-full items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-base">
                  {a.icon}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text">{a.title}</p>
                  <p className="mt-1 text-[10px] text-text-muted">{a.requirement}</p>
                  <p className="mt-1 text-[9px] text-text-dim">
                    {a.uploadKind === "none"
                      ? safetyText("checklistOnly", language)
                      : a.uploadKind === "before-after"
                        ? safetyText("beforeAfter", language)
                        : a.uploadKind === "image-video"
                          ? safetyText("photoVideo", language)
                          : a.uploadKind === "video-excel"
                            ? safetyText("videoExcel", language)
                            : safetyText("pptFile", language)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
