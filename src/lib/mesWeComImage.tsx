import { ImageResponse } from "next/og";

import { loadAttendanceFont } from "@/lib/attendanceWeComImage";
import type { MesDataRow } from "@/lib/types";

function value(primary: string | null | undefined, fallback = "-") {
  return primary?.trim() || fallback;
}

function duration(startTime: string, endTime: string | null) {
  if (!endTime) return "-";
  const minutes = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000);
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
  const chineseLines = estimatedLines(cn, 95);
  const englishLines = estimatedLines(en, 145);
  return Math.max(190, 58 + chineseLines * 34 + englishLines * 29);
}

function Icon({ name, color }: { name: "user" | "building" | "clock" | "grid" | "tag" | "alert" | "tool" | "check" | "calendar"; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="40" height="40" viewBox="0 0 24 24">
      {name === "user" && <g><circle cx="12" cy="7" r="4" fill={color} /><path d="M4 21c0-5 3.5-8 8-8s8 3 8 8" fill={color} /></g>}
      {name === "building" && <g><rect x="5" y="3" width="11" height="18" rx="1" {...common} /><path d="M9 7h3M9 11h3M9 15h3M16 10h3v11" {...common} /></g>}
      {name === "clock" && <g><circle cx="12" cy="12" r="9" {...common} /><path d="M12 7v6l4 2" {...common} /></g>}
      {name === "grid" && <g><rect x="3" y="3" width="7" height="7" rx="1" fill={color} /><rect x="14" y="3" width="7" height="7" rx="1" fill={color} /><rect x="3" y="14" width="7" height="7" rx="1" fill={color} /><rect x="14" y="14" width="7" height="7" rx="1" fill={color} /></g>}
      {name === "tag" && <g><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" fill={color} /><circle cx="8" cy="8" r="1.5" fill="#fff" /></g>}
      {name === "alert" && <g><path d="M12 2 2 21h20L12 2Z" fill={color} /><path d="M12 8v6M12 18h.01" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" /></g>}
      {name === "tool" && <path d="M14 3a6 6 0 0 0-7 7L2 15l7 7 5-5a6 6 0 0 0 7-7l-4 4-3-3 4-4a6 6 0 0 0-4-4Z" fill={color} />}
      {name === "check" && <path d="m5 12 4 4L19 6" {...common} strokeWidth="3" />}
      {name === "calendar" && <g><rect x="3" y="5" width="18" height="16" rx="2" {...common} /><path d="M7 2v6M17 2v6M3 10h18" {...common} /></g>}
    </svg>
  );
}

function Meta({ icon, label, primary, secondary, width, last = false }: { icon: "user" | "building" | "clock" | "grid" | "tag"; label: string; primary: string; secondary?: string; width: number; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width, minWidth: 0, padding: "0 25px", borderRight: last ? "none" : "1px solid #b7d3fa" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 62, height: 62, marginRight: 18, borderRadius: 14, background: "#e8f2ff" }}>
        <Icon name={icon} color="#1264cb" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ display: "flex", color: "#17458c", fontSize: 19, whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ display: "flex", marginTop: 8, color: "#071947", fontSize: 23, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primary}</span>
        {secondary ? <span style={{ display: "flex", marginTop: 4, color: "#17458c", fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{secondary}</span> : null}
      </div>
    </div>
  );
}

function Detail({ tone, number, icon, cn, en, labelCn, labelEn, height }: { tone: "red" | "green"; number: number; icon: "alert" | "tool"; cn: string; en: string; labelCn: string; labelEn: string; height: number }) {
  const color = tone === "red" ? "#ef3340" : "#079447";
  const pale = tone === "red" ? "#fff4f5" : "#effcf5";
  const border = tone === "red" ? "#ffadb4" : "#75dfa8";
  return (
    <div style={{ display: "flex", alignItems: "center", position: "relative", height, marginTop: 18, padding: "24px 42px", border: `1px solid ${border}`, borderLeft: `11px solid ${color}`, borderRadius: 20, background: pale, overflow: "hidden" }}>
      <div style={{ display: "flex", position: "absolute", left: -76, top: 63, alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 28, color: "#fff", background: color, fontSize: 26, fontWeight: 700 }}>{number}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 112, height: 112, marginRight: 30, borderRadius: 56, background: `${color}18`, border: `2px solid #ffffff` }}><Icon name={icon} color={color} /></div>
      <div style={{ display: "flex", flexDirection: "column", width: 190, paddingRight: 30, borderRight: `1px solid ${border}` }}>
        <span style={{ display: "flex", color, fontSize: 34, fontWeight: 700 }}>{labelCn}</span>
        <span style={{ display: "flex", marginTop: 6, color, fontSize: 25, fontWeight: 700 }}>{labelEn}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, paddingLeft: 34 }}>
        <span style={{ display: "flex", color: "#071947", fontSize: 25, lineHeight: 1.35, fontWeight: 700 }}>{cn}</span>
        <span style={{ display: "flex", marginTop: 12, color: "#183c79", fontSize: 21, lineHeight: 1.35 }}>{en}</span>
      </div>
    </div>
  );
}

