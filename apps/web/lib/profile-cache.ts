const STORAGE_KEY = "prooflirt:profile:latest";

export interface CachedMediaItem {
  blobId: string;
  walrusLink: string;
  mimeType: string;
  fileHash?: string;
}

export interface CachedPhotoAnalysis {
  verdict: "human" | "ai" | "uncertain" | "not_person";
  humanConfidence: number;
  aiConfidence?: number;
  summary?: string;
  flags?: string[];
  rawText?: string;
  analyzedAt?: number;
}

export interface CachedProfilePayload {
  address?: string;
  displayName: string;
  handle?: string | null;
  bio: string;
  interests: string[];
  primary?: CachedMediaItem | null;
  gallery?: CachedMediaItem[];
  walrusLinks?: string[];
  trustScore?: number;
  compatibilityScore?: number;
  updatedAt: number;
  photoAnalysis?: CachedPhotoAnalysis | null;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeParse(value: string | null): CachedProfilePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as CachedProfilePayload;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to parse cached profile payload", error);
  }
  return null;
}

export function loadCachedProfile(): CachedProfilePayload | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return safeParse(raw);
  } catch (error) {
    console.warn("Unable to load cached profile", error);
    return null;
  }
}

export function saveCachedProfile(payload: CachedProfilePayload) {
  if (!isBrowser()) return;
  try {
    const existing = loadCachedProfile();
    const merged = {
      ...existing,
      ...payload,
      updatedAt: payload.updatedAt ?? Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.warn("Unable to persist profile cache", error);
  }
}

export function clearCachedProfile() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear cached profile", error);
  }
}
