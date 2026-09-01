import type {
  TrainingDivision,
  TrainingOverviewMetrics,
  TrainingSession,
  TrainingTrendRow,
} from "./types";

function monthKey(date: string): string {
  return date.slice(0, 7);
}

const MONTH_LABELS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatMonthLabel(period: string): string {
  const month = Number(period.slice(5, 7));
  if (!Number.isInteger(month) || month < 1 || month > 12) return period.slice(5);
  return MONTH_LABELS_EN[month - 1];
}

function formatDayLabel(period: string): string {
  const day = Number(period.slice(8, 10));
  return Number.isInteger(day) ? String(day).padStart(2, "0") : period.slice(8);
}

function buildTrendRows(
  rows: TrainingSession[],
  granularity: "day" | "month"
): TrainingTrendRow[] {
  const trendMap = new Map<string, { sessions: number; participants: number }>();

  for (const session of rows) {
    const key = granularity === "day" ? session.sessionDate : monthKey(session.sessionDate);
    const current = trendMap.get(key) ?? { sessions: 0, participants: 0 };
    current.sessions += 1;
    current.participants += session.participantCount;
    trendMap.set(key, current);
  }

  return [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({
      period,
      label: granularity === "day" ? formatDayLabel(period) : formatMonthLabel(period),
      sessions: value.sessions,
      participants: value.participants,
    }));
}

function inRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function topicKey(topicEn: string, topicCn: string): string {
  return `${topicEn.trim()}|${topicCn.trim()}`.toUpperCase();
}

export function computeTrainingOverviewMetrics(input: {
  sessions: TrainingSession[];
  divisions: TrainingDivision[];
  startDate: string;
  endDate: string;
}): TrainingOverviewMetrics {
  const startDate = input.startDate.slice(0, 10);
  const endDate = input.endDate.slice(0, 10);
  const periodSessions = input.sessions.filter((s) =>
    inRange(s.sessionDate.slice(0, 10), startDate, endDate)
  );

  const totalSessions = periodSessions.length;
  const totalParticipants = periodSessions.reduce((sum, s) => sum + s.participantCount, 0);

  const unique = new Set<string>();
  for (const session of periodSessions) {
    for (const person of session.participants) {
      unique.add(person.nameEn.trim().toUpperCase());
    }
  }

  const topics = new Set<string>();
  for (const session of periodSessions) {
    const key = topicKey(session.topicEn, session.topicCn);
    if (key !== "|") topics.add(key);
  }
  const totalTopics = topics.size;

  const sessionsWithAttachment = periodSessions.filter((s) => Boolean(s.attachment)).length;
  const attachmentRate =
    totalSessions > 0 ? Math.round((sessionsWithAttachment / totalSessions) * 100) : 0;

  const byDivision = input.divisions.map((division) => {
    const rows = periodSessions.filter((s) => s.divisionId === division.id);
    const topicSet = new Set<string>();
    for (const session of rows) {
      const key = topicKey(session.topicEn, session.topicCn);
      if (key !== "|") topicSet.add(key);
    }
    return {
      divisionId: division.id,
      nameEn: division.nameEn,
      nameCn: division.nameCn,
      sessions: rows.length,
      participants: rows.reduce((sum, s) => sum + s.participantCount, 0),
      topics: topicSet.size,
    };
  });

  const sameMonth = monthKey(startDate) === monthKey(endDate);
  const trendGranularity = sameMonth ? "day" : "month";
  const monthlyTrend = buildTrendRows(periodSessions, trendGranularity);

  const personMap = new Map<string, { nameEn: string; nameCn: string; sessions: number }>();
  for (const session of periodSessions) {
    for (const person of session.participants) {
      const key = person.nameEn.trim().toUpperCase();
      if (!key) continue;
      const nameCn = person.nameCn?.trim() || person.nameEn;
      const current = personMap.get(key);
      if (current) {
        current.sessions += 1;
        // Prefer a real CN label over an EN-only snapshot copy.
        if (nameCn && nameCn !== person.nameEn) {
          current.nameCn = nameCn;
        } else if (!current.nameCn) {
          current.nameCn = nameCn;
        }
      } else {
        personMap.set(key, {
          nameEn: person.nameEn,
          nameCn,
          sessions: 1,
        });
      }
    }
  }

  const topParticipants = [...personMap.values()]
    .sort((a, b) => b.sessions - a.sessions || a.nameEn.localeCompare(b.nameEn))
    .slice(0, 10);

  const recentSessions = [...periodSessions]
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.id - a.id)
    .slice(0, 8);

  return {
    startDate,
    endDate,
    totalSessions,
    totalParticipants,
    uniqueParticipants: unique.size,
    totalTopics,
    attachmentRate,
    sessionsWithAttachment,
    byDivision,
    monthlyTrend,
    trendGranularity,
    topParticipants,
    recentSessions,
  };
}