export async function renderMesRecordWeComImage(record: MesDataRow): Promise<Buffer> {
  const fonts = await loadAttendanceFont();
  const completed = String(record.status_en ?? "").toLowerCase() === "completed";
  const statusColor = completed ? "#078b3c" : "#c47700";
  const recordDate = String(record.end_time || record.start_time).slice(0, 10);
  const problemCn = value(record.description_cn);
  const problemEn = value(record.description_en);
  const solutionCn = value(record.solution_cn);
  const solutionEn = value(record.solution_en);
  const problemHeight = detailHeight(problemCn, problemEn);
  const solutionHeight = detailHeight(solutionCn, solutionEn);
  const imageHeight = 374 + problemHeight + solutionHeight;
  const response = new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 24, background: "linear-gradient(140deg, #f7fbff 0%, #e9f4ff 100%)", fontFamily: fonts.regular ? "Attendance Sans" : "sans-serif" }}>
      <div style={{ display: "flex", height: 154, borderRadius: 20, background: "#ffffff", overflow: "hidden", boxShadow: "0 8px 26px #2469aa20" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 220, color: "#fff", background: "linear-gradient(135deg, #0875d7, #072e87)" }}>
          <span style={{ display: "flex", fontSize: 20, letterSpacing: 3 }}>TICKET</span><span style={{ display: "flex", marginTop: 2, fontSize: 74, lineHeight: 1, fontWeight: 700 }}>{String(record.id).padStart(2, "0")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "0 42px" }}>
          <span style={{ display: "flex", color: "#061b58", fontSize: 47, lineHeight: 1, fontWeight: 700 }}>{value(record.type_cn)} / {value(record.type_en)}</span>
          <span style={{ display: "flex", marginTop: 16, color: "#1150a3", fontSize: 26, fontWeight: 700 }}>{value(record.category_cn)}　|　{value(record.category_en)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 330, margin: "32px 0", borderRadius: 16, color: statusColor, background: completed ? "#ebfaf2" : "#fff7e8", fontSize: 25, fontWeight: 700 }}><span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 50, height: 50, marginRight: 12, borderRadius: 25, color: "#fff", background: statusColor }}><Icon name="check" color="#fff" /></span>{value(record.status_cn)} ({value(record.status_en)})</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 240, color: "#092560" }}><Icon name="calendar" color="#1264cb" /><span style={{ display: "flex", marginTop: 7, fontSize: 21, fontWeight: 700 }}>{recordDate}</span><span style={{ display: "flex", marginTop: 3, fontSize: 15 }}>处理日期 / Date</span></div>
      </div>
      <div style={{ display: "flex", height: 140, marginTop: 18, padding: "20px 6px", borderRadius: 20, background: "#ffffff", boxShadow: "0 8px 26px #2469aa18" }}>
        <Meta width={285} icon="user" label="用户 / User" primary={value(record.pic_cn)} secondary={value(record.pic_en)} />
        <Meta width={285} icon="building" label="部门 / Division" primary={`${value(record.division_cn)} (${value(record.division_en)})`} />
        <Meta width={235} icon="clock" label="时长 / Duration" primary={duration(record.start_time, record.end_time)} />
        <Meta width={350} icon="grid" label="类别 / Category" primary={value(record.category_cn)} secondary={value(record.category_en)} />
        <Meta width={385} icon="tag" label="子类别 / SubCategory" primary={value(record.subcategory_cn)} secondary={value(record.subcategory_en)} last />
      </div>
      <div style={{ display: "flex", flexDirection: "column", position: "relative", marginLeft: 62 }}>
        <Detail tone="red" number={1} icon="alert" labelCn="问题" labelEn="Problem" cn={problemCn} en={problemEn} height={problemHeight} />
        <Detail tone="green" number={2} icon="tool" labelCn="解决方案" labelEn="Solution" cn={solutionCn} en={solutionEn} height={solutionHeight} />
      </div>
    </div>,
    { width: 1600, height: imageHeight, ...(fonts.regular ? { fonts: [{ name: "Attendance Sans", data: fonts.regular, weight: 400 as const, style: "normal" as const }, { name: "Attendance Sans", data: fonts.bold ?? fonts.regular, weight: 700 as const, style: "normal" as const }] } : {}) },
  );
  return Buffer.from(await response.arrayBuffer());
}
