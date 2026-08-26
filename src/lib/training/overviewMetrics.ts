import type {
  TrainingCategory,
  TrainingOverviewMetrics,
  TrainingSession,
} from "./types";
import { TRAINING_CATEGORIES } from "./types";

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function computeTrainingOverviewMetrics(input: {
  sessions: TrainingSession[];
  year: number;
  month: number | null;
}): TrainingOverviewMetrics {
  const { sessions, year, month } = input;

  const inYear = sessions.filter((s) => s.sessionDate.startsWith(String(year)));
  const periodSessions =
    month == null
      ? inYear
      : inYear.filter((s) => Number(s.sessionDate.slice(5, 7)) === month);

  const totalSessions = periodSessions.length;
  const totalParticipants = periodSessions.reduce((sum, s) => sum + s.participantCount, 0);

  const unique = new Set<string>();
  for (const session of periodSessions) {
    for (const name of session.participants) {
      unique.add(name.trim().toUpperCase());
    }
  }

  const sessionsWithAttachment = periodSessions.filter((s) => Boolean(s.attachment)).length;
  const attachmentRate =
    totalSessions > 0 ? Math.round((sessionsWithAttachment / totalSessions) * 100) : 0;

  const byCategory = TRAINING_CATEGORIES.map((category) => {
    const rows = periodSessions.filter((s) => s.category === category);
    return {
      category,
      sessions: rows.length,
      participants: rows.reduce((sum, s) => sum + s.participantCount, 0),
    };
  });

  const trendMap = new Map<string, { sessions: number; participants: number }>();
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    trendMap.set(key, { sessions: 0, participants: 0 });
  }
  for (const session of inYear) {
    const key = monthKey(session.sessionDate);
    const current = trendMap.get(key);
    if (!current) continue;
    current.sessions += 1;
    current.participants += session.participantCount;
  }

  const monthlyTrend = [...trendMap.entries()].map(([monthLabel, value]) => ({
    month: monthLabel,
    sessions: value.sessions,
    participants: value.participants,
  }));

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

  const attachmentByCategory = TRAINING_CATEGORIES.map((category: TrainingCategory) => {
    const rows = periodSessions.filter((s) => s.category === category);
    const withAttachment = rows.filter((s) => Boolean(s.attachment)).length;
    return {
      category,
      withAttachment,
      withoutAttachment: rows.length - withAttachment,
    };
  });

  const recentSessions = [...periodSessions]
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.id - a.id)
    .slice(0, 8);

  return {
    year,
    month: month ?? 0,
    totalSessions,
    totalParticipants,
    uniqueParticipants: unique.size,
    attachmentRate,
    sessionsWithAttachment,
    byCategory,
    monthlyTrend,
    topParticipants,
    attachmentByCategory,
    recentSessions,
  };
}
