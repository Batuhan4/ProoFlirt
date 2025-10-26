'use client';

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { loadCachedProfile, type CachedProfilePayload } from "@/lib/profile-cache";
import { computeProfileScores } from "@/lib/profile-scoring";
import { normalizeWalrusLink } from "@/lib/walrus";

type ProfileStat = {
  label: string;
  value: string;
  sublabel?: string;
  accent?: string;
};

type ProofBadge = {
  id: string;
  title: string;
  description: string;
  status: "valid" | "requested" | "pending";
  updatedAt: string;
};

type MediaItem = {
  id: string;
  alt: string;
  src?: string;
  walrusLink?: string;
};

type TimelineEvent = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  proofId?: string;
};

type NavKey = "swipe" | "profile" | "messages" | "meetups" | "edit";

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  active?: boolean;
  disabled?: boolean;
  hideOnMobileNav?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: "swipe", label: "Swipe", href: "/discover" },
  { key: "profile", label: "Profile", href: "/profile" },
  { key: "messages", label: "DMs", href: "/messages" },
  { key: "meetups", label: "Meetups", href: "#", disabled: true },
  {
    key: "edit",
    label: "Edit profile",
    href: "/onboarding/create-profile",
    hideOnMobileNav: true
  }
];

const NavIcon: Record<Exclude<NavKey, "edit">, (className?: string) => JSX.Element> = {
  swipe: (className) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0 4-4m-4 4-4-4M5 9l4-4m6 0 4 4" />
    </svg>
  ),
  profile: (className) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0 1 14 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  ),
  messages: (className) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-9 8v-4a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4l-4-3H6l-4 3Z" />
    </svg>
  ),
  meetups: (className) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h14M5 12h14M5 18h8" />
    </svg>
  )
};

const WALRUS_MEDIA_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0'%25 y1='0'%25 x2='100'%25 y2='100'%25%3E%3Cstop offset='0'%25 stop-color='%23ff1f7a'/%3E%3Cstop offset='100'%25 stop-color='%23ff9bbc'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='160' height='160' fill='url(%23g)'/%3E%3Cpath d='M46 104l20-28 20 18 28-38 16 24v32H46z' fill='%23ffffff' fill-opacity='.35'/%3E%3Ccircle cx='72' cy='62' r='12' fill='%23ffe7f3' fill-opacity='.6'/%3E%3C/svg%3E";

function resolveMediaSrc(item: MediaItem | undefined): string {
  if (!item) {
    return WALRUS_MEDIA_PLACEHOLDER;
  }
  return normalizeWalrusLink(item.walrusLink) ?? item.src ?? WALRUS_MEDIA_PLACEHOLDER;
}

