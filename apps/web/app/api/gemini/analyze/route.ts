import { NextResponse } from "next/server";

import {
  type PhotoAnalysisVerdict,
  sanitizePhotoAnalysisVerdict
} from "@/lib/ai-photo-analysis";

const DEFAULT_MODEL =
  process.env.GEMINI_ANALYSIS_MODEL ||
  process.env.NEXT_PUBLIC_GEMINI_ANALYSIS_MODEL ||
  "gemini-2.5-flash";

function resolveGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    null
  );
}

function resolveGeminiApiUrl() {
  const explicit =
    process.env.GEMINI_API_URL || process.env.NEXT_PUBLIC_GEMINI_API_URL || null;
  if (explicit) return explicit;
  return `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`;
}

const SYSTEM_INSTRUCTION = [
  "You are an authenticity reviewer for a privacy-first dating app.",
  "Return calibrated assessments about whether the primary subject is a real human.",
  "Avoid moral judgments; respond with concise JSON only."
].join(" ");

const ANALYSIS_PROMPT = [
  "Inspect this profile photo and determine how likely it depicts a real human.",
  "Focus on authenticity, relevance, and obvious AI synthesis or mismatches.",
  "Output JSON with fields: verdict ('human' | 'ai' | 'uncertain' | 'not_person'),",
  "humanConfidence (0-1), aiConfidence (0-1), summary (<=240 chars), and flags (string array).",
  "Consider lighting, composition, distortions, extra limbs, irrelevant scenes, or logos.",
  "Report 'not_person' when no clear human subject exists.",
  "Use 'ai' for synthetic/illustrated subjects or manipulated faces.",
  "Use 'uncertain' when unsure. Keep flags short like 'multiple_people' or 'face_obscured'.",
  "Respond with valid JSON only."
].join(" ");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GeminiContentPart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

function extractCandidateText(payload: GeminiResponse): string | null {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    return null;
  }
  const combined = parts
    .map((part) => part?.text ?? "")
    .join("")
    .trim();
  return combined.length > 0 ? combined : null;
}

export async function POST(request: Request) {
  const apiKeyRaw = resolveGeminiApiKey();
  const apiKey = typeof apiKeyRaw === "string" ? apiKeyRaw.trim() : null;
  const apiUrl = resolveGeminiApiUrl();

  if (!apiKey) {
    console.error("Gemini API key missing. Ensure GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY is set.");
    return NextResponse.json(
      {
        error: "Gemini API key not configured.",
        checked: {
          GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
          GOOGLE_API_KEY: Boolean(process.env.GOOGLE_API_KEY),
          NEXT_PUBLIC_GEMINI_API_KEY: Boolean(process.env.NEXT_PUBLIC_GEMINI_API_KEY)
        }
      },
      { status: 503 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const isForm = contentType.includes("multipart/form-data");
    if (!isForm) {
      return NextResponse.json({ error: "Expected form-data payload." }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file for analysis." }, { status: 400 });
    }

    const mimeType =
      (typeof file.type === "string" && file.type.length > 0
        ? file.type
        : "application/octet-stream") || "application/octet-stream";
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const body = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            },
            { text: ANALYSIS_PROMPT }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        top_p: 0.8,
        top_k: 40,
        max_output_tokens: 512,
        response_mime_type: "application/json"
      }
    };

    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Gemini analysis failed.",
          status: upstream.status,
          details
        },
        { status: upstream.status }
      );
    }

    const payload = (await upstream.json()) as GeminiResponse;
    const text = extractCandidateText(payload);

    if (!text) {
      return NextResponse.json(
        {
          error: "Gemini returned an empty response."
        },
        { status: 502 }
      );
    }

    let parsed: PhotoAnalysisVerdict | null = null;
    try {
      parsed = JSON.parse(text) as PhotoAnalysisVerdict;
    } catch (error) {
      console.warn("Gemini JSON parse failed", { text, error });
    }

    if (!parsed) {
      return NextResponse.json(
        {
          error: "Gemini returned non-JSON output.",
          rawText: text
        },
        { status: 502 }
      );
    }

    const sanitized = sanitizePhotoAnalysisVerdict({ ...parsed, rawText: parsed.rawText ?? text });
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Gemini proxy error", error);
    return NextResponse.json(
      {
        error: "Gemini analysis proxy failed.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
