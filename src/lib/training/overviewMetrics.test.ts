import { describe, expect, it } from "vitest";
import { computeTrainingOverviewMetrics } from "./overviewMetrics";
import type { TrainingSession } from "./types";

const sample: TrainingSession[] = [
  {
    id: 1,
    sessionDate: "2026-07-15",
    category: "mes",
    topic: "SQL",
    participantCount: 1,
    participants: ["FADIL"],
    attachment: { originalName: "a.pdf", url: "/x", mimeType: "application/pdf", size: 1 },
  },
  {
    id: 2,
    sessionDate: "2026-07-20",
    category: "it",
    topic: "Network",
    participantCount: 2,
    participants: ["IQBAL", "FADIL"],
    attachment: null,
  },
  {
    id: 3,
    sessionDate: "2026-06-01",
    category: "intelligent",
    topic: "AGV",
    participantCount: 3,
    participants: ["JOSE", "RUHUT", "AULIA"],
    attachment: { originalName: "b.pdf", url: "/y", mimeType: "application/pdf", size: 1 },
  },
];

describe("computeTrainingOverviewMetrics", () => {
  it("filters by date range and computes KPIs", () => {
    const metrics = computeTrainingOverviewMetrics({
      sessions: sample,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });

    expect(metrics.totalSessions).toBe(2);
    expect(metrics.totalParticipants).toBe(3);
    expect(metrics.uniqueParticipants).toBe(2);
    expect(metrics.totalTopics).toBe(2);
    expect(metrics.byCategory.find((c) => c.category === "mes")?.topics).toBe(1);
    expect(metrics.byCategory.find((c) => c.category === "mes")?.sessions).toBe(1);
    expect(metrics.topParticipants[0]).toEqual({ name: "FADIL", sessions: 2 });
  });

  it("builds monthly trend when range spans multiple months", () => {
    const metrics = computeTrainingOverviewMetrics({
      sessions: sample,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(metrics.totalSessions).toBe(3);
    expect(metrics.trendGranularity).toBe("month");
    expect(metrics.monthlyTrend).toEqual([
      {
        period: "2026-06",
        label: "Jun",
        sessions: 1,
        participants: 3,
      },
      {
        period: "2026-07",
        label: "Jul",
        sessions: 2,
        participants: 3,
      },
    ]);
  });

  it("builds daily trend when range is within one month", () => {
    const metrics = computeTrainingOverviewMetrics({
      sessions: sample,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });

    expect(metrics.trendGranularity).toBe("day");
    expect(metrics.monthlyTrend).toEqual([
      {
        period: "2026-07-15",
        label: "15",
        sessions: 1,
        participants: 1,
      },
      {
        period: "2026-07-20",
        label: "20",
        sessions: 1,
        participants: 2,
      },
    ]);
  });
});
