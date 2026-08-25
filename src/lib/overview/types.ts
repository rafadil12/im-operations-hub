import type { AnalysisResult } from "@/lib/types";
import type { SafetyRow } from "@/lib/safety/mapToOverview";

export type AnalysisResponse = {
  result: AnalysisResult;
};

export type SafetyApiResponse = {
  success?: boolean;
  data?: SafetyRow[];
  error?: string;
  message?: string;
};
