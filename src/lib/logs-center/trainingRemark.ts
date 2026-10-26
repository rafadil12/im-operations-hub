import type { RemarkChange, RemarkEvent } from "./renderRemark";
import { recordLogsCenter } from "./record";
import { normalizeTopicText } from "@/lib/training/topicText";

const NAMED_LIMIT = 3;

export type TrainingPerson = {
  nameEn: string;
  nameCn: string;
};

export type TrainingSnapshot = {
  sessionDate: string;
  divisionEn: string;
  divisionCn: string;
  topicEn: string;
  topicCn: string;
  participants: TrainingPerson[];
  attachmentName: string | null;
};

export type TrainingRemarkInput = {
  action: "create" | "update" | "delete";
  topicEn: string;
  topicCn: string;
  detail?: RemarkChange | null;
};

export type ParticipantMaster = {
  nameCn: string | null;
  isActive: boolean;
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function personKey(person: TrainingPerson): string {
  return clean(person.nameEn).toUpperCase();
}

function label(en: string, cn: string, lang: "en" | "cn", empty: string): string {
  const value = lang === "cn" ? clean(cn) || clean(en) : clean(en) || clean(cn);
  return value || empty;
}

function linesChange(parts: Array<{ en: string; cn: string }>): RemarkChange | null {
  if (!parts.length) return null;
  return {
    field: "lines",
    to: parts.map((part) => part.en).join(", "),
    toCn: parts.map((part) => part.cn).join("，"),
  };
}

function participantCountPart(count: number): { en: string; cn: string } | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count === 1) return { en: "1 participant", cn: "1 名参与者" };
  return { en: `${count} participants`, cn: `${count} 名参与者` };
}

function peoplePart(
  kind: "added" | "removed",
  people: TrainingPerson[]
): { en: string; cn: string } | null {
  if (!people.length) return null;
  if (people.length > NAMED_LIMIT) {
    const count = people.length;
    return kind === "added"
      ? { en: `added ${count} participants`, cn: `已添加 ${count} 名参与者` }
      : { en: `removed ${count} participants`, cn: `已移除 ${count} 名参与者` };
  }
  const en = people.map((person) => clean(person.nameEn) || clean(person.nameCn)).join(", ");
  const cn = people.map((person) => clean(person.nameCn) || clean(person.nameEn)).join("、");
  return kind === "added" ? { en: `added ${en}`, cn: `已添加 ${cn}` } : { en: `removed ${en}`, cn: `已移除 ${cn}` };
}

function topicPart(before: TrainingSnapshot, after: TrainingSnapshot): { en: string; cn: string } | null {
  const fromEn = normalizeTopicText(before.topicEn || before.topicCn);
  const toEn = normalizeTopicText(after.topicEn || after.topicCn);
  const fromCn = normalizeTopicText(before.topicCn || before.topicEn);
  const toCn = normalizeTopicText(after.topicCn || after.topicEn);
  if (fromEn === toEn && fromCn === toCn) return null;
  const long = [fromEn, toEn, fromCn, toCn].some((value) => value.length > 60);
  if (long || (fromEn === toEn && fromCn !== toCn) || (fromCn === toCn && fromEn !== toEn)) {
    if (!long && fromEn !== toEn && fromCn === toCn) {
      return { en: `topic from ${fromEn} to ${toEn}`, cn: "主题已更新" };
    }
    if (!long && fromCn !== toCn && fromEn === toEn) {
      return { en: "topic updated", cn: `主题从${fromCn}改为${toCn}` };
    }
    if (long) return { en: "topic updated", cn: "主题已更新" };
  }
  return { en: `topic from ${fromEn} to ${toEn}`, cn: `主题从${fromCn}改为${toCn}` };
}

export function trainingCreateDetail(input: {
  sessionDate: string;
  divisionEn: string;
  divisionCn: string;
  participants: TrainingPerson[];
  attachmentName?: string | null;
}): RemarkChange | null {
  const parts: Array<{ en: string; cn: string }> = [];
  const date = clean(input.sessionDate).slice(0, 10);
  if (date) parts.push({ en: `date ${date}`, cn: `日期 ${date}` });
  const divisionEn = label(input.divisionEn, input.divisionCn, "en", "");
  const divisionCn = label(input.divisionCn, input.divisionEn, "cn", "");
  if (divisionEn || divisionCn) {
    parts.push({ en: `division ${divisionEn || divisionCn}`, cn: `部门 ${divisionCn || divisionEn}` });
  }
  const count = participantCountPart(input.participants.length);
  if (count) parts.push(count);
  const attachment = clean(input.attachmentName);
  if (attachment) parts.push({ en: `attachment ${attachment}`, cn: `附件 ${attachment}` });
  return linesChange(parts);
}

