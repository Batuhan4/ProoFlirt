const DEFAULT_ANALYSIS_ENDPOINT =
  process.env.NEXT_PUBLIC_GEMINI_ANALYSIS_PATH || "/api/gemini/analyze";

export interface PhotoAnalysisVerdict {
  verdict: "human" | "ai" | "uncertain" | "not_person";
  humanConfidence: number;
  aiConfidence?: number;
  summary?: string;
  flags?: string[];
  rawText?: string;
}

export interface PhotoAnalysisRequestOptions {
  signal?: AbortSignal;
  endpoint?: string;
}

export async function analyzeProfilePhoto(
  file: File,
  options: PhotoAnalysisRequestOptions = {}
): Promise<PhotoAnalysisVerdict> {
  const endpoint = options.endpoint || DEFAULT_ANALYSIS_ENDPOINT;
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    signal: options.signal
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Photo analysis failed (${response.status}): ${details || response.statusText}`
    );
  }

  const payload = (await response.json().catch(() => null)) as PhotoAnalysisVerdict | null;
  if (!payload || typeof payload !== "object") {
    throw new Error("Photo analysis response was not valid JSON.");
  }

  return sanitizePhotoAnalysisVerdict(payload);
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function sanitizePhotoAnalysisVerdict(
  input: PhotoAnalysisVerdict
): PhotoAnalysisVerdict {
  const verdict: PhotoAnalysisVerdict["verdict"] = (() => {
    switch (input.verdict) {
      case "human":
      case "ai":
      case "uncertain":
      case "not_person":
        return input.verdict;
      default:
        return "uncertain";
    }
  })();

  const flags = Array.isArray(input.flags)
    ? input.flags.filter((item) => typeof item === "string" && item.trim().length > 0)
    : undefined;

  const humanConfidence = clampConfidence(input.humanConfidence);
  const aiConfidence =
    typeof input.aiConfidence === "number" ? clampConfidence(input.aiConfidence) : undefined;

  return {
    verdict,
    humanConfidence,
    aiConfidence,
    summary: typeof input.summary === "string" ? input.summary : undefined,
    flags,
    rawText: typeof input.rawText === "string" ? input.rawText : undefined
  };
}