function formatRelativeTime(timestamp?: number) {
  if (!timestamp) return null;
  const delta = Date.now() - timestamp;
  if (Number.isNaN(delta) || delta < 0) return null;

  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} wk${weeks > 1 ? "s" : ""} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo${months > 1 ? "s" : ""} ago`;

  const years = Math.floor(days / 365);
  return `${years} yr${years > 1 ? "s" : ""} ago`;
}

const FALLBACK_PROFILE = {
  name: "Nova Hash",
  handle: "@nova.hash",
  pronouns: "she/her",
  location: "Lisbon, Portugal",
  headline: "Designing ZK social graphs • Researching trust primitives for safer IRL meetups.",
  trustTrend: "+4 trust points this week",
  lastOnline: "Online · 12 mins ago",
  suiObjectId: "0x6d39...19fa",
  walrusAggregator: "https://aggregator.walrus.xyz/v1/blobs/2b0d...nova",
  summary:
    "Founder of a privacy collective, experimenting with zk-location proofs for community events. Looking to co-design the next wave of human-first coordination tools.",
  interests: ["ZK DAO Ops", "Analog Synths", "Trail Running", "Coffee Protocols"]
};

const proofBadges: ProofBadge[] = [
  {
    id: "zk-login",
    title: "ZK Login – human verified",
    description: "Bi-weekly humanness proof minted via Sui zkLogin.",
    status: "valid",
    updatedAt: "2h ago"
  },
  {
    id: "ai-moderation",
    title: "AI moderation passed",
    description: "Profile media reviewed by on-device diffusion filter.",
    status: "valid",
    updatedAt: "4 days ago"
  },
  {
    id: "location-proof",
    title: "Lisbon meetup proof requested",
    description: "Awaiting counterpart confirmation for zk-location stamp.",
    status: "pending",
    updatedAt: "Awaiting response"
  }
];

const FALLBACK_MEDIA_GALLERY: MediaItem[] = [
  {
    id: "profile-main",
    alt: "Nova standing near the Tejo river at sunset",
    src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    walrusLink: FALLBACK_PROFILE.walrusAggregator
  },
  {
    id: "profile-meetup",
    alt: "Photo from a zero-knowledge meetup whiteboard session",
    src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/4cc1...meetup"
  },
  {
    id: "profile-run",
    alt: "Trail running group selfie",
    src: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=900&q=80",
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/8aa1...trail"
  }
];

const timeline: TimelineEvent[] = [
  {
    id: "meetup-1",
    title: "Confirmed: zkLisbon cowork sprint",
    description: "Co-hosted a builders session; 18 participants staked attendance.",
    timestamp: "48h ago",
    proofId: "walrus:4cc1...meetup"
  },
  {
    id: "message-boost",
    title: "Trust boost received",
    description: "Ash (0x2d...90c) endorsed your onboarding tour.",
    timestamp: "3 days ago"
  },
  {
    id: "location-proof",
    title: "Requested zk-location stamp",
    description: "Shared QR proof with Mira to verify joint art crawl.",
    timestamp: "1 week ago",
    proofId: "pending"
  }
];

const statusAccent: Record<ProofBadge["status"], string> = {
  valid: "bg-[rgba(76,201,160,0.18)] text-[#7cf8b8]",
  requested: "bg-[rgba(255,139,95,0.2)] text-[#ffb38e]",
  pending: "bg-[rgba(255,210,125,0.22)] text-[#ffd27d]"
};

export default function ProfilePage() {
  const [cachedProfile] = useState<CachedProfilePayload | null>(() => loadCachedProfile());

  const profileScores = useMemo(() => {
    if (!cachedProfile) {
      return null;
    }

    const mediaItems = [
      ...(cachedProfile.primary ? [cachedProfile.primary] : []),
      ...(cachedProfile.gallery ?? [])
    ];

    return computeProfileScores({
      bio: cachedProfile.bio,
      interests: cachedProfile.interests,
      media: mediaItems,
      walrusLinks: cachedProfile.walrusLinks ?? mediaItems.map((item) => item.walrusLink),
      updatedAt: cachedProfile.updatedAt
    });
  }, [cachedProfile]);

  const navItems = NAV_ITEMS.map((item) =>
    item.key === "profile" ? { ...item, active: true } : item
  );
  const bottomNav = navItems.filter((item) => item.key !== "edit");
  const desktopNav = navItems.filter((item) => !item.hideOnMobileNav);

  const profileData = useMemo(() => {
    if (!cachedProfile) {
      return FALLBACK_PROFILE;
    }

    const trimmedBio = (cachedProfile.bio || "").trim();
    const relative = formatRelativeTime(cachedProfile.updatedAt);
    const trustValue = profileScores?.trustScore ?? cachedProfile.trustScore;
    const trustTrend = relative
      ? `Synced ${relative}`
      : typeof trustValue === "number"
        ? `Trust score ${trustValue}`
        : FALLBACK_PROFILE.trustTrend;

    return {
      ...FALLBACK_PROFILE,
      name: cachedProfile.displayName || FALLBACK_PROFILE.name,
      handle: cachedProfile.handle || FALLBACK_PROFILE.handle,
      headline: trimmedBio || FALLBACK_PROFILE.headline,
      summary: trimmedBio || FALLBACK_PROFILE.summary,
      interests:
        cachedProfile.interests && cachedProfile.interests.length > 0
          ? cachedProfile.interests
          : FALLBACK_PROFILE.interests,
      walrusAggregator:
        cachedProfile.primary?.walrusLink ?? FALLBACK_PROFILE.walrusAggregator,
      trustTrend,
      lastOnline: relative ? `Active ${relative}` : FALLBACK_PROFILE.lastOnline
    };
  }, [cachedProfile, profileScores]);

  const stats = useMemo<ProfileStat[]>(() => {
    if (!cachedProfile) {
      return [
        {
          label: "Match score",
          value: "87%",
          sublabel: "ZK compatibility snapshot",
          accent: "text-[var(--color-accent)]"
        },
        {
          label: "Trust score",
          value: "94",
          sublabel: profileData.trustTrend,
          accent: "text-[#10b981]"
        },
        {
          label: "Meetup attestations",
          value: "12",
          sublabel: "QR check-ins verified"
        },
        {
          label: "Proof freshness",
          value: "2h",
          sublabel: "Last identity challenge"
        }
      ];
    }

    const compatibility = Math.round(
      profileScores?.compatibilityScore ?? cachedProfile.compatibilityScore ?? 50
    );
    const trustScore = Math.round(profileScores?.trustScore ?? cachedProfile.trustScore ?? 50);
    const relative = formatRelativeTime(cachedProfile.updatedAt);
    return [
      {
        label: "Match score",
        value: `${compatibility}%`,
        sublabel: "ZK compatibility snapshot",
        accent: "text-[var(--color-accent)]"
      },
      {
        label: "Trust score",
        value: String(trustScore),
        sublabel: relative ? `Synced ${relative}` : profileData.trustTrend,
        accent: "text-[#10b981]"
      },
      {
        label: "Meetup attestations",
        value: "12",
        sublabel: "QR check-ins verified"
      },
      {
        label: "Proof freshness",
        value: relative ?? "2h",
        sublabel: relative ? "Last cache update" : "Last identity challenge"
      }
    ];
  }, [cachedProfile, profileData.trustTrend, profileScores]);

  const mediaGallery = useMemo<MediaItem[]>(() => {
    if (!cachedProfile) {
      return FALLBACK_MEDIA_GALLERY;
    }

    const fallback = FALLBACK_MEDIA_GALLERY;
    const items: MediaItem[] = [];

    if (cachedProfile.primary) {
      items.push({
        id: cachedProfile.primary.blobId || "primary",
        alt: `${cachedProfile.displayName || "Profile"} primary media`,
        walrusLink: cachedProfile.primary.walrusLink,
        src: cachedProfile.primary.walrusLink || fallback[0]?.src
      });
    }

    cachedProfile.gallery?.forEach((media, index) => {
      const fallbackIndex = (index + 1) % fallback.length;
      items.push({
        id: media.blobId || `gallery-${index}`,
        alt: `${cachedProfile.displayName || "Profile"} gallery media ${index + 1}`,
        walrusLink: media.walrusLink,
        src: media.walrusLink || fallback[fallbackIndex]?.src
      });
    });

    return items.length > 0 ? items : fallback;
  }, [cachedProfile]);

  const profileWalrusLink = useMemo(
    () => normalizeWalrusLink(profileData.walrusAggregator),
    [profileData.walrusAggregator]
  );
  const heroImageSrc = useMemo(() => resolveMediaSrc(mediaGallery[0]), [mediaGallery]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--color-bg-start)] via-[var(--color-bg-mid)] to-[var(--color-bg-end)] text-[var(--color-text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 pb-4 pt-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/ProoFlirt-logo.png"
              alt="ProoFlirt logo"
              width={64}
              height={64}
              className="h-12 w-12 object-contain sm:h-14 sm:w-14"
              priority
            />
            <div className="flex flex-col">
              <p className="text-base font-heading font-semibold text-[var(--color-text-primary)]">ProoFlirt</p>
              <p className="text-xs text-[var(--color-text-muted)]">Trust vault for zk dating</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-1 py-1 text-xs text-[var(--color-text-muted)] md:flex">
              {desktopNav.map((item) => {
                if (item.hideOnMobileNav) return null;
                const Icon = item.key === "edit" ? null : NavIcon[item.key as Exclude<NavKey, "edit">];
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-disabled={item.disabled}
                    className={clsx(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 transition",
                      item.active
                        ? "bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                      item.disabled && "!cursor-not-allowed text-[var(--color-text-muted)]/70 hover:text-[var(--color-text-muted)]/70"
                    )}
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <Link
              href="/onboarding/create-profile"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-[var(--shadow-accent)] transition hover:bg-[var(--color-accent-strong)]"
            >
              Edit profile
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 pb-28 pt-6 sm:px-6 lg:pt-8">
        <div className="flex w-full max-w-4xl flex-col gap-6">
          <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-strong)] p-8 text-[var(--color-text-secondary)] shadow-[var(--shadow-accent)]">
            <div
              className="pointer-events-none absolute -top-24 right-0 h-52 w-52 rounded-full bg-[var(--color-accent)]/45 blur-3xl"
              aria-hidden="true"
            />

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                <div className="h-24 w-24 overflow-hidden rounded-3xl border border-[var(--color-border-soft)] shadow-lg sm:h-28 sm:w-28">
                  <img src={heroImageSrc} alt={mediaGallery[0]?.alt} className="h-full w-full object-cover" />
                </div>

                <div className="flex max-w-lg flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
                    <span className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 tracking-tight">
                      {profileData.pronouns}
                    </span>
                    <span className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 tracking-tight">
                      {profileData.location}
                    </span>
                    <span className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 tracking-tight">
                      {profileData.lastOnline}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-heading font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                      {profileData.name}
                    </h1>
                    <p className="text-sm text-[var(--color-text-muted)]">{profileData.handle}</p>
                  </div>
                  <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">{profileData.headline}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/discover"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                >
                  Back to swipe
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] opacity-70"
                  disabled
                >
                  Share profile
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-sm text-[var(--color-text-muted)]">
              {profileData.interests.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-3 py-1 text-[var(--color-text-secondary)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-accent)]"
              >
                <p className="text-sm uppercase tracking-wide text-[var(--color-text-muted)]">{stat.label}</p>
                <p className={`mt-2 text-3xl font-heading font-semibold text-[var(--color-text-primary)] ${stat.accent ?? ""}`}>
                  {stat.value}
                </p>
                {stat.sublabel ? (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{stat.sublabel}</p>
                ) : null}
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-6">
                <h2 className="text-lg font-heading font-semibold tracking-tight text-[var(--color-text-primary)]">
                  On-chain identity
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{profileData.summary}</p>

                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex flex-col gap-1 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      Sui profile object
                    </dt>
                    <dd className="font-mono text-sm text-[var(--color-text-primary)]">{profileData.suiObjectId}</dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-3">
                    <dt className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      Primary Walrus asset
                    </dt>
                    <dd className="text-sm text-[var(--color-text-secondary)]">
                      {profileWalrusLink ? (
                        <a
                          href={profileWalrusLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--color-accent)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-text-primary)]"
                        >
                          {profileWalrusLink}
                        </a>
                      ) : profileData.walrusAggregator ? (
                        <span className="font-mono text-[var(--color-text-secondary)]">{profileData.walrusAggregator}</span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">Walrus media not linked yet</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-heading font-semibold tracking-tight text-[var(--color-text-primary)]">
                    Proof locker
                  </h2>
                  <span className="text-xs uppercase text-[var(--color-text-muted)]">
                    Synchronized via Sui zk proofs
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {proofBadges.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4 transition hover:border-[var(--color-border)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{item.title}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusAccent[item.status]}`}
                        >
                          {item.status === "valid" ? "Valid" : item.status === "pending" ? "Pending" : "Requested"}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">{item.description}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Updated {item.updatedAt}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-6">
                <h2 className="text-lg font-heading font-semibold tracking-tight text-[var(--color-text-primary)]">
                  Upcoming meetups
                </h2>
                <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
                  <li className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-3">
                    <p className="font-medium text-[var(--color-text-primary)]">Lisbon night market</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Tomorrow · QR proof ready</p>
                  </li>
                  <li className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-3">
                    <p className="font-medium text-[var(--color-text-primary)]">ZK brunch w/ Mira</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Saturday · Waiting on stamp</p>
                  </li>
                </ul>
                <button
                  type="button"
                  className="mt-4 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                >
                  Request proof update
                </button>
              </div>

              <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-6">
                <h2 className="text-lg font-heading font-semibold tracking-tight text-[var(--color-text-primary)]">
                  Activity log
                </h2>
                <ul className="mt-4 space-y-4">
                  {timeline.map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{event.title}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{event.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
                          <span>{event.timestamp}</span>
                          {event.proofId ? (
                            <span className="rounded-full border border-[var(--color-border-soft)] px-2 py-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
                              {event.proofId}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </section>

          <section className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-heading font-semibold tracking-tight text-[var(--color-text-primary)]">
                Media vault
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">Mirrored on Walrus · Immutable references</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {mediaGallery.map((item) => {
                const mediaSrc = resolveMediaSrc(item);
                const walrusHref = normalizeWalrusLink(item.walrusLink);
                return (
                  <figure key={item.id} className="group overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)]">
                    <img
                      src={mediaSrc}
                      alt={item.alt}
                      className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <figcaption className="flex items-center justify-between gap-2 bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                      <span className="truncate">{item.alt}</span>
                      {walrusHref ? (
                        <a
                          href={walrusHref}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                        >
                          Walrus
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                          Walrus
                        </span>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {bottomNav
            .filter((item) => !item.hideOnMobileNav)
            .map((item) => {
              if (item.key === "edit") return null;
              const Icon = NavIcon[item.key as Exclude<NavKey, "edit">];
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-disabled={item.disabled}
                  className={clsx(
                    "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition",
                    item.active
                      ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                    item.disabled && "!cursor-not-allowed text-[var(--color-text-muted)]/70 hover:text-[var(--color-text-muted)]/70"
                  )}
                >
                  {Icon ? (
                    <Icon
                      className={clsx(
                        "h-5 w-5",
                        item.active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
                        item.disabled && "!text-[var(--color-text-muted)]/70"
                      )}
                    />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </div>
      </nav>
    </div>
  );
}
