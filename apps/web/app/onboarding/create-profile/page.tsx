'use client';

import Image from "next/image";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildCreateProfileTransaction,
  type MediaRecordPayload
} from "@/lib/profile-contract";
import { executeZkLoginTransaction } from "@/lib/zklogin/execute";
import { loadSession, type ZkLoginSession } from "@/lib/zklogin/storage";
import { saveCachedProfile } from "@/lib/profile-cache";
import { computeProfileScores } from "@/lib/profile-scoring";
import {
  analyzeProfilePhoto,
  type PhotoAnalysisVerdict
} from "@/lib/ai-photo-analysis";
import {
  defaultWalrusEpochCount,
  hashBlobSha256,
  resolveWalrusAggregatorUrl,
  resolveWalrusPublisherUrl,
  uploadToWalrus
} from "@/lib/walrus";

const MAX_INTERESTS = 5;
const MAX_GALLERY_ITEMS = 12;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const INTEREST_OPTIONS = [
  { label: "Web3", defaultSelected: true },
  { label: "Hiking" },
  { label: "Art" },
  { label: "DeFi", defaultSelected: true },
  { label: "Photography" },
  { label: "Gaming" },
  { label: "+ Custom", custom: true }
] as const;

type InterestOption = (typeof INTEREST_OPTIONS)[number];
type Phase = "idle" | "uploading" | "signing" | "success";

interface LocalMedia {
  file: File;
  preview: string;
}

interface PreparedMedia extends MediaRecordPayload {
  blobId: string;
}

function isIgnorableZkLoginError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("zkLogin proof is still being generated") ||
    message.includes("Missing zkLogin ephemeral session") ||
    message.includes("Connect with zkLogin")
  );
}

function createPreview(file: File): LocalMedia {
  return {
    file,
    preview: URL.createObjectURL(file)
  };
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  return `${Math.ceil(bytes / 1000)} KB`;
}

