import { ImageResponse } from "next/og";

import { loadAttendanceFont } from "@/lib/attendanceWeComImage";

export type AttendanceLeaveCardData = {
  event: "submitted" | "approved";
  employeeNo: string;
  employeeNameEn: string | null;
  employeeNameCn: string | null;
  requestType: string;
  requestDate: string;
  startTime: string | null;
  endTime: string | null;
  noAttendanceType: string | null;
  reason: string | null;
  approvedBy: string | null;
};

const requestLabels: Record<string, { en: string; cn: string }> = {
  AL: { en: "Annual Leave", cn: "年假" },
  MC: { en: "Medical Leave", cn: "病假" },
  UPL: { en: "Unpaid Leave", cn: "无薪假" },
  OT: { en: "Overtime", cn: "加班" },
  ALPA: { en: "Absent Without Permission", cn: "无故缺勤" },
  NO_ATTENDANCE: { en: "No Attendance", cn: "未打卡" },
  LATE: { en: "Late Arrival", cn: "迟到" },
  LATE_PERMISSION: { en: "Late Arrival", cn: "迟到" },
};

const noAttendanceLabels: Record<string, string> = {
  NO_CHECK_IN: "No check-in / 未签到",
  NO_CHECK_OUT: "No check-out / 未签退",
  NO_CHECK_IN_OUT: "No check-in or check-out / 未签到及签退",
};

const requestThemes: Record<string, { color: string; pale: string; gradient: string }> = {
  AL: { color: "#08734f", pale: "#a4f2c9", gradient: "linear-gradient(100deg, #27e88d 0%, #00bd9d 100%)" },
  MC: { color: "#a91f42", pale: "#ffbdcc", gradient: "linear-gradient(100deg, #ff829b 0%, #f44d83 100%)" },
  UPL: { color: "#854000", pale: "#ffd778", gradient: "linear-gradient(100deg, #ffd43b 0%, #ff8b24 100%)" },
  OT: { color: "#104e91", pale: "#a9dbff", gradient: "linear-gradient(100deg, #37d5ff 0%, #4985ff 100%)" },
  ALPA: { color: "#9f1d24", pale: "#ffb6a8", gradient: "linear-gradient(100deg, #ff8a62 0%, #f34f5e 100%)" },
  NO_ATTENDANCE: { color: "#4f2a91", pale: "#d1b5ff", gradient: "linear-gradient(100deg, #ba88ff 0%, #795cff 100%)" },
  LATE: { color: "#854000", pale: "#ffd778", gradient: "linear-gradient(100deg, #ffe45e 0%, #ff972e 100%)" },
  LATE_PERMISSION: { color: "#854000", pale: "#ffd778", gradient: "linear-gradient(100deg, #ffe45e 0%, #ff972e 100%)" },
};

