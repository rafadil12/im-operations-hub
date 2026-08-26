import { NextResponse } from "next/server";
import {
  TRAINING_CATEGORIES,
  type TrainingCategory,
  type TrainingSession,
  type TrainingSessionParticipantRow,
  type TrainingSessionRow,
} from "./types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function isTrainingCategory(value: string): value is TrainingCategory {
  return (TRAINING_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeCategory(value: unknown): TrainingCategory | null {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (raw === "mes") return "mes";
  if (raw === "intelligent" || raw === "agv" || raw === "il") return "intelligent";
  if (raw === "it") return "it";
  return null;
}

export function parseParticipantNames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return [
      ...new Set(
        raw
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
          .map((name) => name.toUpperCase())
      ),
    ];
  }

  const text = String(raw ?? "").trim();
  if (!text) return [];

  return [
    ...new Set(
      text
        .split(/[,，;/|]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((name) => name.toUpperCase())
    ),
  ];
}

export function mapSessionRow(
  row: TrainingSessionRow,
  participants: string[] = []
): TrainingSession {
  return {
    id: Number(row.id),
    sessionDate: String(row.session_date).slice(0, 10),
    category: row.category,
    topic: row.topic,
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
): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const row of rows) {
    const sessionId = Number(row.session_id);
    const current = map.get(sessionId) ?? [];
    current.push(row.participant_name);
    map.set(sessionId, current);
  }
  return map;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
