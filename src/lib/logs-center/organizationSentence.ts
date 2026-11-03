import { remarkVerb, type RemarkEvent } from "./renderRemark";

function text(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function who(event: RemarkEvent, lang: "en" | "cn"): string {
  const ref = event.objectRef?.trim() ?? "";
  const name = event.changes?.find((change) => change.field === "name");
  const label = name
    ? lang === "cn"
      ? text(name.toCn, text(name.to, ""))
      : text(name.to, text(name.toCn, ""))
    : "";
  return [ref, label].filter(Boolean).join(" ");
}

function linesOf(event: RemarkEvent, lang: "en" | "cn"): string {
  const lines = event.changes?.find((change) => change.field === "lines");
  if (!lines) return "";
  return lang === "cn" ? text(lines.toCn, text(lines.to, "")) : text(lines.to, "");
}

function changeOf(event: RemarkEvent, field: string) {
  return event.changes?.find((change) => change.field === field);
}

function monthName(year: string, month: string, lang: "en" | "cn"): string {
  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthNumber = Number(month);
  const label = names[monthNumber - 1] ?? month;
  return lang === "cn" ? `${year}年${monthNumber}月` : `${label} ${year}`;
}

function deactivatedSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "employee") return null;
  if (!event.changes?.some((change) => change.field === "deactivated")) return null;
  const person = who(event, lang);
  const verb = lang === "cn" ? "已停用" : "Deactivated";
  const noun = lang === "cn" ? "员工" : "employee";
  const gap = lang === "cn" ? "" : " ";
  let sentence = person ? `${verb}${gap}${noun} ${person}` : `${verb}${gap}${noun}`;
  const detail = linesOf(event, lang);
  if (detail) sentence += lang === "cn" ? `：${detail}` : `: ${detail}`;
  return sentence;
}

function leaveSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "leave") return null;
  const type = changeOf(event, "leave_type");
  const when = changeOf(event, "when")?.to?.trim() ?? "";
  const span = changeOf(event, "span");
  const note = changeOf(event, "note");
  const typeLabel = type
    ? lang === "cn"
      ? text(type.toCn, text(type.to, ""))
      : text(type.to, "")
    : "";
  const time = span
    ? lang === "cn"
      ? text(span.toCn, text(span.to, ""))
      : text(span.to, "")
    : "";
  const extra = note
    ? lang === "cn"
      ? text(note.toCn, text(note.to, ""))
      : text(note.to, "")
    : "";
  const person = who(event, lang);
  const verbKey = remarkVerb(event);
  const verb =
    verbKey === "submit"
      ? lang === "cn"
        ? "已提交"
        : "Submitted"
      : verbKey === "delete"
        ? lang === "cn"
          ? "已取消"
          : "Cancelled"
        : lang === "cn"
          ? "已更新"
          : "Updated";
  let sentence: string;
  if (lang === "cn") {
    const bits = [typeLabel, person ? `员工 ${person}` : "", when, time, extra].filter(Boolean);
    sentence = `${verb}请假${bits.length ? ` ${bits.join("，")}` : ""}`;
  } else {
    const head = [
      `${verb} leave`,
      typeLabel,
      person ? `for ${person}` : "",
      when ? `on ${when}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const tail = [time, extra].filter(Boolean).join(", ");
    sentence = tail ? `${head}, ${tail}` : head;
  }
  const detail = linesOf(event, lang);
  if (detail) sentence += lang === "cn" ? `：${detail}` : `: ${detail}`;
  return sentence;
}

function attendanceSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "daily attendance") return null;
  const year = changeOf(event, "year")?.to?.trim() ?? "";
  const month = changeOf(event, "month")?.to?.trim() ?? "";
  const inserted = Number(changeOf(event, "inserted")?.to ?? 0);
  const updated = Number(changeOf(event, "updated_rows")?.to ?? 0);
  const period = monthName(year, month, lang);
  if (lang === "cn") {
    const counts = [
      inserted > 0 ? `新增 ${inserted} 行` : "",
      updated > 0 ? `更新 ${updated} 行` : "",
    ].filter(Boolean);
    const body = `已同步每日考勤，${period}`;
    return counts.length ? `${body}：${counts.join("，")}` : body;
  }
  const counts: string[] = [];
  if (inserted > 0 && updated > 0) {
    counts.push(`${inserted} ${inserted === 1 ? "row" : "rows"} inserted`, `${updated} ${updated === 1 ? "row" : "rows"} updated`);
  } else if (inserted > 0) {
    counts.push(`${inserted} ${inserted === 1 ? "row" : "rows"}`);
  } else if (updated > 0) {
    counts.push(`${updated} ${updated === 1 ? "row" : "rows"} updated`);
  }
  const body = `Synced daily attendance for ${period}`;
  return counts.length ? `${body}: ${counts.join(", ")}` : body;
}

function rosterSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "shift roster") return null;
  const year = changeOf(event, "year")?.to?.trim() ?? "";
  const month = changeOf(event, "month")?.to?.trim() ?? "";
  const period = monthName(year, month, lang);
  return lang === "cn" ? `已生成排班，${period}` : `Generated shift roster for ${period}`;
}

function shiftSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "shift") return null;
  const person = who(event, lang);
  const code = changeOf(event, "shift_code");
  const excluded = changeOf(event, "excluded");
  if (event.action === "create") {
    const shift = code?.to?.trim() ?? "";
    if (lang === "cn") {
      let sentence = `已分配班次 ${shift} 给 ${person}`;
      if (excluded?.to === "yes") sentence += "，已排除";
      return sentence;
    }
    let sentence = `Assigned shift ${shift} to ${person}`;
    if (excluded?.to === "yes") sentence += ", excluded";
    return sentence;
  }
  const parts: string[] = [];
  if (code?.from && code.to && code.from !== code.to) {
    parts.push(lang === "cn" ? `班次从${code.from}改为${code.to}` : `shift from ${code.from} to ${code.to}`);
  }
  if (excluded?.from && excluded.to && excluded.from !== excluded.to) {
    const from = lang === "cn" ? (excluded.from === "yes" ? "是" : "否") : excluded.from;
    const to = lang === "cn" ? (excluded.to === "yes" ? "是" : "否") : excluded.to;
    parts.push(lang === "cn" ? `排除从${from}改为${to}` : `excluded from ${from} to ${to}`);
  }
  const head = lang === "cn" ? `已更新班次 ${person}` : `Updated shift for ${person}`;
  if (!parts.length) return head;
  return lang === "cn" ? `${head}：${parts.join("，")}` : `${head}: ${parts.join(", ")}`;
}

function scheduleSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "schedule") return null;
  const person = who(event, lang);
  const date = changeOf(event, "when")?.to?.trim() ?? "";
  const kind = changeOf(event, "schedule_type");
  if (event.action === "delete") {
    const value = kind?.from?.trim() || kind?.to?.trim() || "";
    return lang === "cn"
      ? `已删除排班 ${value}，员工 ${person}，${date}`
      : `Removed schedule ${value} for ${person} on ${date}`;
  }
  if (event.action === "create") {
    const value = kind?.to?.trim() ?? "";
    return lang === "cn"
      ? `已设置排班 ${value}，员工 ${person}，${date}`
      : `Set schedule ${value} for ${person} on ${date}`;
  }
  return lang === "cn"
    ? `已更新排班，员工 ${person}，${date}：排班从 ${kind?.from} 改为 ${kind?.to}`
    : `Updated schedule for ${person} on ${date}: schedule from ${kind?.from} to ${kind?.to}`;
}

function offDaySentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "off day") return null;
  const person = who(event, lang);
  const count = changeOf(event, "count")?.to?.trim() ?? "";
  const dates = changeOf(event, "dates");
  const listed = dates ? (lang === "cn" ? text(dates.toCn, text(dates.to, "")) : text(dates.to, "")) : "";
  const verb = event.action === "delete" ? (lang === "cn" ? "已删除休息日" : "Removed off day") : lang === "cn" ? "已设置休息日" : "Set off day";
  if (count) {
    return lang === "cn" ? `${verb}，员工 ${person}：${count} 天` : `${verb} for ${person}: ${count} days`;
  }
  if (lang === "cn") return `${verb}，员工 ${person}${listed ? `，${listed}` : ""}`;
  return `${verb} for ${person}${listed ? ` on ${listed}` : ""}`;
}

function rotationSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  if (event.objectType !== "rotation") return null;
  const detail = linesOf(event, lang);
  return lang === "cn" ? `已保存轮班配对：${detail}` : `Saved rotation pairs: ${detail}`;
}

export function organizationSentence(event: RemarkEvent, lang: "en" | "cn"): string | null {
  return (
    deactivatedSentence(event, lang) ??
    leaveSentence(event, lang) ??
    attendanceSentence(event, lang) ??
    rosterSentence(event, lang) ??
    shiftSentence(event, lang) ??
    scheduleSentence(event, lang) ??
    offDaySentence(event, lang) ??
    rotationSentence(event, lang)
  );
}
