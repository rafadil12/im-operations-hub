import type {
  TrainingOverviewMetrics,
  TrainingSession,
  TrainingTrendRow,
} from "./types";
import { TRAINING_CATEGORIES } from "./types";

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

export function computeTrainingOverviewMetrics(input: {
  sessions: TrainingSession[];
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
    for (const name of session.participants) {
      unique.add(name.trim().toUpperCase());
    }
  }

  const topics = new Set<string>();
  for (const session of periodSessions) {
    const topic = session.topic.trim();
    if (topic) topics.add(topic.toUpperCase());
  }
  const totalTopics = topics.size;

  const sessionsWithAttachment = periodSessions.filter((s) => Boolean(s.attachment)).length;
  const attachmentRate =
    totalSessions > 0 ? Math.round((sessionsWithAttachment / totalSessions) * 100) : 0;

  const byCategory = TRAINING_CATEGORIES.map((category) => {
    const rows = periodSessions.filter((s) => s.category === category);
    const topicSet = new Set<string>();
    for (const session of rows) {
      const topic = session.topic.trim();
      if (topic) topicSet.add(topic.toUpperCase());
    }
    return {
      category,
      sessions: rows.length,
      participants: rows.reduce((sum, s) => sum + s.participantCount, 0),
      topics: topicSet.size,
    };
  });

  const sameMonth = monthKey(startDate) === monthKey(endDate);
  const trendGranularity = sameMonth ? "day" : "month";
  const monthlyTrend = buildTrendRows(periodSessions, trendGranularity);

  const personMap = new Map<string, number>();
  for (const session of periodSessions) {
    for (const name of session.participants) {
      const key = name.trim().toUpperCase();
      if (!key) continue;
      personMap.set(key, (personMap.get(key) ?? 0) + 1);
    }
  }

  const topParticipants = [...personMap.entries()]
    .map(([name, sessionsCount]) => ({ name, sessions: sessionsCount }))
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))
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
    byCategory,
    monthlyTrend,
    trendGranularity,
    topParticipants,
    recentSessions,
  };
}
