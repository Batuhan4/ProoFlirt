import { describe, expect, it } from "vitest";

import { computeProfileScores, type ProfileScoreSignals } from "./profile-scoring";

const baseSignals: ProfileScoreSignals = {
  bio: "Testing bio content to keep scoring consistent.",
  interests: ["Art", "Music"],
  media: [{ walrusLink: "https://example.com/blob", mimeType: "image/jpeg" }],
  walrusLinks: ["https://example.com/blob"],
  updatedAt: 0
};

describe("computeProfileScores", () => {
  it("boosts trust score when Gemini strongly confirms a human photo", () => {
    const withoutAnalysis = computeProfileScores(baseSignals);
    const withHumanAnalysis = computeProfileScores({
      ...baseSignals,
      photoAnalysis: {
        verdict: "human",
        humanConfidence: 0.92
      }
    });

    expect(withHumanAnalysis.trustScore).toBeGreaterThan(withoutAnalysis.trustScore);
  });

  it("reduces trust score when Gemini flags the photo as AI-generated", () => {
    const withoutAnalysis = computeProfileScores(baseSignals);
    const withAiVerdict = computeProfileScores({
      ...baseSignals,
      photoAnalysis: {
        verdict: "ai",
        humanConfidence: 0.1,
        aiConfidence: 0.87
      }
    });

    expect(withAiVerdict.trustScore).toBeLessThan(withoutAnalysis.trustScore);
  });
});
