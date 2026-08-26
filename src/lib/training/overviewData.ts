import type { TrainingCategory, TrainingSession } from "./types";
import { mapSessionRow } from "./apiHelpers";
import type { TrainingSessionParticipantRow, TrainingSessionRow } from "./types";

type SessionsApiResponse = {
  success: boolean;
  data?: Array<
    TrainingSessionRow & {
      participants?: string[] | TrainingSessionParticipantRow[];
    }
  >;
  error?: string;
};

function normalizeApiSession(
  row: TrainingSessionRow & {
    participants?: string[] | TrainingSessionParticipantRow[];
  }
): TrainingSession {
  const participants = Array.isArray(row.participants)
    ? row.participants.map((item) =>
        typeof item === "string" ? item : String(item.participant_name ?? "")
      )
    : [];

  return mapSessionRow(row, participants.filter(Boolean));
}

export async function getTrainingSessions(params?: {
  year?: number;
  month?: number;
  category?: TrainingCategory | "all";
  q?: string;
}): Promise<TrainingSession[]> {
  const search = new URLSearchParams();
  if (params?.year) search.set("year", String(params.year));
  if (params?.month) search.set("month", String(params.month));
  if (params?.category && params.category !== "all") {
    search.set("category", params.category);
  }
  if (params?.q) search.set("q", params.q);

  const query = search.toString();
  const res = await fetch(`/api/training/sessions${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  const json = (await res.json()) as SessionsApiResponse;

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? "Failed to load training sessions.");
  }

  // API already returns mapped TrainingSession-shaped objects from loadTrainingSessions.
  // Prefer that shape when present.
  return json.data.map((row) => {
    if ("sessionDate" in row && Array.isArray((row as { participants?: unknown }).participants)) {
      return row as unknown as TrainingSession;
    }
    return normalizeApiSession(row);
  });
}

export async function getTrainingParticipantsMaster(): Promise<string[]> {
  const res = await fetch("/api/training/participants", { cache: "no-store" });
  const json = (await res.json()) as {
    success: boolean;
    data?: { name: string }[];
    error?: string;
  };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? "Failed to load participants.");
  }

  return json.data.map((row) => row.name);
}
