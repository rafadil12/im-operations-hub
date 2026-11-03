import { syncDailyAttendance } from "./syncDailyAttendance";
import { query } from "@/lib/db";

declare global {
  var __dailyAttendanceSchedulerStarted: boolean | undefined;
}

const RETRY_DELAY_MS = 60_000;

type MissingRow = { missing: number };

function dateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function needsSync(now: Date) {
  const rows = await query<MissingRow[]>(
    `SELECT EXISTS(
       SELECT 1 FROM users u
       LEFT JOIN attendance_daily a
         ON a.employee_no = u.employee_no AND a.attendance_date = ?
       WHERE u.employee_no IS NOT NULL AND u.employee_no <> ''
         AND u.employee_no <> 'SUPERADMIN' AND a.id IS NULL
     ) AS missing`,
    [dateKey(now)],
  );
  return Number(rows[0]?.missing ?? 1) === 1;
}

function millisecondsUntilNextDay(now = new Date()) {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 2, 0);
  return Math.max(1_000, next.getTime() - now.getTime());
}

function schedule(delay: number, task: () => void) {
  const timer = setTimeout(task, delay);
  timer.unref?.();
}

async function runAndScheduleNext() {
  const now = new Date();
  try {
    if (await needsSync(now)) {
      const summary = await syncDailyAttendance(now.getFullYear(), now.getMonth() + 1, now);
      console.info("Automatic daily attendance sync completed", summary);
    }
    schedule(millisecondsUntilNextDay(), () => void runAndScheduleNext());
  } catch (error) {
    console.error("Automatic daily attendance sync failed; retrying in one minute", error);
    schedule(RETRY_DELAY_MS, () => void runAndScheduleNext());
  }
}

export function startDailyAttendanceScheduler() {
  if (process.env.ATTENDANCE_AUTO_SYNC === "0") return;
  if (globalThis.__dailyAttendanceSchedulerStarted) return;
  globalThis.__dailyAttendanceSchedulerStarted = true;
  schedule(1_000, () => void runAndScheduleNext());
}
