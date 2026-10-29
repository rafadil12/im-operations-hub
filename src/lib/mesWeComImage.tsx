import { ImageResponse } from "next/og";

import { loadAttendanceFont } from "@/lib/attendanceWeComImage";
import type { MesDataRow } from "@/lib/types";

function value(primary: string | null | undefined, fallback = "-") {
  return primary?.trim() || fallback;
}

function duration(startTime: string, endTime: string | null) {
  if (!endTime) return "-";
  const minutes = Math.floor(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000
  );
  if (!Number.isFinite(minutes) || minutes < 0) return "-";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
}

function estimatedLines(text: string, unitsPerLine: number) {
  const units = Array.from(text).reduce((total, character) => {
    return total + (/[^\u0000-\u00ff]/.test(character) ? 2 : 1);
  }, 0);
  return Math.max(1, Math.ceil(units / unitsPerLine));
}

function detailHeight(cn: string, en: string) {
  const chineseLines = estimatedLines(cn, 82);
  const englishLines = estimatedLines(en, 125);
  return Math.max(204, 72 + chineseLines * 36 + englishLines * 31);
}

type ReportTheme = {
  primary: string;
  pale: string;
  border: string;
  icon: "alert" | "tool" | "task" | "change" | "shield";
  detailCn: string;
  detailEn: string;
  resultCn: string;
  resultEn: string;
};

function reportTheme(type: string | null): ReportTheme {
  switch ((type ?? "").trim().toLowerCase()) {
    case "problem":
      return {
        primary: "#ef3340",
        pale: "#fff4f5",
        border: "#ffadb4",
        icon: "alert",
        detailCn: "问题",
        detailEn: "Problem",
        resultCn: "解决方案",
        resultEn: "Solution",
      };
    case "change request":
      return {
        primary: "#6d28d9",
        pale: "#f7f2ff",
        border: "#cdb8f7",
        icon: "change",
        detailCn: "变更内容",
        detailEn: "Change Details",
        resultCn: "实施结果",
        resultEn: "Implementation",
      };
    case "maintenance":
      return {
        primary: "#dc7a00",
        pale: "#fff8e9",
        border: "#f4c56c",
        icon: "tool",
        detailCn: "维护内容",
        detailEn: "Maintenance Details",
        resultCn: "处理结果",
        resultEn: "Result",
      };
    case "access request":
    case "request":
      return {
        primary: "#078b57",
        pale: "#effbf6",
        border: "#8ed9bd",
        icon: "shield",
        detailCn: "申请内容",
        detailEn: "Request Details",
        resultCn: "处理结果",
        resultEn: "Result",
      };
    case "task":
    default:
      return {
        primary: "#2563c9",
        pale: "#f3f7ff",
        border: "#a9c7f2",
        icon: "task",
        detailCn: "任务内容",
        detailEn: "Task Details",
        resultCn: "处理结果",
        resultEn: "Result",
      };
  }
}

function Icon({
  name,
  color,
}: {
  name:
    | "user"
    | "building"
    | "clock"
    | "grid"
    | "tag"
    | "alert"
    | "tool"
    | "task"
    | "change"
    | "shield"
    | "check"
    | "calendar";
  color: string;
}) {
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg width="40" height="40" viewBox="0 0 24 24">
      {name === "user" && (
        <g>
          <circle cx="12" cy="7" r="4" fill={color} />
          <path d="M4 21c0-5 3.5-8 8-8s8 3 8 8" fill={color} />
        </g>
      )}
      {name === "building" && (
        <g>
          <rect x="5" y="3" width="11" height="18" rx="1" {...common} />
          <path d="M9 7h3M9 11h3M9 15h3M16 10h3v11" {...common} />
        </g>
      )}
      {name === "clock" && (
        <g>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M12 7v6l4 2" {...common} />
        </g>
      )}
      {name === "grid" && (
        <g>
          <rect x="3" y="3" width="7" height="7" rx="1" fill={color} />
          <rect x="14" y="3" width="7" height="7" rx="1" fill={color} />
          <rect x="3" y="14" width="7" height="7" rx="1" fill={color} />
          <rect x="14" y="14" width="7" height="7" rx="1" fill={color} />
        </g>
      )}
      {name === "tag" && (
        <g>
          <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" fill={color} />
          <circle cx="8" cy="8" r="1.5" fill="#fff" />
        </g>
      )}
      {name === "alert" && (
        <g>
          <path d="M12 2 2 21h20L12 2Z" fill={color} />
          <path d="M12 8v6M12 18h.01" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
        </g>
      )}
      {name === "tool" && (
        <path
          d="M14 3a6 6 0 0 0-7 7L2 15l7 7 5-5a6 6 0 0 0 7-7l-4 4-3-3 4-4a6 6 0 0 0-4-4Z"
          fill={color}
        />
      )}
      {name === "task" && (
        <g>
          <rect x="5" y="3" width="14" height="18" rx="2" fill={color} />
          <path
            d="m8.5 9 1.6 1.6 3-3M8.5 15l1.6 1.6 3-3M14.5 9H16M14.5 15H16"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      )}
      {name === "change" && (
        <path
          d="M7 7h10l-2.8-2.8M17 17H7l2.8 2.8M19 7l-3-3m-11 13 3 3"
          {...common}
          strokeWidth="2.8"
        />
      )}
      {name === "shield" && (
        <g>
          <path d="M12 2 20 5v6c0 5.2-3.2 8.7-8 11-4.8-2.3-8-5.8-8-11V5l8-3Z" fill={color} />
          <path
            d="M9.5 12a2.5 2.5 0 1 1 4.7 1.2L14 16h-4l-.2-2.8A2.5 2.5 0 0 1 9.5 12Z"
            fill="#fff"
          />
        </g>
      )}
      {name === "check" && <path d="m5 12 4 4L19 6" {...common} strokeWidth="3" />}
      {name === "calendar" && (
        <g>
          <rect x="3" y="5" width="18" height="16" rx="2" {...common} />
          <path d="M7 2v6M17 2v6M3 10h18" {...common} />
        </g>
      )}
    </svg>
  );
}

