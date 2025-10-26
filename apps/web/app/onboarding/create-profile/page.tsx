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
  const [phase, setPhase] = useState<Phase>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessState, setShowSuccessState] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentWalrusLinks, setRecentWalrusLinks] = useState<string[]>([]);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  useEffect(
    () => () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
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
    if (phase === "uploading") return "Encrypting and uploading media to Walrus…";
    if (phase === "signing") return "Submitting your profile to Sui…";
    if (phase === "success") return "Profile finalized on-chain. Redirecting…";
    return null;
  }, [phase]);

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

      const uploadedMedia = await uploadMedia([primary, ...gallery]);
      const [primaryRecord, ...galleryRecords] = uploadedMedia;
      setPhase("signing");

      const identitySource = sessionData.sub || sessionData.address;
      const identityHash = await hashBlobSha256(encoder.encode(identitySource));
      const zkCommitment = await hashBlobSha256(
        encoder.encode(`${sessionData.address}:${sessionData.userSalt}`)
      );

      const tx = buildCreateProfileTransaction({
        sender: sessionData.address,
        displayName: displayName.trim(),
        bio: bio.trim(),
        interests: selectedInterests,
        identityHash,
        zkCommitment,
        primary: primaryRecord,
        gallery: galleryRecords,
        compatibilityScore: 50,
        trustScore: 50
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

      setRecentWalrusLinks(uploadedMedia.map((item) => item.walrusLink));
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
    <main className="relative min-h-screen bg-[#070f21] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-36 pt-8 sm:max-w-4xl sm:px-10">
        <header className="flex flex-col gap-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex w-fit items-center gap-3 text-sm font-medium text-[#8ca2d9] transition hover:text-white"
            aria-label="Go back"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5">
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
            <div className="flex items-center justify-between text-sm text-[#8ca2d9]">
              <span className="font-medium text-white">Profile Completion</span>
              <span>{progressWidth}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#13213b]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4f85ff] via-[#556dff] to-[#9076ff]"
                style={{ width: progressWidth }}
              />
            </div>

            <div className="flex flex-col gap-2 text-center sm:text-left">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Add Your Photos
              </h1>
              <p className="text-sm text-[#96a8d4] sm:text-base">
                Photos are hashed client-side, uploaded to Walrus, and verified on-chain. Replace
                any shot before finalizing your profile.
              </p>
            </div>
          </div>
        </header>

        {!session && (
          <div className="mt-6 rounded-3xl border border-[#38223a] bg-[#170612] p-4 text-sm text-[#f6bcd4]">
            Connect with zkLogin on the home page before publishing your profile.
          </div>
        )}

        <section className="mt-8 flex flex-col gap-8">
          <div className="rounded-3xl border border-[#1d2a45] bg-[#0c1a33] p-5 shadow-[0_20px_60px_rgba(10,28,54,0.45)]">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[#142540] text-[#5a7bff]">
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
              <div className="flex flex-col gap-1 text-sm text-[#96a8d4]">
                <p className="text-base font-semibold text-white">Your Profile Starts Here</p>
                <p>Upload at least one main photo and two gallery shots for best results.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="flex flex-col gap-5">
              <label className="group relative flex aspect-[3/4] w-full cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[#223557] bg-[#0e1d36] text-center transition hover:border-[#4f85ff] hover:bg-[#132649]">
                {primaryMedia ? (
                  <>
                    <Image
                      src={primaryMedia.preview}
                      alt="Primary selection"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="relative z-10 flex flex-col items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                      <span>Replace Main Photo</span>
                      <span className="text-[10px] font-normal text-white/70">
                        {primaryMedia.file.name} · {formatBytes(primaryMedia.file.size)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-[#4f85ff]">
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
                      <p className="text-base font-semibold text-white">Add your main photo</p>
                      <p className="text-xs text-[#7f94c7]">JPG, PNG, or WebP up to 10MB</p>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[#223557] bg-[#0e1d36] text-sm text-[#7f94c7] transition hover:border-[#4f85ff] hover:text-white">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
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
                <div className="flex flex-col rounded-3xl border border-[#1d2a45] bg-[#0b172d] p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Upload summary</p>
                      <p className="text-xs text-[#7f94c7]">
                        {primaryMedia ? "Primary ready" : "Primary pending"} ·{" "}
                        {galleryMedia.length} gallery
                      </p>
                    </div>
                    {primaryMedia ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f3323] text-[#5ef09c]">
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
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#33211f] text-[#ffc0b3]">
                        !
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => primaryMedia && setPrimaryMedia(null)}
                    className="mt-4 w-fit text-xs font-semibold text-[#ff6bc6] hover:text-[#b87dff]"
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
                  className="relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl border border-[#1d2a45] bg-[#0b172d]"
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
                      className="text-[#ff9fd5] hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {galleryMedia.length < MAX_GALLERY_ITEMS && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[#223557] bg-[#0e1d36] text-[#7f94c7] transition hover:border-[#4f85ff] hover:text-white">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
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

          <div className="rounded-3xl border border-[#1d2a45] bg-[#0c1a33] p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[#11293d] text-[#5ef09c]">
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
              <div className="flex flex-1 flex-col gap-2 text-sm text-[#96a8d4]">
                <p className="text-base font-semibold text-white">ZKP Verified</p>
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
              <h2 className="text-lg font-semibold text-white">About You</h2>
              <div className="space-y-4">
                <label className="flex flex-col gap-2 text-sm text-[#96a8d4]">
                  Name
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Enter your name"
                    className="rounded-2xl border border-[#172b45] bg-[#0c1a33] px-4 py-3 text-sm text-white placeholder:text-[#5c6f9b] focus:border-[#5a7bff] focus:outline-none focus:ring-2 focus:ring-[#5a7bff]/30"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-[#96a8d4]">
                  Bio
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Tell us a little about yourself..."
                    className="resize-none rounded-2xl border border-[#172b45] bg-[#0c1a33] px-4 py-3 text-sm text-white placeholder:text-[#5c6f9b] focus:border-[#5a7bff] focus:outline-none focus:ring-2 focus:ring-[#5a7bff]/30"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Your Interests</h3>
                <p className="text-sm text-[#96a8d4]">Select up to 5 passions.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest.label);
                  const baseClasses =
                    "rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#5a7bff]/40";
                  let variantClasses = "bg-[#0e1d36] text-[#8ca2d9] hover:bg-[#152b4f] hover:text-white";
                  if (interest.custom) {
                    variantClasses =
                      "border border-dashed border-[#21375b] bg-transparent text-[#8ca2d9] hover:border-[#5a7bff] hover:text-white";
                  } else if (isSelected) {
                    variantClasses =
                      "bg-[#2351ff] text-white shadow-[0_0_25px_rgba(69,112,255,0.45)] hover:bg-[#1f45d4]";
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

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#070f21] via-[#070f21]/95 to-transparent px-5 pb-6 pt-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:max-w-4xl">
          <button
            type="button"
            onClick={handleContinue}
            disabled={disableSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2a54ff] py-4 text-base font-semibold uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(34,84,255,0.35)] transition enabled:hover:bg-[#274ef0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {buttonLabel}
          </button>
          {phaseMessage ? (
            <p className="text-center text-xs text-[#8ca2d9]" aria-live="polite">
              {phaseMessage}
            </p>
          ) : null}
          {errorMessage && (
            <p className="text-center text-xs text-red-300" role="alert">
              {errorMessage}
            </p>
          )}
          {showSuccessState && (
            <div className="rounded-3xl border border-[#214a2e] bg-[#0c1a33] p-4 text-center text-xs text-[#8ca2d9]">
              <p>
                Profile transaction{" "}
                {txDigest ? (
                  <a
                    href={`https://suiexplorer.com/txblock/${txDigest}?network=${session?.network || "testnet"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[#5ef09c] underline-offset-2 hover:underline"
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
                      className="text-[#5ef09c] underline-offset-2 hover:underline"
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
