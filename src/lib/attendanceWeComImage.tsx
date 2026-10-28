import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";

import type { AttendanceRoster, AttendanceRosterRow } from "@/lib/attendanceWeCom";

const palette = {
  navy: "#173f5f",
  navySoft: "#2a5878",
  blue: "#168cff",
  green: "#00b887",
  orange: "#ff9a24",
  red: "#f05269",
  purple: "#8957f5",
  border: "#d3e9fb",
  muted: "#526b82",
  canvas: "#eaf6ff",
};

const WINDOWS_FONT_DIR = "C:\\Windows\\Fonts\\";
const LINUX_FONT_DIRS = [
  "/usr/share/fonts/opentype/noto/",
  "/usr/share/fonts/truetype/noto/",
  "/usr/share/fonts/opentype/noto-cjk/",
  "/usr/share/fonts/truetype/noto-cjk/",
];

export type AttendanceFontSet = { regular: Buffer | null; bold: Buffer | null };

let attendanceFontPromise: Promise<AttendanceFontSet> | null = null;

/**
 * Satori only understands standalone TTF/OTF files. Windows (Microsoft YaHei)
 * and many Linux images (Noto Sans CJK) ship CJK fonts as TTC collections, so
 * pull the first face out into a standalone font before handing it to satori.
 */
function extractFirstTtcFace(data: Buffer): Buffer {
  if (data.toString("ascii", 0, 4) !== "ttcf") return data;

  const fontOffset = data.readUInt32BE(12);
  const numTables = data.readUInt16BE(fontOffset + 4);
  const headerLength = 12 + numTables * 16;
  const header = Buffer.alloc(headerLength);
  data.copy(header, 0, fontOffset, fontOffset + 12);

  const tables: Buffer[] = [];
  let tableOffset = headerLength;

  for (let index = 0; index < numTables; index += 1) {
    const recordOffset = fontOffset + 12 + index * 16;
    const tableLength = data.readUInt32BE(recordOffset + 12);
    const sourceOffset = data.readUInt32BE(recordOffset + 8);
    const paddedLength = Math.ceil(tableLength / 4) * 4;

    data.copy(header, 12 + index * 16, recordOffset, recordOffset + 12);
    header.writeUInt32BE(tableOffset, 12 + index * 16 + 8);

    const table = Buffer.alloc(paddedLength);
    data.copy(table, 0, sourceOffset, sourceOffset + tableLength);
    tables.push(table);
    tableOffset += paddedLength;
  }

  return Buffer.concat([header, ...tables]);
}

async function readFont(candidate: string) {
  const data = await readFile(candidate).catch(() => null);
  return data ? extractFirstTtcFace(data) : null;
}

async function readFirst(candidates: string[]) {
  for (const candidate of candidates) {
    const data = await readFont(candidate);
    if (data) return data;
  }
  return null;
}

export function loadAttendanceFont(): Promise<AttendanceFontSet> {
  attendanceFontPromise ??= (async () => {
    const regular =
      (await readFirst(
        [
          process.env.ATTENDANCE_FONT_PATH ?? "",
          `${WINDOWS_FONT_DIR}msyh.ttc`,
          `${WINDOWS_FONT_DIR}Deng.ttf`,
          `${WINDOWS_FONT_DIR}simhei.ttf`,
          ...LINUX_FONT_DIRS.flatMap((dir) => [
            `${dir}NotoSansCJK-Regular.ttc`,
            `${dir}NotoSansCJKsc-Regular.otf`,
            `${dir}NotoSansSC-Regular.ttf`,
          ]),
        ].filter(Boolean)
      )) ?? null;

    const bold =
      (await readFirst(
        [
          process.env.ATTENDANCE_FONT_BOLD_PATH ?? "",
          `${WINDOWS_FONT_DIR}msyhbd.ttc`,
          `${WINDOWS_FONT_DIR}Dengb.ttf`,
          ...LINUX_FONT_DIRS.flatMap((dir) => [
            `${dir}NotoSansCJK-Bold.ttc`,
            `${dir}NotoSansCJKsc-Bold.otf`,
            `${dir}NotoSansSC-Bold.ttf`,
          ]),
        ].filter(Boolean)
      )) ?? regular;

    return { regular, bold };
  })();
  return attendanceFontPromise;
}