export async function renderAttendanceLeaveCard(data: AttendanceLeaveCardData): Promise<Buffer> {
  const fonts = await loadAttendanceFont();
  const isApproved = data.event === "approved";
  const theme = requestThemes[data.requestType] ?? {
    color: "#1769aa",
    pale: "#eaf4ff",
    gradient: "linear-gradient(100deg, #00a9e8 0%, #5277e8 100%)",
  };
  const title = isApproved
    ? "Request Approved / 申请已批准"
    : "New Leave / Permission / 新的请假申请";
  const requestLabel = requestLabels[data.requestType] ?? {
    en: data.requestType,
    cn: data.requestType,
  };
  const employeeName = [data.employeeNameCn?.trim(), data.employeeNameEn?.trim()]
    .filter(Boolean)
    .join(" / ");
  const time =
    data.startTime && data.endTime
      ? `${data.startTime.slice(0, 5)}–${data.endTime.slice(0, 5)}`
      : noAttendanceLabels[data.noAttendanceType ?? ""] ?? "-";
  const [year, month, day] = String(data.requestDate).slice(0, 10).split("-");
  const monthLabel =
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][
      Number(month) - 1
    ] ?? "DATE";
  const response = new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 12,
        background: "linear-gradient(140deg, #bceaff 0%, #d4d8ff 55%, #f0cbff 100%)",
        fontFamily: fonts.regular ? "Attendance Sans" : "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          border: "1px solid #ffffff",
          borderRadius: 18,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 8px 24px #245b8a30",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "relative",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 168,
            padding: "17px 16px",
            color: "#ffffff",
            background: theme.gradient,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "absolute",
              right: -34,
              top: 64,
              width: 118,
              height: 118,
              borderRadius: 59,
              background: "#ffffff18",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
            <span
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "5px 8px",
                border: "1px solid #ffffff80",
                borderRadius: 12,
                background: "#ffffff24",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {isApproved ? "APPROVED / 已批准" : "PENDING / 待审批"}
            </span>
            <span style={{ display: "flex", marginTop: 15, fontSize: 12, fontWeight: 700 }}>
              REQUEST TYPE / 申请类型
            </span>
            <span style={{ display: "flex", marginTop: 2, fontSize: 36, lineHeight: 1, fontWeight: 700 }}>
              {data.requestType === "NO_ATTENDANCE" ? "NO SHOW" : data.requestType}
            </span>
            <span style={{ display: "flex", flexDirection: "column", marginTop: 5, fontSize: 13, lineHeight: 1.2, fontWeight: 700 }}>
              {requestLabel.en}
              <span style={{ display: "flex", marginTop: 3, fontSize: 14 }}>{requestLabel.cn}</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", position: "relative" }}>
            <span style={{ display: "flex", fontSize: 44, lineHeight: 1, fontWeight: 700 }}>{day}</span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 4, fontSize: 12, fontWeight: 700 }}>
              {monthLabel}
              <span style={{ display: "flex", marginTop: 2, fontSize: 10, opacity: 0.85 }}>{year}</span>
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            padding: "17px 19px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", color: "#304e67", fontSize: 13, fontWeight: 700 }}>
              {title}
            </span>
            <span style={{ display: "flex", color: theme.color, fontSize: 12, fontWeight: 700 }}>
              {isApproved ? "✓ APPROVED" : "● FOR REVIEW"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 9 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              marginRight: 10,
              borderRadius: 19,
              color: theme.color,
              background: theme.pale,
              fontSize: 19,
              fontWeight: 700,
            }}
          >
            {employeeName.slice(0, 1) || "员"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", color: "#102f49", fontSize: 18, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {employeeName || data.employeeNo}
            </span>
            <span style={{ display: "flex", marginTop: 3, color: "#405c73", fontSize: 11, fontWeight: 600 }}>
              Employee No. / 员工编号: {data.employeeNo}
            </span>
          </div>
          </div>

        <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              minHeight: 43,
              padding: "0 10px",
              borderRadius: 11,
              background: "#f2f7fc",
            }}
          >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 27, height: 27, marginRight: 8, borderRadius: 14, color: theme.color, background: theme.pale, fontSize: 13, fontWeight: 700 }}>
              D
            </span>
            <span style={{ display: "flex", flexDirection: "column", color: "#102f49", fontSize: 13, fontWeight: 700 }}>
              {String(data.requestDate).slice(0, 10)}
              <span style={{ display: "flex", marginTop: 3, color: "#405c73", fontSize: 10, fontWeight: 600 }}>DATE / 日期</span>
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              minHeight: 43,
              padding: "0 10px",
              borderRadius: 11,
              background: "#f2f7fc",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 25, height: 25, marginRight: 8, borderRadius: 13, color: theme.color, background: theme.pale, fontSize: 12, fontWeight: 700 }}>
              T
            </span>
            <span style={{ display: "flex", flexDirection: "column", color: "#102f49", fontSize: 13, fontWeight: 700 }}>
              {time}
              <span style={{ display: "flex", marginTop: 3, color: "#405c73", fontSize: 10, fontWeight: 600 }}>TIME / 时间</span>
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            minHeight: 37,
            marginTop: 9,
            padding: "6px 10px",
            borderLeft: `3px solid ${theme.color}`,
            borderRadius: 9,
            color: "#526b82",
            background: theme.pale,
            fontSize: 12,
          }}
        >
          <span style={{ display: "flex", flexDirection: "column", marginRight: 8, color: theme.color, fontWeight: 700, whiteSpace: "nowrap" }}>
            REASON
            <span style={{ display: "flex", marginTop: 2, fontSize: 10 }}>原因</span>
          </span>
          <span style={{ display: "flex", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{data.reason || "-"}</span>
        </div>

        {isApproved && data.approvedBy ? (
          <div style={{ display: "flex", alignItems: "center", marginTop: 7, color: "#087a5f", fontSize: 10, fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, marginRight: 6, borderRadius: 8, color: "#ffffff", background: "#00a875", fontSize: 10 }}>✓</span>
            Approved by / 批准人: {data.approvedBy}
          </div>
        ) : null}
      </div>
      </div>
    </div>,
    {
      width: 640,
      height: 300,
      ...(fonts.regular
        ? {
            fonts: [
              {
                name: "Attendance Sans",
                data: fonts.regular,
                weight: 400 as const,
                style: "normal" as const,
              },
              {
                name: "Attendance Sans",
                data: fonts.bold ?? fonts.regular,
                weight: 700 as const,
                style: "normal" as const,
              },
            ],
          }
        : {}),
    }
  );

  return Buffer.from(await response.arrayBuffer());
}