export function trainingUpdateDetail(
  before: TrainingSnapshot,
  after: TrainingSnapshot
): RemarkChange | null {
  const parts: Array<{ en: string; cn: string }> = [];

  const dateFrom = clean(before.sessionDate).slice(0, 10);
  const dateTo = clean(after.sessionDate).slice(0, 10);
  if (dateFrom !== dateTo) {
    parts.push({
      en: `date from ${dateFrom || "none"} to ${dateTo || "none"}`,
      cn: `日期从${dateFrom || "无"}改为${dateTo || "无"}`,
    });
  }

  const divisionFromEn = label(before.divisionEn, before.divisionCn, "en", "none");
  const divisionToEn = label(after.divisionEn, after.divisionCn, "en", "none");
  const divisionFromCn = label(before.divisionCn, before.divisionEn, "cn", "无");
  const divisionToCn = label(after.divisionCn, after.divisionEn, "cn", "无");
  if (divisionFromEn !== divisionToEn || divisionFromCn !== divisionToCn) {
    parts.push({
      en: `division from ${divisionFromEn} to ${divisionToEn}`,
      cn: `部门从${divisionFromCn}改为${divisionToCn}`,
    });
  }

  const topic = topicPart(before, after);
  if (topic) parts.push(topic);

  const beforeByKey = new Map(before.participants.map((person) => [personKey(person), person]));
  const afterByKey = new Map(after.participants.map((person) => [personKey(person), person]));
  const added = after.participants.filter((person) => !beforeByKey.has(personKey(person)));
  const removed = before.participants.filter((person) => !afterByKey.has(personKey(person)));
  const addedPart = peoplePart("added", added);
  const removedPart = peoplePart("removed", removed);
  if (addedPart) parts.push(addedPart);
  if (removedPart) parts.push(removedPart);

  const renamed = after.participants.filter((person) => {
    const previous = beforeByKey.get(personKey(person));
    return previous && clean(previous.nameCn) !== clean(person.nameCn);
  });
  if (renamed.length === 1) {
    const person = renamed[0];
    const previous = beforeByKey.get(personKey(person));
    const from = clean(previous?.nameCn) || "none";
    const to = clean(person.nameCn) || "none";
    const fromCn = from === "none" ? "无" : from;
    const toCn = to === "none" ? "无" : to;
    parts.push({
      en: `${person.nameEn} Chinese name from ${from} to ${to}`,
      cn: `${clean(person.nameCn) || person.nameEn} 中文名从${fromCn}改为${toCn}`,
    });
  } else if (renamed.length > 1) {
    parts.push({
      en: `${renamed.length} participant names updated`,
      cn: `${renamed.length} 名参与者中文名已更新`,
    });
  }

  const attachmentFrom = clean(before.attachmentName);
  const attachmentTo = clean(after.attachmentName);
  if (attachmentFrom !== attachmentTo) {
    if (!attachmentFrom) {
      parts.push({ en: `attachment ${attachmentTo} added`, cn: `已添加附件 ${attachmentTo}` });
    } else if (!attachmentTo) {
      parts.push({ en: `attachment ${attachmentFrom} removed`, cn: `已删除附件 ${attachmentFrom}` });
    } else {
      parts.push({
        en: `attachment from ${attachmentFrom} to ${attachmentTo}`,
        cn: `附件从${attachmentFrom}改为${attachmentTo}`,
      });
    }
  }

  return linesChange(parts);
}

export function trainingDeleteDetail(input: {
  sessionDate: string;
  participantCount: number;
}): RemarkChange | null {
  const parts: Array<{ en: string; cn: string }> = [];
  const date = clean(input.sessionDate).slice(0, 10);
  if (date) parts.push({ en: `date ${date}`, cn: `日期 ${date}` });
  const count = participantCountPart(input.participantCount);
  if (count) parts.push(count);
  return linesChange(parts);
}

export function trainingRemarkEvent(input: TrainingRemarkInput): RemarkEvent {
  const changes: RemarkChange[] = [
    { field: "name", to: clean(input.topicEn), toCn: clean(input.topicCn) || clean(input.topicEn) },
  ];
  if (input.detail) changes.push(input.detail);
  return {
    action: input.action,
    summary: "",
    objectType: "training session",
    changes,
  };
}

export function participantUpdateChanges(
  before: ParticipantMaster,
  after: { nameCn: string }
): RemarkChange[] | null {
  const changes: RemarkChange[] = [];
  const from = clean(before.nameCn);
  const to = clean(after.nameCn);
  if (from !== to) {
    changes.push({ field: "name_cn", from: from || "none", to: to || "none", fromCn: from || "无", toCn: to || "无" });
  }
  if (!before.isActive) {
    changes.push({
      field: "status",
      from: "Inactive",
      to: "Active",
      fromCn: "停用",
      toCn: "启用",
    });
  }
  return changes.length ? changes : null;
}

export function participantRemarkEvent(input: {
  action: "create" | "update";
  nameEn: string;
  nameCn: string;
  changes?: RemarkChange[] | null;
}): RemarkEvent {
  return {
    action: input.action,
    summary: "",
    objectType: "participant",
    changes: [{ field: "name", to: clean(input.nameEn), toCn: clean(input.nameCn) || clean(input.nameEn) }, ...(input.changes ?? [])],
  };
}

export async function recordTrainingSession(input: TrainingRemarkInput): Promise<void> {
  const event = trainingRemarkEvent(input);
  await recordLogsCenter({
    module: "training",
    action: event.action,
    objectType: event.objectType,
    changes: event.changes,
  });
}

export async function recordTrainingParticipant(input: {
  action: "create" | "update";
  nameEn: string;
  nameCn: string;
  changes?: RemarkChange[] | null;
}): Promise<void> {
  const event = participantRemarkEvent(input);
  await recordLogsCenter({
    module: "training",
    action: event.action,
    objectType: event.objectType,
    changes: event.changes,
  });
}
