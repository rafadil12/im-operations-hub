import { MONTHLY_ACTIVITIES, WEEKLY_ACTIVITIES } from "./activities";
import { getPreviewKind, getReadableFileKind } from "./files";
import type {
  ActivityType,
  MonthlyEvidenceItem,
  MonthlyRecord,
  SafetyLanguage,
  SubmissionDetail,
  SubmissionStatus,
  WeekEvidenceItem,
  WeeklyRecord,
} from "./types";

export function getCompletedCount(record: WeeklyRecord): number {
  return WEEKLY_ACTIVITIES.filter((activity) => {
    const status = record[activity.recordKey!] as SubmissionStatus;

    return status === "completed" || status === "not_applicable";
  }).length;
}

export function getWeekFileCount(record: WeeklyRecord): number {
  return WEEKLY_ACTIVITIES.reduce((total, activity) => {
    const detail = record[activity.dataKey!] as SubmissionDetail | undefined;

    return total + (detail?.filePreviews?.length ?? detail?.fileNames?.length ?? 0);
  }, 0);
}

export function getActivityFileTypes(
  detail: SubmissionDetail | undefined,
  language: SafetyLanguage = "en"
): string {
  if (!detail) return "—";

  const files = detail.filePreviews ?? [];

  const kinds = Array.from(
    new Set(
      files.map((file) => getReadableFileKind(getPreviewKind(file.name, file.type), language))
    )
  );
  return kinds.join(" • ");
}

export function getWeekEvidence(record: WeeklyRecord): WeekEvidenceItem[] {
  const result: WeekEvidenceItem[] = [];

  for (const activity of WEEKLY_ACTIVITIES) {
    const detail = record[activity.dataKey!] as SubmissionDetail | undefined;

    if (!detail?.filePreviews?.length) {
      continue;
    }

    for (const file of detail.filePreviews) {
      result.push({
        activity,
        detail,
        file,
      });
    }
  }

  return result;
}

export function getMonthlyEvidence(record: MonthlyRecord): MonthlyEvidenceItem[] {
  const result: MonthlyEvidenceItem[] = [];

  // Monthly activities biasa hanya punya 1 submission per bulan.
  const dataByActivity: Record<ActivityType, SubmissionDetail | undefined> = {
    "fire-drill": record.fireDrillData,
    "monthly-meeting": record.monthlyMeetingData,
    "hazard-case": record.hazardCaseData,
    "safety-ppt": record.safetyPptData,
    "reward-finding": undefined,
    training: undefined,
    "routine-meeting": undefined,
    "hse-tuesday": undefined,
    ert: undefined,
    "five-s": undefined,
    "potential-hazard": undefined,
  };

  for (const activity of MONTHLY_ACTIVITIES) {
    if (activity.id === "reward-finding") continue;

    const detail = dataByActivity[activity.id];
    if (!detail?.filePreviews?.length) continue;

    for (const file of detail.filePreviews) {
      const kind = getPreviewKind(file.name, file.type);
      if (kind !== "image" && kind !== "ppt") continue;
      result.push({
        activity,
        detail,
        file,
        sourceLabel: activity.shortTitle,
      });
    }
  }

  // Reward Finding adalah pengecualian: maksimal 2 submission.
  // PENTING: semua submission dibaca, bukan hanya rewardFindingData/latestReward.
  const rewardActivity = MONTHLY_ACTIVITIES.find((activity) => activity.id === "reward-finding");

  if (rewardActivity) {
    const submissions = [...record.rewardSubmissions].sort((a, b) => a.id - b.id);

    submissions.forEach((submission, submissionIndex) => {
      const detail = submission.detail;
      if (!detail?.filePreviews?.length) return;

      const submissionNumber = submissionIndex + 1;
      const sourceLabel = `Reward Finding #${submissionNumber}`;

      for (const file of detail.filePreviews) {
        const kind = getPreviewKind(file.name, file.type);
        if (kind !== "image" && kind !== "ppt") continue;

        result.push({
          activity: rewardActivity,
          detail,
          file,
          submissionId: submission.id,
          submissionNumber,
          sourceLabel,
        });
      }
    });
  }

  return result;
}

export function getMonthlyEvidenceCount(record: MonthlyRecord): number {
  return getMonthlyEvidence(record).length;
}

/**
 * The card only has 6 preview slots. Keep the full evidence array untouched,
 * but make sure Reward Finding #1 and #2 are not hidden behind other files.
 */
export function getMonthlyEvidencePreviewItems(
  evidence: MonthlyEvidenceItem[]
): MonthlyEvidenceItem[] {
  if (evidence.length <= 6) return evidence;

  const selected: MonthlyEvidenceItem[] = [];
  const used = new Set<MonthlyEvidenceItem>();

  // Guarantee at least one visible preview from each Reward Finding submission.
  const rewardSubmissionNumbers = [1, 2];
  for (const number of rewardSubmissionNumbers) {
    const item = evidence.find((entry) => entry.submissionNumber === number);

    if (item && !used.has(item)) {
      selected.push(item);
      used.add(item);
    }
  }

  // Fill the remaining preview slots in the normal Monthly evidence order.
  for (const item of evidence) {
    if (selected.length >= 6) break;
    if (used.has(item)) continue;
    selected.push(item);
    used.add(item);
  }

  return selected;
}

export function getWeekImageCount(record: WeeklyRecord): number {
  return getWeekEvidence(record).filter(
    ({ file }) => getPreviewKind(file.name, file.type) === "image"
  ).length;
}

export function getWeekVideoCount(record: WeeklyRecord): number {
  return getWeekEvidence(record).filter(
    ({ file }) => getPreviewKind(file.name, file.type) === "video"
  ).length;
}

export function getWeekDocumentCount(record: WeeklyRecord): number {
  return getWeekEvidence(record).filter(({ file }) => {
    const kind = getPreviewKind(file.name, file.type);

    return kind === "excel" || kind === "ppt" || kind === "pdf";
  }).length;
}

export function getWeekOtherCount(record: WeeklyRecord): number {
  return getWeekEvidence(record).filter(
    ({ file }) => getPreviewKind(file.name, file.type) === "other"
  ).length;
}

export function getLastSubmissionDate(record: WeeklyRecord): string {
  const dates = WEEKLY_ACTIVITIES.map((activity) => {
    const detail = record[activity.dataKey!] as SubmissionDetail | undefined;

    return detail?.date;
  }).filter((date): date is string => Boolean(date));

  return dates.length > 0 ? (dates.sort().at(-1) ?? "—") : "—";
}
