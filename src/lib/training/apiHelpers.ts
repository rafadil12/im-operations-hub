import { NextResponse } from "next/server";
import type {
  TrainingParticipantName,
  TrainingSession,
  TrainingSessionParticipantRow,
  TrainingSessionRow,
} from "./types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function normalizeParticipantName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function parseParticipantNames(raw: unknown): TrainingParticipantName[] {
  const seen = new Set<string>();
  const out: TrainingParticipantName[] = [];

  const push = (nameEnRaw: unknown, nameCnRaw: unknown) => {
    const nameEn = normalizeParticipantName(nameEnRaw);
    const nameCn = String(nameCnRaw ?? "").trim() || nameEn;
    if (!nameEn) return;
    if (seen.has(nameEn)) return;
    seen.add(nameEn);
    out.push({ nameEn, nameCn });
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        push(item, item);
        continue;
      }
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        push(row.nameEn ?? row.name_en ?? row.name, row.nameCn ?? row.name_cn ?? row.nameEn ?? row.name);
      }
    }
    return out;
  }

  const text = String(raw ?? "").trim();
  if (!text) return [];

  // Prefer JSON payload from the UI.
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      return parseParticipantNames(JSON.parse(text) as unknown);
    } catch {
      // fall through to comma-separated legacy format
    }
  }

  for (const part of text.split(/[,，;/|]+/)) {
    push(part, part);
  }
  return out;
}

export function mapSessionRow(
  row: TrainingSessionRow,
  participants: TrainingParticipantName[] = []
): TrainingSession {
  return {
    id: Number(row.id),
    sessionDate: String(row.session_date).slice(0, 10),
    divisionId: Number(row.division_id),
    divisionNameEn: String(row.division_name_en ?? ""),
    divisionNameCn: String(row.division_name_cn ?? ""),
    topicEn: row.topic_en ?? "",
    topicCn: row.topic_cn ?? "",
    participantCount: Number(row.participant_count) || participants.length,
    participants,
    attachment:
      row.attachment_url && row.attachment_original_name
        ? {
            originalName: row.attachment_original_name,
            url: row.attachment_url,
            mimeType: row.attachment_mime_type,
            size: row.attachment_size == null ? null : Number(row.attachment_size),
          }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function groupParticipantsBySession(
  rows: TrainingSessionParticipantRow[]
): Map<number, TrainingParticipantName[]> {
  const map = new Map<number, TrainingParticipantName[]>();
  for (const row of rows) {
    const sessionId = Number(row.session_id);
    const current = map.get(sessionId) ?? [];
    current.push({
      nameEn: row.participant_name_en,
      nameCn: row.participant_name_cn,
    });
    map.set(sessionId, current);
  }
  return map;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseDivisionId(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function hasTopicText(topicEn: string, topicCn: string): boolean {
  return Boolean(topicEn.trim() || topicCn.trim());
}
