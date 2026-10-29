export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installConnectionIpCapture } = await import("./lib/connectionIp");
  installConnectionIpCapture();
  const { startDailyAttendanceScheduler } =
    await import("@/lib/organization/dailyAttendanceScheduler");
  startDailyAttendanceScheduler();
  const { startAttendanceWeComScheduler } =
    await import("@/lib/organization/attendanceWeComScheduler");
  startAttendanceWeComScheduler();
}