function bilingual(primary: string | null, secondary: string | null, fallback: string) {
  const first = primary?.trim();
  const second = secondary?.trim();
  if (first && second && first.toLowerCase() !== second.toLowerCase())
    return `${first} / ${second}`;
  return first || second || fallback;
}

function employeeName(row: AttendanceRosterRow) {
  return bilingual(row.name_cn, row.name_en, row.employee_no);
}

function divisionName(row: AttendanceRosterRow) {
  const english = row.division_name_en?.trim() ?? "";
  const chinese = row.division_name_cn?.trim() ?? "";
  const normalized = `${english} ${chinese}`.toLowerCase();
  if (normalized.includes("intelligent logistics") || normalized.includes("智能物流"))
    return "智能物流";
  if (
    normalized.includes("information technology") ||
    normalized.includes("信息技术") ||
    normalized.includes("it department") ||
    normalized === "it"
  )
    return "IT";
  if (normalized.includes("mes")) return "MES";
  if (normalized.includes("assembly") || normalized.includes("装配")) return "装配";
  if (normalized.includes("production") || normalized.includes("生产")) return "生产部";
  if (normalized.includes("equipment") || normalized.includes("设备")) return "设备部";
  if (normalized.includes("engineering") || normalized.includes("工艺")) return "工艺部";
  if (normalized.includes("quality") || normalized.includes("品质")) return "品质部";
  return chinese || english || "-";
}

function departmentColors(row: AttendanceRosterRow) {
  const division = `${row.division_name_en ?? ""} ${row.division_name_cn ?? ""}`.toLowerCase();
  if (
    division.includes("intelligent") ||
    division.includes("智能物流") ||
    division.includes("production")
  )
    return { background: "#d5ebff", color: "#0a6fc4" };
  if (
    division.includes("information technology") ||
    division.includes("信息技术") ||
    /(^|\s)it($|\s)/.test(division) ||
    division.includes("equipment") ||
    division.includes("设备")
  )
    return { background: "#d3f6e7", color: "#087a5f" };
  if (division.includes("mes")) return { background: "#ffe4c4", color: "#a85a05" };
  if (division.includes("assembly") || division.includes("装配"))
    return { background: "#e5d9ff", color: "#6534b5" };
  if (division.includes("engineering") || division.includes("工艺"))
    return { background: "#e3e9ef", color: "#455b70" };
  return { background: "#e1d2ff", color: "#6534b5" };
}

function isIntelligentLogistics(row: AttendanceRosterRow) {
  const division = `${row.division_name_en ?? ""} ${row.division_name_cn ?? ""}`.toLowerCase();
  return (
    division.includes("intelligent logistics") ||
    division.includes("智能物流") ||
    division.includes("logistics")
  );
}

type IconName = "users" | "user" | "bed" | "alert" | "sun" | "moon" | "calendar";