function Meta({
  icon,
  label,
  primary,
  secondary,
  width,
  color = "#1264cb",
  background = "#e8f2ff",
}: {
  icon: "user" | "building" | "clock" | "grid" | "tag";
  label: string;
  primary: string;
  secondary?: string;
  width: number;
  color?: string;
  background?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flex: 1,
        width,
        minWidth: 0,
        height: 108,
        padding: "0 16px",
        border: "1px solid #e4ebf3",
        borderRadius: 15,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 54,
          height: 54,
          marginRight: 14,
          borderRadius: 13,
          background,
        }}
      >
        <Icon name={icon} color={color} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ display: "flex", color: "#52647d", fontSize: 16, whiteSpace: "nowrap" }}>
          {label}
        </span>
        <span
          style={{
            display: "flex",
            marginTop: 6,
            color: "#071947",
            fontSize: 20,
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {primary}
        </span>
        {secondary ? (
          <span
            style={{
              display: "flex",
              marginTop: 4,
              color: "#17458c",
              fontSize: 15,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {secondary}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Detail({
  color,
  pale,
  border,
  icon,
  cn,
  en,
  labelCn,
  labelEn,
  height,
}: {
  color: string;
  pale: string;
  border: string;
  icon: "alert" | "tool" | "task" | "change" | "shield" | "check";
  cn: string;
  en: string;
  labelCn: string;
  labelEn: string;
  height: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height,
        marginTop: 14,
        padding: "24px 30px",
        border: `1px solid ${border}`,
        borderLeft: `9px solid ${color}`,
        borderRadius: 17,
        background: pale,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 82,
          height: 82,
          marginRight: 22,
          borderRadius: 41,
          background: `${color}16`,
          border: "2px solid #ffffff",
        }}
      >
        <Icon name={icon} color={color} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 230,
          paddingRight: 20,
        }}
      >
        <span style={{ display: "flex", color, fontSize: 30, lineHeight: 1.15, fontWeight: 700 }}>
          {labelCn}
        </span>
        <span
          style={{
            display: "flex",
            marginTop: 7,
            color,
            fontSize: 21,
            lineHeight: 1.2,
            fontWeight: 700,
          }}
        >
          {labelEn}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          padding: "20px 26px",
          borderRadius: 13,
          background: "#ffffffb8",
        }}
      >
        <span
          style={{
            display: "flex",
            color: "#071947",
            fontSize: 23,
            lineHeight: 1.4,
            fontWeight: 700,
          }}
        >
          {cn}
        </span>
        <span
          style={{
            display: "flex",
            marginTop: 12,
            color: "#183c79",
            fontSize: 19,
            lineHeight: 1.4,
          }}
        >
          {en}
        </span>
      </div>
    </div>
  );
}

