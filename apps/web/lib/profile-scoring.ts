export type ProfileScoreMedia = {
  walrusLink?: string | null;
  mimeType?: string | null;
};

export type ProfileScoreSignals = {
  bio?: string | null;
  interests?: string[] | null;
  media?: ProfileScoreMedia[] | null;
  walrusLinks?: Array<string | null | undefined> | null;
  updatedAt?: number | null;
};

const clampScore = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

const unique = <T>(values: T[] = []) => Array.from(new Set(values));

export function computeProfileScores(signals: ProfileScoreSignals = {}) {
  const media = signals.media ?? [];
  const interests = signals.interests ?? [];
  const walrusLinks = signals.walrusLinks ?? [];
  const trimmedBio = (signals.bio ?? "").trim();

  const mediaCount = media.length;
  const verifiedMediaCount = media.filter((item) => Boolean(item?.walrusLink)).length;
  const uniqueWalrusLinks = unique(
    walrusLinks
      .filter((link): link is string => Boolean(link) && typeof link === "string")
      .map((link) => link.trim())
      .filter((link) => link.length > 16)
  );
  const uniqueMimeKinds = unique(
    media
      .map((item) => item?.mimeType?.split("/")[0]?.trim().toLowerCase())
      .filter((kind): kind is string => Boolean(kind))
  );
  const interestCount = interests.filter((item) => Boolean(item?.trim())).length;
  const bioLength = trimmedBio.length;
  const now = typeof Date !== "undefined" ? Date.now() : 0;
  const recencyMs = signals.updatedAt ? Math.max(0, now - signals.updatedAt) : null;
  const recencyDays = recencyMs ? recencyMs / (1000 * 60 * 60 * 24) : null;

  let trustScore = 36;
  trustScore += Math.min(verifiedMediaCount * 12, 36);
  trustScore += Math.min(uniqueWalrusLinks.length * 6, 18);
  trustScore += Math.min(interestCount * 3.5, 21);
  if (bioLength > 0) {
    trustScore += Math.min(bioLength / 32, 10);
  }
  if (mediaCount > 1) {
    trustScore += 4;
  }
  if (recencyDays !== null) {
    trustScore += Math.max(0, 10 - Math.min(recencyDays, 10));
  }

  let compatibilityScore = 44;
  compatibilityScore += Math.min(interestCount * 6, 30);
  compatibilityScore += Math.min(uniqueMimeKinds.length * 4, 12);
  compatibilityScore += Math.min(verifiedMediaCount * 5, 20);
  if (bioLength > 0) {
    compatibilityScore += Math.min(bioLength / 45, 12);
  }
  if (mediaCount >= 4) {
    compatibilityScore += 6;
  }

  return {
    trustScore: clampScore(trustScore),
    compatibilityScore: clampScore(compatibilityScore)
  };
}
