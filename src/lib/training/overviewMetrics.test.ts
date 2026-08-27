import { describe, expect, it } from "vitest";
import { computeTrainingOverviewMetrics } from "./overviewMetrics";
import type { TrainingDivision, TrainingSession } from "./types";

const divisions: TrainingDivision[] = [
  { id: 2, nameEn: "MES", nameCn: "MES" },
  { id: 1, nameEn: "Intelligent Logistics", nameCn: "智能物流" },
  { id: 3, nameEn: "IT", nameCn: "IT" },
];

const sample: TrainingSession[] = [
  {
    id: 1,
    sessionDate: "2026-07-15",
    divisionId: 2,
    divisionNameEn: "MES",
    divisionNameCn: "MES",
    topicEn: "SQL",
    topicCn: "SQL",
    participantCount: 1,
    participants: [{ nameEn: "FADIL", nameCn: "FADIL" }],
    attachment: { originalName: "a.pdf", url: "/x", mimeType: "application/pdf", size: 1 },
  },
  {
    id: 2,
    sessionDate: "2026-07-20",
    divisionId: 3,
    divisionNameEn: "IT",
    divisionNameCn: "IT",
    topicEn: "Network",
    topicCn: "网络",
    participantCount: 2,
    participants: [
      { nameEn: "IQBAL", nameCn: "IQBAL" },
      { nameEn: "FADIL", nameCn: "FADIL" },
    ],
    attachment: null,
  },
  {
    id: 3,
    sessionDate: "2026-06-01",
    divisionId: 1,
    divisionNameEn: "Intelligent Logistics",
    divisionNameCn: "智能物流",
    topicEn: "AGV",
    topicCn: "AGV",
    participantCount: 3,
    participants: [
      { nameEn: "JOSE", nameCn: "JOSE" },
      { nameEn: "RUHUT", nameCn: "RUHUT" },
      { nameEn: "AULIA", nameCn: "AULIA" },
    ],
    attachment: { originalName: "b.pdf", url: "/y", mimeType: "application/pdf", size: 1 },
  },
];

describe("computeTrainingOverviewMetrics", () => {
  it("filters by date range and computes KPIs", () => {
    const metrics = computeTrainingOverviewMetrics({
      sessions: sample,
      divisions,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });

    expect(metrics.totalSessions).toBe(2);
    expect(metrics.totalParticipants).toBe(3);
    expect(metrics.uniqueParticipants).toBe(2);
    expect(metrics.totalTopics).toBe(2);
    expect(metrics.byDivision.find((c) => c.nameEn === "MES")?.topics).toBe(1);
    expect(metrics.byDivision.find((c) => c.nameEn === "MES")?.sessions).toBe(1);
    expect(metrics.topParticipants[0]).toEqual({
      nameEn: "FADIL",
      nameCn: "FADIL",
      sessions: 2,
    });
  });

  it("builds monthly trend when range spans multiple months", () => {
    const metrics = computeTrainingOverviewMetrics({
      sessions: sample,
      divisions,
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
      divisions,
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
