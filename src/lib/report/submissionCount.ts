export type SubmissionCountInput = {
  weekId: number;
  areaId: number;
  status: "draft" | "submitted";
};

function keyFor(weekId: number, areaId: number): string {
  return `${weekId}:${areaId}`;
}

/** One status per (weekId, areaId). Submitted wins if duplicates exist. */
export function uniqueSubmissionStatusByWeekArea(
  submissions: SubmissionCountInput[]
): Map<string, "draft" | "submitted"> {
  const map = new Map<string, "draft" | "submitted">();
  for (const submission of submissions) {
    const key = keyFor(submission.weekId, submission.areaId);
    const previous = map.get(key);
    if (previous === "submitted") continue;
    if (submission.status === "submitted") {
      map.set(key, "submitted");
      continue;
    }
    if (!previous) map.set(key, "draft");
  }
  return map;
}

export function submissionStatusForArea(
  submissions: SubmissionCountInput[],
  weekId: number,
  areaId: number
): "draft" | "submitted" | null {
  return uniqueSubmissionStatusByWeekArea(submissions).get(keyFor(weekId, areaId)) ?? null;
}

export function isWeekFullySubmitted(
  submissions: SubmissionCountInput[],
  weekId: number,
  areaIds: number[]
): boolean {
  if (!areaIds.length) return false;
  return areaIds.every(
    (areaId) => submissionStatusForArea(submissions, weekId, areaId) === "submitted"
  );
}

export function countFullySubmittedWeeks(
  weekIds: Array<number | null | undefined>,
  submissions: SubmissionCountInput[],
  areaIds: number[]
): number {
  let count = 0;
  for (const weekId of weekIds) {
    if (weekId == null) continue;
    if (isWeekFullySubmitted(submissions, weekId, areaIds)) count += 1;
  }
  return count;
}

export function buildWeekIdByNumber(
  weeks: { id: number; weekNumber: number }[] | undefined,
  rows: { week_id?: number | null; week_number?: number | null }[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of rows) {
    const weekNumber = Number(row.week_number);
    const weekId = Number(row.week_id);
    if (weekNumber && weekId) map.set(weekNumber, weekId);
  }
  for (const week of weeks ?? []) {
    if (week.weekNumber && week.id) map.set(week.weekNumber, week.id);
  }
  return map;
}

/** Area-level count for a single week (report-completion % / on-time). */
export function countWeekAreaSubmissions(
  submissions: SubmissionCountInput[],
  weekId: number | null,
  areaIds: number[]
): { submittedCount: number; draftCount: number; expectedCount: number } {
  const expectedCount = areaIds.length;
  if (!weekId || expectedCount === 0) {
    return { submittedCount: 0, draftCount: 0, expectedCount };
  }

  let submittedCount = 0;
  let draftCount = 0;
  for (const areaId of areaIds) {
    const status = submissionStatusForArea(submissions, weekId, areaId);
    if (status === "submitted") submittedCount += 1;
    else if (status === "draft") draftCount += 1;
  }

  return { submittedCount, draftCount, expectedCount };
}