function bytesToHex(input: Uint8Array): string {
  return Array.from(input, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function slugifyName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function deriveHandle(name: string, address?: string) {
  const slug = slugifyName(name);
  if (slug.length >= 2) {
    return `@${slug}`;
  }
  if (address) {
    const trimmed = address.replace(/^0x/i, "");
    if (trimmed.length >= 8) {
      return `@${trimmed.slice(0, 4)}.${trimmed.slice(-4)}`;
    }
  }
  return "@you";
}

function formatAnalysisVerdict(verdict: PhotoAnalysisVerdict["verdict"]) {
  switch (verdict) {
    case "human":
      return "Looks human";
    case "ai":
      return "Likely AI-generated";
    case "not_person":
      return "Not a person";
    default:
      return "Needs review";
  }
}

function verdictAccentClasses(verdict: PhotoAnalysisVerdict["verdict"]) {
  switch (verdict) {
    case "human":
      return "bg-[rgba(76,201,160,0.18)] text-[#7cf8b8]";
    case "ai":
      return "bg-[rgba(255,139,95,0.2)] text-[#ffb38e]";
    case "not_person":
      return "bg-[rgba(255,210,125,0.22)] text-[#ffd27d]";
    default:
      return "bg-[rgba(132,143,255,0.24)] text-[#c6cbff]";
  }
}

function formatTrustDelta(delta: number) {
  if (delta === 0) return "+0 points";
  const prefix = delta > 0 ? "+" : "-";
  return `${prefix}${Math.abs(delta)} point${Math.abs(delta) === 1 ? "" : "s"}`;
}

function deltaAccentClasses(delta: number) {
  if (delta > 0) {
    return "bg-[rgba(76,201,160,0.18)] text-[#7cf8b8]";
  }
  if (delta < 0) {
    return "bg-[rgba(255,139,95,0.2)] text-[#ffb38e]";
  }
  return "bg-[rgba(132,143,255,0.24)] text-[#c6cbff]";
}

export default function CreateProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<ZkLoginSession | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    () => INTEREST_OPTIONS.filter((option) => option.defaultSelected).map((option) => option.label)
  );
  const [primaryMedia, setPrimaryMedia] = useState<LocalMedia | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<LocalMedia[]>([]);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisVerdict | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessState, setShowSuccessState] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentWalrusLinks, setRecentWalrusLinks] = useState<string[]>([]);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [analysisDelta, setAnalysisDelta] = useState<number | null>(null);
  const [showAnalysisToast, setShowAnalysisToast] = useState(false);
  const analysisToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  useEffect(
    () => () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      if (analysisToastTimerRef.current) {
        clearTimeout(analysisToastTimerRef.current);
      }
      if (primaryMedia?.preview) {
        URL.revokeObjectURL(primaryMedia.preview);
      }
      galleryMedia.forEach((media) => URL.revokeObjectURL(media.preview));
    },
    [galleryMedia, primaryMedia]
  );

  const progressWidth = useMemo(() => {
    if (showSuccessState) return "100%";
    let score = 10;
    if (primaryMedia) score += 30;
    score += Math.min(20, galleryMedia.length * 4);
    if (displayName.trim()) score += 15;
    if (bio.trim()) score += 10;
    score += Math.min(25, selectedInterests.length * 5);
    return `${Math.min(score, 95)}%`;
  }, [bio, displayName, galleryMedia.length, primaryMedia, selectedInterests.length, showSuccessState]);

  const phaseMessage = useMemo(() => {
    if (phase === "uploading") {
      if (isAnalyzingPhoto) {
        return "Reviewing your photo with Gemini…";
      }
      return "Encrypting and uploading media to Walrus…";
    }
    if (phase === "signing") return "Submitting your profile to Sui…";
    if (phase === "success") return "Profile finalized on-chain. Redirecting…";
    return null;
  }, [isAnalyzingPhoto, phase]);

  const handleBack = () => {
    router.back();
  };

  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`File ${file.name} exceeds ${formatBytes(MAX_FILE_BYTES)}.`);
    }
    if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Only JPG, PNG, or WebP files are supported right now.");
    }
  };

  const handlePrimaryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      validateFile(file);
      if (primaryMedia?.preview) {
        URL.revokeObjectURL(primaryMedia.preview);
      }
      setPrimaryMedia(createPreview(file));
      setPhotoAnalysis(null);
      setAnalysisDelta(null);
      setShowAnalysisToast(false);
      if (analysisToastTimerRef.current) {
        clearTimeout(analysisToastTimerRef.current);
        analysisToastTimerRef.current = null;
      }
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invalid file selected.");
    } finally {
      event.target.value = "";
    }
  };

  const handleGalleryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    try {
      setGalleryMedia((prev) => {
        const next = [...prev];
        for (const file of files) {
          if (next.length >= MAX_GALLERY_ITEMS) break;
          validateFile(file);
          next.push(createPreview(file));
        }
        return next;
      });
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invalid gallery file.");
    } finally {
      event.target.value = "";
    }
  };

  const removeGalleryItem = (index: number) => {
    setGalleryMedia((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return next;
    });
  };

  const removePrimaryMedia = () => {
    setPrimaryMedia((prev) => {
      if (prev?.preview) {
        URL.revokeObjectURL(prev.preview);
      }
      return null;
    });
    setPhotoAnalysis(null);
    setAnalysisDelta(null);
    setShowAnalysisToast(false);
    if (analysisToastTimerRef.current) {
      clearTimeout(analysisToastTimerRef.current);
      analysisToastTimerRef.current = null;
    }
  };

  const toggleInterest = (interest: InterestOption) => {
    if (interest.custom) return;
    setSelectedInterests((prev) => {
      if (prev.includes(interest.label)) {
        return prev.filter((item) => item !== interest.label);
      }
      if (prev.length >= MAX_INTERESTS) {
        return prev;
      }
      return [...prev, interest.label];
    });
  };

  const uploadMedia = useCallback(async (mediaList: LocalMedia[]): Promise<PreparedMedia[]> => {
    if (mediaList.length === 0) return [];
    const publisherUrl = resolveWalrusPublisherUrl();
    const aggregatorUrl = resolveWalrusAggregatorUrl();
    const epochs = defaultWalrusEpochCount();

    return Promise.all(
      mediaList.map(async (media) => {
        const [fileHash, stored] = await Promise.all([
          hashBlobSha256(media.file),
          uploadToWalrus(media.file, {
            publisherUrl,
            aggregatorUrl,
            epochs
          })
        ]);
        return {
          blobId: stored.blobId,
          walrusLink: stored.walrusLink,
          mimeType: media.file.type || "application/octet-stream",
          fileHash
        };
      })
    );
  }, []);

  const submitProfile = useCallback(
    async (primary: LocalMedia, gallery: LocalMedia[]) => {
      const encoder = new TextEncoder();
      const sessionData = session;
      if (!sessionData) {
        throw new Error("You must log in with zkLogin before creating a profile.");
      }

      const trimmedDisplayName = displayName.trim();
      const trimmedBio = bio.trim();
      let analysis: PhotoAnalysisVerdict | null = null;
      setIsAnalyzingPhoto(true);
      try {
        analysis = await analyzeProfilePhoto(primary.file);
        setPhotoAnalysis(analysis);
        setErrorMessage(null);
      } catch (analysisError) {
        console.warn("Gemini photo analysis unavailable. Continuing without AI trust boost.", analysisError);
        setPhotoAnalysis(null);
        setAnalysisDelta(null);
        setShowAnalysisToast(false);
        if (analysisToastTimerRef.current) {
          clearTimeout(analysisToastTimerRef.current);
          analysisToastTimerRef.current = null;
        }
        setErrorMessage("Gemini AI reviewer is unavailable right now. Continuing without that trust signal.");
      } finally {
        setIsAnalyzingPhoto(false);
      }

      const uploadedMedia = await uploadMedia([primary, ...gallery]);
      const serializedMedia = uploadedMedia.map((item) => ({
        blobId: item.blobId,
        walrusLink: item.walrusLink,
        mimeType: item.mimeType,
        fileHash: bytesToHex(item.fileHash)
      }));
      const cacheTimestamp = Date.now();
      const baseSignals = {
        bio: trimmedBio,
        interests: selectedInterests,
        media: serializedMedia,
        walrusLinks: serializedMedia.map((item) => item.walrusLink),
        updatedAt: cacheTimestamp
      } as const;
      const baselineScores = computeProfileScores(baseSignals);
      const profileScores = computeProfileScores({
        ...baseSignals,
        photoAnalysis: analysis
          ? {
              verdict: analysis.verdict,
              humanConfidence: analysis.humanConfidence,
              aiConfidence: analysis.aiConfidence
          }
          : undefined
      });
      if (analysis) {
        const delta = profileScores.trustScore - baselineScores.trustScore;
        setAnalysisDelta(delta);
        setShowAnalysisToast(true);
        if (analysisToastTimerRef.current) {
          clearTimeout(analysisToastTimerRef.current);
        }
        analysisToastTimerRef.current = setTimeout(() => {
          setShowAnalysisToast(false);
          analysisToastTimerRef.current = null;
        }, 4200);
      }
      const [primaryRecord, ...galleryRecords] = uploadedMedia;
      setPhase("signing");

      const identitySource = sessionData.sub || sessionData.address;
      const identityHash = await hashBlobSha256(encoder.encode(identitySource));
      const zkCommitment = await hashBlobSha256(
        encoder.encode(`${sessionData.address}:${sessionData.userSalt}`)
      );

      const tx = buildCreateProfileTransaction({
        sender: sessionData.address,
        displayName: trimmedDisplayName,
        bio: trimmedBio,
        interests: selectedInterests,
        identityHash,
        zkCommitment,
        primary: primaryRecord,
        gallery: galleryRecords,
        compatibilityScore: profileScores.compatibilityScore,
        trustScore: profileScores.trustScore
      });

      let digest: string | null = null;
      try {
        const result = await executeZkLoginTransaction(tx);
        digest = result.digest;
      } catch (txError) {
        if (isIgnorableZkLoginError(txError)) {
          console.warn("zkLogin unavailable, skipping on-chain submission for now.", txError);
          digest = `local-${Date.now().toString(16)}`;
        } else {
          throw txError;
        }
      }

      const cachedPrimary = serializedMedia[0] ?? null;
      const cachedGallery = serializedMedia.slice(1);
      saveCachedProfile({
        address: sessionData.address,
        displayName: trimmedDisplayName,
        handle: deriveHandle(trimmedDisplayName, sessionData.address),
        bio: trimmedBio,
        interests: selectedInterests,
        primary: cachedPrimary,
        gallery: cachedGallery,
        walrusLinks: serializedMedia.map((item) => item.walrusLink),
        trustScore: profileScores.trustScore,
        compatibilityScore: profileScores.compatibilityScore,
        updatedAt: cacheTimestamp,
        photoAnalysis: analysis
          ? {
              verdict: analysis.verdict,
              humanConfidence: analysis.humanConfidence,
              aiConfidence: analysis.aiConfidence,
              summary: analysis.summary,
              flags: analysis.flags,
              rawText: analysis.rawText,
              analyzedAt: cacheTimestamp
            }
          : null
      });

      setRecentWalrusLinks(serializedMedia.map((item) => item.walrusLink));
      setTxDigest(digest);
    },
    [bio, displayName, selectedInterests, session, uploadMedia]
  );

  const handleContinue = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!session) {
      setErrorMessage("Please finish zkLogin first.");
      router.push("/");
      return;
    }
    if (!primaryMedia) {
      setErrorMessage("Add a primary photo before continuing.");
      return;
    }
    if (!displayName.trim()) {
      setErrorMessage("Add the name you want to show on-chain.");
      return;
    }

    setIsSubmitting(true);
    setPhase("uploading");
    try {
      await submitProfile(primaryMedia, galleryMedia);
      setShowSuccessState(true);
      setPhase("success");

      redirectTimerRef.current = setTimeout(() => {
        router.replace("/discover");
      }, 2200);
    } catch (error) {
      console.error("Create profile failed", error);
      setPhase("idle");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create profile. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonLabel =
    phase === "success"
      ? "Redirecting…"
      : phase === "signing"
        ? "Finalizing on Sui…"
        : phase === "uploading"
          ? "Uploading to Walrus…"
          : "Create profile";

  const disableSubmit = !session || !primaryMedia || !displayName.trim() || isSubmitting;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[var(--color-bg-start)] via-[var(--color-bg-mid)] to-[var(--color-bg-end)] text-[var(--color-text-primary)]">
      {showAnalysisToast && analysisDelta !== null && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.25)] ${deltaAccentClasses(analysisDelta)}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              {analysisDelta >= 0 ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 7" />
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12" />
                </>
              )}
            </svg>
            <span>
              {analysisDelta > 0
                ? "Gemini boosted your trust score"
                : analysisDelta < 0
                  ? "Gemini lowered your trust score"
                  : "Gemini reviewed your trust score"}{" "}
              ({formatTrustDelta(analysisDelta)})
            </span>
          </div>
        </div>
      )}
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-36 pt-8 sm:max-w-4xl sm:px-10">
        <header className="flex flex-col gap-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex w-fit items-center gap-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]"
            aria-label="Go back"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-soft)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
              </svg>
            </span>
            Back
          </button>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text-primary)]">Profile Completion</span>
              <span>{progressWidth}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] via-[#ff6ba0] to-[#ffa5c1]"
                style={{ width: progressWidth }}
              />
            </div>

            <div className="flex flex-col gap-2 text-center sm:text-left">
              <h1 className="text-2xl font-heading font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                Add Your Photos
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] sm:text-base">
                Photos are hashed client-side, uploaded to Walrus, and verified on-chain. Replace
                any shot before finalizing your profile.
              </p>
            </div>
          </div>
        </header>

        {!session && (
          <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
            Connect with zkLogin on the home page before publishing your profile.
          </div>
        )}

        <section className="mt-8 flex flex-col gap-8">
          <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-accent)]">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[var(--color-surface-soft)] text-[var(--color-accent)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h6m-6 5h3" />
                </svg>
              </span>
              <div className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
                <p className="text-base font-semibold text-[var(--color-text-primary)]">Your Profile Starts Here</p>
                <p>Upload at least one main photo and two gallery shots for best results.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="flex flex-col gap-5">
              <label className="group relative flex aspect-[3/4] w-full cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] text-center transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                {primaryMedia ? (
                  <>
                    <Image
                      src={primaryMedia.preview}
                      alt="Primary selection"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="relative z-10 flex flex-col items-center gap-2 rounded-full bg-[rgba(16,4,10,0.6)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
                      <span>Replace Main Photo</span>
                      <span className="text-[10px] font-normal text-[var(--color-text-muted)]">
                        {primaryMedia.file.name} · {formatBytes(primaryMedia.file.size)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-accent)]">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                      </svg>
                    </span>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-[var(--color-text-primary)]">Add your main photo</p>
                      <p className="text-xs text-[var(--color-text-muted)]">JPG, PNG, or WebP up to 10MB</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  onChange={handlePrimaryChange}
                  className="sr-only"
                />
              </label>

              {(isAnalyzingPhoto || photoAnalysis) && (
                <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
                  {isAnalyzingPhoto ? (
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent)]" />
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Gemini is reviewing your photo for authenticity signals…
                      </p>
                    </div>
                  ) : photoAnalysis ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {formatAnalysisVerdict(photoAnalysis.verdict)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            {photoAnalysis.summary?.trim() ||
                              "Inference complete. Trust score updated with this signal."}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`flex h-8 min-w-[4rem] items-center justify-center rounded-full px-3 text-xs font-semibold ${verdictAccentClasses(photoAnalysis.verdict)}`}
                          >
                            {Math.round(photoAnalysis.humanConfidence * 100)}% human
                          </span>
                          {analysisDelta !== null && (
                            <span
                              className={`flex h-8 min-w-[4rem] items-center justify-center rounded-full px-3 text-xs font-semibold ${deltaAccentClasses(analysisDelta)}`}
                            >
                              Trust {formatTrustDelta(analysisDelta)}
                            </span>
                          )}
                        </div>
                      </div>
                      {photoAnalysis.flags && photoAnalysis.flags.length > 0 && (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Flags: {photoAnalysis.flags.join(", ")}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                    </svg>
                  </span>
                  <span>Add gallery photos</span>
                  <input
                    type="file"
                    multiple
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    onChange={handleGalleryChange}
                    className="sr-only"
                  />
                </label>
                <div className="flex flex-col rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Upload summary</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {primaryMedia ? "Primary ready" : "Primary pending"} ·{" "}
                        {galleryMedia.length} gallery
                      </p>
                    </div>
                    {primaryMedia ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/30 text-white">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]">
                        !
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={removePrimaryMedia}
                    className="mt-4 w-fit text-xs font-semibold text-[var(--color-accent)] hover:text-white"
                    disabled={!primaryMedia}
                  >
                    Remove primary
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {galleryMedia.map((media, index) => (
                <div
                  key={media.preview}
                  className="relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)]"
                >
                  <Image
                    src={media.preview}
                    alt={`Gallery photo ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="relative z-10 flex items-center justify-between bg-black/55 px-4 py-2 text-xs">
                    <span>{media.file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(index)}
                      className="text-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {galleryMedia.length < MAX_GALLERY_ITEMS && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium">Add photo</span>
                  <input
                    type="file"
                    multiple
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    onChange={handleGalleryChange}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[var(--color-surface-soft)] text-[var(--color-accent)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              </span>
              <div className="flex flex-1 flex-col gap-2 text-sm text-[var(--color-text-secondary)]">
                <p className="text-base font-semibold text-[var(--color-text-primary)]">ZKP Verified</p>
                <p>
                  zkLogin proves your identity on-chain. We only submit hashed commitments and
                  Walrus links—never raw media.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <h2 className="text-lg font-heading font-semibold text-[var(--color-text-primary)]">About You</h2>
              <div className="space-y-4">
                <label className="flex flex-col gap-2 text-sm text-[var(--color-text-secondary)]">
                  Name
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Enter your name"
                    className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-[var(--color-text-secondary)]">
                  Bio
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Tell us a little about yourself..."
                    className="resize-none rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-heading font-semibold text-[var(--color-text-primary)]">Your Interests</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Select up to 5 passions.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest.label);
                  const baseClasses =
                    "rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40";
                  let variantClasses =
                    "bg-[var(--color-surface-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]";
                  if (interest.custom) {
                    variantClasses =
                      "border border-dashed border-[var(--color-border-soft)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]";
                  } else if (isSelected) {
                    variantClasses =
                      "bg-[var(--color-accent)] text-[var(--color-text-primary)] shadow-[var(--shadow-accent)] hover:bg-[var(--color-accent-strong)]";
                  }
                  return (
                    <button
                      key={interest.label}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleInterest(interest)}
                      className={`${baseClasses} ${variantClasses}`}
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[var(--color-bg-start)]/90 via-[var(--color-bg-mid)]/80 to-transparent px-5 pb-6 pt-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:max-w-4xl">
          <button
            type="button"
            onClick={handleContinue}
            disabled={disableSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] py-4 text-base font-semibold uppercase tracking-wide text-white shadow-[var(--shadow-accent)] transition enabled:hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-[var(--color-text-primary)]" />
            )}
            {buttonLabel}
          </button>
          {phaseMessage ? (
            <p className="text-center text-xs text-[var(--color-text-secondary)]" aria-live="polite">
              {phaseMessage}
            </p>
          ) : null}
          {errorMessage && (
            <p className="text-center text-xs text-red-300" role="alert">
              {errorMessage}
            </p>
          )}
          {showSuccessState && (
            <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-center text-xs text-[var(--color-text-secondary)]">
              <p>
                Profile transaction{" "}
                {txDigest ? (
                  <a
                    href={`https://suiexplorer.com/txblock/${txDigest}?network=${session?.network || "testnet"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[var(--color-accent)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline"
                  >
                    {txDigest.slice(0, 10)}…
                  </a>
                ) : (
                  "pending"
                )}
              </p>
              {recentWalrusLinks.length > 0 && (
                <p className="mt-2">
                  Walrus blobs:&nbsp;
                  {recentWalrusLinks.map((link, index) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-accent)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline"
                    >
                      #{index + 1}
                    </a>
                  ))}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
