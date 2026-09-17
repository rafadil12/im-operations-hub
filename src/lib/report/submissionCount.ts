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

export function countUniqueWeekAreaStatuses(submissions: SubmissionCountInput[]): {
  submittedCount: number;
  draftCount: number;
} {
  let submittedCount = 0;
  let draftCount = 0;
  for (const status of uniqueSubmissionStatusByWeekArea(submissions).values()) {
    if (status === "submitted") submittedCount += 1;
    else draftCount += 1;
  }
  return { submittedCount, draftCount };
}