export async function renderMesRecordWeComImage(record: MesDataRow): Promise<Buffer> {
  const fonts = await loadAttendanceFont();
  const theme = reportTheme(record.type_en);
  const completed = String(record.status_en ?? "").toLowerCase() === "completed";
  const statusColor = completed ? "#078b3c" : "#c47700";
  const recordDate = String(record.end_time || record.start_time).slice(0, 10);
  const problemCn = value(record.description_cn);
  const problemEn = value(record.description_en);
  const solutionCn = value(record.solution_cn);
  const solutionEn = value(record.solution_en);
  const problemHeight = detailHeight(problemCn, problemEn);
  const solutionHeight = detailHeight(solutionCn, solutionEn);
  // Include every fixed section, gap and outer padding. The extra room avoids
  // clipping caused by small font-metric differences between Windows/Linux.
  const imageHeight = 404 + problemHeight + solutionHeight;
  const response = new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 18,
        borderLeft: `11px solid ${theme.primary}`,
        background: "#f6f9fc",
        fontFamily: fonts.regular ? "Attendance Sans" : "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          height: 154,
          borderRadius: 20,
          background: "#fffefe",
          overflow: "hidden",
          boxShadow: "0 8px 26px #2469aa20",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 220,
            color: "#071947",
            borderRight: `1px solid ${theme.border}`,
          }}
        >
          <span style={{ display: "flex", fontSize: 20, letterSpacing: 3 }}>TICKET</span>
          <span
            style={{ display: "flex", marginTop: 2, fontSize: 74, lineHeight: 1, fontWeight: 700 }}
          >
            {String(record.id).padStart(2, "0")}
          </span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 112 }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 78,
              height: 78,
              borderRadius: 39,
              background: `${theme.primary}24`,
            }}
          >
            <Icon name={theme.icon} color={theme.primary} />
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "0 20px",
          }}
        >
          <span
            style={{
              display: "flex",
              color: theme.primary,
              fontSize: 47,
              lineHeight: 1,
              fontWeight: 700,
            }}
          >
            {value(record.type_cn)} / {value(record.type_en)}
          </span>
          <span
            style={{
              display: "flex",
              marginTop: 16,
              color: "#17458c",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {value(record.category_cn)}　|　{value(record.category_en)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 330,
            margin: "32px 0",
            borderRadius: 16,
            color: statusColor,
            background: completed ? "#ebfaf2" : "#fff7e8",
            fontSize: 25,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 50,
              height: 50,
              marginRight: 12,
              borderRadius: 25,
              color: "#fff",
              background: statusColor,
            }}
          >
            <Icon name="check" color="#fff" />
          </span>
          {value(record.status_cn)} ({value(record.status_en)})
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 240,
            color: "#092560",
          }}
        >
          <Icon name="calendar" color="#1264cb" />
          <span style={{ display: "flex", marginTop: 7, fontSize: 21, fontWeight: 700 }}>
            {recordDate}
          </span>
          <span style={{ display: "flex", marginTop: 3, fontSize: 15 }}>处理日期 / Date</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          height: 136,
          marginTop: 18,
          padding: "13px 10px",
          gap: 10,
          borderRadius: 20,
          background: "#fffefe",
          boxShadow: "0 8px 26px #2469aa18",
        }}
      >
        <Meta
          width={285}
          icon="user"
          label="用户 / User"
          primary={value(record.pic_cn)}
          secondary={value(record.pic_en)}
          color="#1769cf"
          background="#e8f2ff"
        />
        <Meta
          width={285}
          icon="building"
          label="部门 / Division"
          primary={`${value(record.division_cn)} (${value(record.division_en)})`}
          color="#6941c6"
          background="#f0eaff"
        />
        <Meta
          width={235}
          icon="clock"
          label="时长 / Duration"
          primary={duration(record.start_time, record.end_time)}
          color="#d97706"
          background="#fff0d6"
        />
        <Meta
          width={350}
          icon="grid"
          label="类别 / Category"
          primary={value(record.category_cn)}
          secondary={value(record.category_en)}
          color={theme.primary}
          background={theme.pale}
        />
        <Meta
          width={385}
          icon="tag"
          label="子类别 / SubCategory"
          primary={value(record.subcategory_cn)}
          secondary={value(record.subcategory_en)}
          color="#6d28d9"
          background="#f0e7ff"
        />
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", position: "relative", marginLeft: 6 }}
      >
        <Detail
          color={theme.primary}
          pale={theme.pale}
          border={theme.border}
          icon={theme.icon}
          labelCn={theme.detailCn}
          labelEn={theme.detailEn}
          cn={problemCn}
          en={problemEn}
          height={problemHeight}
        />
        <Detail
          color="#079447"
          pale="#effcf5"
          border="#75dfa8"
          icon="check"
          labelCn={theme.resultCn}
          labelEn={theme.resultEn}
          cn={solutionCn}
          en={solutionEn}
          height={solutionHeight}
        />
      </div>
    </div>,
    {
      width: 1600,
      height: imageHeight,
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