function Icon({ name, color, size = 34 }: { name: IconName; color: string; size?: number }) {
  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth: 2.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {name === "users" && (
        <g fill={color}>
          <circle cx="9" cy="7.4" r="3.6" />
          <path d="M2.2 19.6c0-4.3 3-6.7 6.8-6.7s6.8 2.4 6.8 6.7H2.2Z" />
          <circle cx="17.4" cy="8.6" r="2.7" />
          <path d="M15.7 13.6c3.4-.4 6.1 1.7 6.1 5.3h-4.6c0-2.1-.5-3.9-1.5-5.3Z" />
        </g>
      )}
      {name === "user" && (
        <g fill={color}>
          <circle cx="12" cy="7.4" r="3.8" />
          <path d="M4.2 20.2c0-4.4 3.3-6.9 7.8-6.9s7.8 2.5 7.8 6.9H4.2Z" />
        </g>
      )}
      {name === "bed" && (
        <g>
          <path d="M3 5v14M3 15h18v4M7 15V9h5c2 0 3 1.2 3 3v3M4 12h3" {...stroke} />
        </g>
      )}
      {name === "alert" && (
        <g>
          <circle cx="12" cy="12" r="9" fill={color} stroke="none" />
          <path d="M12 7v6M12 17h.01" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
      {name === "sun" && (
        <g fill={color}>
          <circle cx="12" cy="12" r="4.2" />
          <path
            d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"
            stroke={color}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </g>
      )}
      {name === "moon" && (
        <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" fill={color} stroke="none" />
      )}
      {name === "calendar" && (
        <g>
          <rect x="4" y="5" width="16" height="15" rx="2" {...stroke} />
          <path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2" {...stroke} />
        </g>
      )}
    </svg>
  );
}

function SleepIcon({ color, size = 84 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <g fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8v16M4 20h24v5M9 20v-7h7c2.6 0 4 1.5 4 4v3M5 16h4" />
        <path d="M20.5 7.5h4l-4 5h4" strokeWidth="1.8" />
        <path d="M26 3.5h2.8l-2.8 3.6h2.8" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function HeaderPattern() {
  return (
    <svg
      width="760"
      height="180"
      viewBox="0 0 760 180"
      style={{ position: "absolute", right: -20, bottom: -32, opacity: 0.5 }}
    >
      <g fill="none" stroke="#8fd0ff" strokeWidth="1.2" opacity="0.33">
        <path d="M-40 190C120 90 330 55 780 90" />
        <path d="M-10 205C160 92 360 62 790 110" />
        <path d="M30 218C200 96 400 72 800 132" />
        <path d="M70 232C240 104 440 84 810 156" />
        <path d="M110 244C280 116 480 98 820 180" />
      </g>
      <g fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.08">
        <path d="M280 -20L720 190M330 -20L760 170M380 -20L790 145" />
      </g>
    </svg>
  );
}

function SummaryCard({
  label,
  value,
  color,
  icon,
  descriptionCn,
  descriptionEn,
}: {
  label: string | string[];
  value: number;
  color: string;
  icon: IconName;
  descriptionCn: string;
  descriptionEn: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        flex: 1,
        height: 182,
        padding: "22px 22px 20px",
        border: `2px solid ${palette.border}`,
        borderLeft: `7px solid ${color}`,
        borderRadius: 18,
        background: `linear-gradient(135deg, #ffffff 0%, ${color}10 100%)`,
        boxShadow: `0 5px 0 ${color}22`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: -65,
          bottom: -72,
          width: 300,
          height: 145,
          borderRadius: "50% 0 0 0",
          background: `${color}0d`,
          transform: "rotate(-8deg)",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 80,
          height: 80,
          marginTop: 7,
          marginRight: 18,
          borderRadius: 40,
          color,
          background: `${color}30`,
          border: `3px solid ${color}24`,
        }}
      >
        <Icon name={icon} color={color} size={42} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          height: 140,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: palette.navy,
            fontSize: 18,
            lineHeight: 1.15,
            fontWeight: 700,
          }}
        >
          {(Array.isArray(label) ? label : [label]).map((line) => (
            <span key={line} style={{ display: "flex" }}>
              {line}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 5,
            color,
            fontSize: 58,
            lineHeight: 1,
            fontWeight: 700,
            textShadow: `0 2px 0 ${color}20`,
          }}
        >
          {value}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              color: palette.muted,
              fontSize: 15,
              lineHeight: 1.2,
            }}
          >
            {descriptionCn}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 5,
              color: palette.muted,
              fontSize: 14,
              lineHeight: 1.2,
            }}
          >
            {descriptionEn}
          </div>
        </div>
      </div>
    </div>
  );
}

