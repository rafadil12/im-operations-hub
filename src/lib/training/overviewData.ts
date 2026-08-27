import type { TrainingParticipantName, TrainingSession } from "./types";

type SessionsApiResponse = {
  success: boolean;
  data?: TrainingSession[];
  divisions?: { id: number; nameEn: string; nameCn: string }[];
  error?: string;
};

export async function getTrainingSessions(params?: {
  year?: number;
  month?: number;
  divisionId?: number | "all";
  q?: string;
}): Promise<{ sessions: TrainingSession[]; divisions: { id: number; nameEn: string; nameCn: string }[] }> {
  const search = new URLSearchParams();
  if (params?.year) search.set("year", String(params.year));
  if (params?.month) search.set("month", String(params.month));
  if (params?.divisionId && params.divisionId !== "all") {
    search.set("divisionId", String(params.divisionId));
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

  return {
    sessions: json.data,
    divisions: json.divisions ?? [],
  };
}

export async function getTrainingParticipantsMaster(): Promise<TrainingParticipantName[]> {
  const res = await fetch("/api/training/participants", { cache: "no-store" });
  const json = (await res.json()) as {
    success: boolean;
    data?: { nameEn: string; nameCn: string }[];
    error?: string;
  };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? "Failed to load participants.");
  }

  return json.data.map((row) => ({
    nameEn: row.nameEn,
    nameCn: row.nameCn,
  }));
}
