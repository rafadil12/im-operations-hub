import { dateInTimeZone, loadAttendanceRoster } from "@/lib/attendanceWeCom";
import { renderAttendanceRosterImage } from "@/lib/attendanceWeComImage";
import { sendAttendanceWeComImage } from "@/lib/attendanceWeComNotification";

declare global {
  var __attendanceWeComSchedulerStarted: boolean | undefined;
  var __attendanceWeComLastSentDate: string | undefined;
}

const CHECK_INTERVAL_MS = 30_000;

type AttendanceClock = {
  date: string;
  hour: number;
  minute: number;
};

export function attendanceClock(
  now = new Date(),
  timeZone = process.env.ATTENDANCE_TIME_ZONE || "Asia/Jakarta"
): AttendanceClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${value.year}-${value.month}-${value.day}`,
    hour: Number(value.hour),
    minute: Number(value.minute),
  };
}

function notificationHour() {
  const configured = Number(process.env.ATTENDANCE_WECOM_HOUR ?? "8");
  return Number.isInteger(configured) && configured >= 0 && configured <= 23 ? configured : 8;
}

export function shouldSendAttendanceWeCom(clock: AttendanceClock, lastSentDate?: string) {
  return clock.hour === notificationHour() && clock.minute === 20 && lastSentDate !== clock.date;
}

function scheduleNextCheck(task: () => void) {
  const timer = setTimeout(task, CHECK_INTERVAL_MS);
  timer.unref?.();
}

async function checkAndScheduleNext() {
  try {
    const clock = attendanceClock();
    if (shouldSendAttendanceWeCom(clock, globalThis.__attendanceWeComLastSentDate)) {
      const roster = await loadAttendanceRoster(dateInTimeZone());
      const image = await renderAttendanceRosterImage(roster);
      await sendAttendanceWeComImage(image);
      globalThis.__attendanceWeComLastSentDate = clock.date;
      console.info("Automatic attendance WeCom notification sent", {
        date: clock.date,
        working: roster.working.length,
        off: roster.off.length,
        leave: roster.leave.length,
      });
    }
  } catch (error) {
    console.error("Automatic attendance WeCom notification failed", error);
  } finally {
    scheduleNextCheck(() => void checkAndScheduleNext());
  }
}

export function startAttendanceWeComScheduler() {
  if (process.env.ATTENDANCE_WECOM_AUTO_SEND === "0") return;
  if (!process.env.WECOM_ATTENDANCE_WEBHOOK_URL) {
    console.warn(
      "Attendance WeCom scheduler is disabled because WECOM_ATTENDANCE_WEBHOOK_URL is missing."
    );
    return;
  }
  if (globalThis.__attendanceWeComSchedulerStarted) return;
  globalThis.__attendanceWeComSchedulerStarted = true;

  const timer = setTimeout(() => void checkAndScheduleNext(), 1_000);
  timer.unref?.();
}