function RosterCard({
  title,
  rows,
  color,
  emptyText,
  icon,
  compact = false,
  emptyIcon = false,
}: {
  title: string;
  rows: AttendanceRosterRow[];
  color: string;
  emptyText: string;
  icon: IconName;
  compact?: boolean;
  emptyIcon?: boolean;
}) {
  const visible = rows;
  const dense = !compact && rows.length > 5;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: compact ? 218 : 452,
        border: `2px solid ${palette.border}`,
        borderRadius: 18,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 5px 18px #3676a51a",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: compact ? 62 : 76,
          padding: compact ? "0 18px" : "0 22px",
          borderBottom: `2px solid ${palette.border}`,
          background: `linear-gradient(90deg, ${color}12 0%, #ffffff 75%)`,
          color: palette.navy,
          fontSize: compact ? 21 : 21.5,
          fontWeight: 700,
        }}
      >
        <span style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              marginRight: 12,
              borderRadius: 22,
              background: `${color}20`,
            }}
          >
            <Icon name={icon} color={color} size={27} />
          </span>
          {title}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 46,
            height: 40,
            padding: "0 12px",
            borderRadius: 20,
            color,
            background: `${color}20`,
            fontSize: 21,
            fontWeight: 700,
          }}
        >
          {rows.length}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 44,
          padding: "0 18px",
          color: palette.muted,
          background: "#f0f8ff",
          fontSize: 14,
        }}
      >
        <span style={{ display: "flex", width: 34 }}>#</span>
        <span style={{ display: "flex", flex: 1 }}>员工 / Staff</span>
        <span
          style={{
            display: "flex",
            width: compact ? 120 : 132,
            justifyContent: "center",
            whiteSpace: "nowrap",
          }}
        >
          部门 / Department
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "0 18px" }}>
        {visible.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingTop: compact ? 18 : 68,
              height: compact ? 112 : 332,
              color: palette.muted,
              fontSize: 18,
              textAlign: "center",
            }}
          >
            {emptyIcon && (
              <span style={{ display: "flex", marginBottom: 18, opacity: 0.6 }}>
                <SleepIcon color="#7891b2" size={84} />
              </span>
            )}
            {emptyText}
          </div>
        ) : (
          visible.map((row, index) => (
            <div
              key={`${row.employee_no}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                height: dense ? 46 : 56,
                padding: "0 8px",
                margin: "0 -8px",
                background: index % 2 === 0 ? "#ffffff" : "#f5faff",
                borderBottom: index < visible.length - 1 ? "1px solid #e7eff5" : "none",
              }}
            >
              <span style={{ display: "flex", width: 30, color: palette.muted, fontSize: 15 }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  display: "flex",
                  width: 9,
                  height: 9,
                  marginRight: 11,
                  borderRadius: 5,
                  background: color,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    color: palette.navy,
                    flex: 1,
                    fontSize: dense ? 13 : compact ? 14.5 : 15,
                    lineHeight: 1.15,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {employeeName(row)}
                </div>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    width: compact ? 120 : 132,
                    marginLeft: 8,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 56,
                      height: 31,
                      padding: "0 16px",
                      borderRadius: 8,
                      color: departmentColors(row).color,
                      background: departmentColors(row).background,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {divisionName(row)}
                  </span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export async function renderAttendanceRosterImage(roster: AttendanceRoster): Promise<Buffer> {
  const fonts = await loadAttendanceFont();
  const dayShift = roster.working
    .filter(
      (row) => row.schedule_type === "D" && row.is_rolling === 1 && isIntelligentLogistics(row)
    )
    .slice(0, 2);
  const nightShift = roster.working
    .filter(
      (row) => row.schedule_type === "N" && row.is_rolling === 1 && isIntelligentLogistics(row)
    )
    .slice(0, 2);
  const shiftEmployeeNumbers = new Set([...dayShift, ...nightShift].map((row) => row.employee_no));
  const presentWithoutShift = roster.working.filter(
    (row) => !shiftEmployeeNumbers.has(row.employee_no)
  );

  const response = new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 20,
        background: "linear-gradient(145deg, #f5fbff 0%, #e9f5ff 52%, #f5efff 100%)",
        fontFamily: fonts.regular ? "Attendance Sans" : "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: 137,
          padding: "28px 20px 17px 34px",
          borderRadius: 14,
          color: "#ffffff",
          background: "linear-gradient(110deg, #00a9e8 0%, #2879f5 52%, #7955e8 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <HeaderPattern />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 31.5,
              lineHeight: 1.15,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ display: "flex", marginLeft: 7, marginRight: 9 }}>
              <Icon name="users" color="#e4f1ff" size={42} />
            </span>
            人员出勤与班次日报　|　Daily Staff Attendance &amp; Shift Summary
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              position: "absolute",
              right: 6,
              top: 4,
              padding: "18px 20px",
              border: "1px solid #ffffff2e",
              borderRadius: 14,
              background: "#ffffff24",
              fontSize: 20,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ display: "flex", marginRight: 12 }}>
              <Icon name="calendar" color="#ffffff" size={23} />
            </span>
            日期 / Date · {roster.date}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            marginLeft: 76,
            color: "#c9dff2",
            fontSize: 18,
            position: "relative",
          }}
        >
          每日人员出勤报表 · Daily Attendance Report　|　部门范围 / Scope: 全部部门 / All
          Departments
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 21 }}>
        <SummaryCard
          label="今日排班人数 / Scheduled"
          value={roster.scheduled.length}
          color={palette.blue}
          icon="users"
          descriptionCn="当天计划排班的人员数量"
          descriptionEn="Total staff scheduled for today"
        />
        <SummaryCard
          label="实际出勤 / Present"
          value={roster.working.length}
          color={palette.green}
          icon="user"
          descriptionCn="已到岗人员数量"
          descriptionEn="Number of staff present today"
        />
        <SummaryCard
          label="休息 / Off"
          value={roster.off.length}
          color={palette.orange}
          icon="bed"
          descriptionCn="休息人员数量"
          descriptionEn="Number of staff on leave/off"
        />
        <SummaryCard
          label={["请假 · 缺勤 /", "Leave · Absent"]}
          value={roster.leave.length}
          color={palette.red}
          icon="alert"
          descriptionCn="未到岗人员数量"
          descriptionEn="Number of staff absent"
        />
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 20 }}>
        <RosterCard
          title="已到岗 / Present Today"
          rows={presentWithoutShift}
          color={palette.green}
          emptyText="暂无排班人员 / No scheduled staff"
          icon="user"
        />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
          <RosterCard
            title="白班 / Day Shift"
            rows={dayShift}
            color={palette.blue}
            emptyText="暂无白班人员 / No day-shift staff"
            icon="sun"
            compact
          />
          <RosterCard
            title="夜班 / Night Shift"
            rows={nightShift}
            color={palette.purple}
            emptyText="暂无夜班人员 / No night-shift staff"
            icon="moon"
            compact
          />
        </div>
        <RosterCard
          title="休息 / Off Today"
          rows={roster.off}
          color={palette.orange}
          emptyText="暂无休息人员 / No staff off"
          icon="bed"
          emptyIcon
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 55,
          marginTop: 18,
          padding: "0 22px",
          border: `1px solid ${palette.border}`,
          borderRadius: 13,
          color: palette.muted,
          background: "linear-gradient(90deg, #dff5ff 0%, #eaf0ff 100%)",
          fontSize: 16,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            marginRight: 14,
            borderRadius: 12,
            color: "#ffffff",
            background: palette.blue,
            fontWeight: 700,
          }}
        >
          i
        </span>
        班次表仅显示智能物流人员，每班最多2人 / Shift tables show Intelligent Logistics personnel
        only, maximum 2 staff per shift.
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 17,
          padding: "0 8px",
          color: palette.muted,
          fontSize: 16,
        }}
      >
        <span style={{ display: "flex" }}>
          数据来源 / Source: 排班与已批准请假 / Shift Schedule &amp; Approved Leave
        </span>
        <span style={{ display: "flex" }}>人员出勤分析 · Staff Attendance Analytics</span>
      </div>
    </div>,
    {
      width: 1600,
      height: 980,
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
