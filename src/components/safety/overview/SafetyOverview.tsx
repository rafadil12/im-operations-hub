"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { type SafetyLanguage, type SafetyRow, getSafetyData, safetyText } from "@/lib/safety";
import { computeSafetyOverviewMetrics } from "@/lib/safety/overviewMetrics";
import { SafetyOverviewStyles } from "./SafetyOverviewStyles";
import { SafetyOverviewHeader } from "./SafetyOverviewHeader";
import { SafetyOverviewKpiSection } from "./SafetyOverviewKpiSection";
import { SafetyOverviewMainCharts } from "./SafetyOverviewMainCharts";
import { SafetyOverviewTrendSection } from "./SafetyOverviewTrendSection";
import { SafetyOverviewTrainingMonthlySection } from "./SafetyOverviewTrainingMonthlySection";
import { SafetyOverviewScoreSection } from "./SafetyOverviewScoreSection";
import { SafetyOverviewWeeklySection } from "./SafetyOverviewWeeklySection";
import { SafetyOverviewTrainingTableSection } from "./SafetyOverviewTrainingTableSection";
import { SafetyOverviewActionRequiredSection } from "./SafetyOverviewActionRequiredSection";

export function SafetyOverview() {
  const { lang } = useLang();

  const initialDate = new Date();

  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth() + 1);

  const safetyLanguage: SafetyLanguage = lang;

  const [weeklyRows, setWeeklyRows] = useState<SafetyRow[]>([]);

  const [monthlyRows, setMonthlyRows] = useState<SafetyRow[]>([]);

  useEffect(() => {
    let active = true;

    getSafetyData(selectedYear, selectedMonth).then((data) => {
      if (!active) return;

      setWeeklyRows(data.weeklyRows);
      setMonthlyRows(data.monthlyRows);
    });

    return () => {
      active = false;
    };
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".safety-scroll-animate"));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            element.classList.add("is-visible");
          } else {
            element.classList.remove("is-visible");
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const metrics = computeSafetyOverviewMetrics({
    weeklyRows,
    monthlyRows,
    selectedYear,
    selectedMonth,
    safetyLanguage,
  });

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((year) => year - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((month) => month - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((year) => year + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((month) => month + 1);
    }
  };

  return (
    <>
      <SafetyOverviewStyles />

      <div className="safety-overview-page space-y-5">
        <SafetyOverviewHeader
          safetyLanguage={safetyLanguage}
          monthLabel={metrics.monthLabel}
          overallCompletion={metrics.overallCompletion}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
        />

        <SafetyOverviewKpiSection
          safetyLanguage={safetyLanguage}
          trainingCompleted={metrics.trainingCompleted}
          trainingTarget={metrics.trainingTarget}
          hazardFinding={metrics.hazardFinding}
          cleaningFinding={metrics.cleaningFinding}
          totalFinding={metrics.totalFinding}
          monthlyActivityData={metrics.monthlyActivityData}
          overallCompletion={metrics.overallCompletion}
        />

        <SafetyOverviewMainCharts
          safetyLanguage={safetyLanguage}
          weeklyTrend={metrics.weeklyTrend}
          closed={metrics.closed}
          inProgress={metrics.inProgress}
          open={metrics.open}
          closureRate={metrics.closureRate}
        />

        <SafetyOverviewTrendSection
          safetyLanguage={safetyLanguage}
          weeklyTrend={metrics.weeklyTrend}
        />

        <SafetyOverviewTrainingMonthlySection
          safetyLanguage={safetyLanguage}
          trainingWeekly={metrics.trainingWeekly}
          trainingCompleted={metrics.trainingCompleted}
          trainingTarget={metrics.trainingTarget}
          trainingRate={metrics.trainingRate}
          monthlyActivityData={metrics.monthlyActivityData}
        />

        <SafetyOverviewScoreSection
          safetyLanguage={safetyLanguage}
          overallCompletion={metrics.overallCompletion}
          closureRate={metrics.closureRate}
          trainingRate={metrics.trainingRate}
          safetyScore={metrics.safetyScore}
        />

        <SafetyOverviewWeeklySection
          safetyLanguage={safetyLanguage}
          weeklyRows={weeklyRows}
          weeklyCompleted={metrics.weeklyCompleted}
          weeklyTarget={metrics.weeklyTarget}
          weeklyCompletion={metrics.weeklyCompletion}
        />

        <SafetyOverviewTrainingTableSection
          safetyLanguage={safetyLanguage}
          recentTraining={metrics.recentTraining}
          pic={metrics.pic}
          trainingRate={metrics.trainingRate}
        />

        <SafetyOverviewActionRequiredSection
          safetyLanguage={safetyLanguage}
          actionRows={metrics.actionRows}
          pic={metrics.pic}
        />

        <div className="pb-2 text-center text-[10px] text-text-dim">
          {safetyText("itSafetyManagementSystem", safetyLanguage)}
          {" • 2026"}
        </div>
      </div>
    </>
  );
}
