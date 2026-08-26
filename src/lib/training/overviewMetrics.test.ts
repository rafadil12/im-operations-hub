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
  it("filters by month and computes KPIs", () => {
    const metrics = computeTrainingOverviewMetrics({
      sessions: sample,
      year: 2026,
      month: 7,
    });

    expect(metrics.totalSessions).toBe(2);
    expect(metrics.totalParticipants).toBe(3);
    expect(metrics.uniqueParticipants).toBe(2);
    expect(metrics.attachmentRate).toBe(50);
    expect(metrics.byCategory.find((c) => c.category === "mes")?.sessions).toBe(1);
    expect(metrics.topParticipants[0]).toEqual({ name: "FADIL", sessions: 2 });
  });

  it("supports year-wide view when month is null", () => {
    const metrics = computeTrainingOverviewMetrics({
      sessions: sample,
      year: 2026,
      month: null,
    });
    expect(metrics.totalSessions).toBe(3);
    expect(metrics.monthlyTrend.find((m) => m.month === "2026-07")?.sessions).toBe(2);
  });
});
