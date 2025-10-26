'use client';

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NavKey = "swipe" | "profile" | "messages" | "meetups" | "edit";

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  active?: boolean;
  disabled?: boolean;
  hideOnMobileNav?: boolean;
};

type MeetupMode = "IRL" | "Hybrid" | "Virtual";
type MeetupStatus = "Open" | "Waitlist" | "Closed";

type Meetup = {
  id: string;
  title: string;
  location: string;
  dateLabel: string;
  startTime: string;
  mode: MeetupMode;
  tags: string[];
  capacity: {
    confirmed: number;
    total: number;
  };
  status: MeetupStatus;
  walrusCid: string;
  minTrustScore: number;
  heroImage: string;
  summary: string;
  host: {
    name: string;
    handle: string;
  };
  highlights: string[];
  agenda: Array<{
    time: string;
    title: string;
    description: string;
  }>;
  resources: Array<{
    label: string;
    href: string;
  }>;
};

type MeetupFilterKey = "all" | "irl" | "hybrid" | "virtual" | "trust-90";

const NAV_ITEMS: NavItem[] = [
  { key: "swipe", label: "Swipe", href: "/discover" },
  { key: "profile", label: "Profile", href: "/profile" },
  { key: "messages", label: "DMs", href: "/messages" },
  { key: "meetups", label: "Meetups", href: "/meetups" },
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

const UPCOMING_MEETUPS: Meetup[] = [
  {
    id: "lisbon-builder-lab",
    title: "Lisbon Builder Lab · ZK Social",
    location: "Lisbon · LX Factory Loft",
    dateLabel: "Friday, Oct 18",
    startTime: "18:00",
    mode: "IRL",
    tags: ["Proof party", "ZK", "Trust boost"],
    capacity: { confirmed: 62, total: 80 },
    status: "Open",
    walrusCid: "walrus:meetups:lisbon:5dd2a",
    minTrustScore: 82,
    heroImage:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Evening cowork and social focused on zero-knowledge builder circles. Expect proof demos, curated playlists, and Lisbon snacks.",
    host: { name: "Jessica", handle: "@jessica.lisbon" },
    highlights: [
      "Bring a recent zk proof or attestation to unlock the prototyping lounge.",
      "Live DJ set powered by ProoFlirt matches – submit a track in advance.",
      "Walrus locker mirrors key materials for remote collaborators."
    ],
    agenda: [
      {
        time: "18:00",
        title: "Proof check-in opens",
        description: "Scan your wallet, upload the latest trust delta, and receive a rotating session badge."
      },
      {
        time: "19:15",
        title: "Builder lightning rounds",
        description: "Five-minute showcases of current zk experiments curated by the community council."
      },
      {
        time: "21:00",
        title: "Trust boost socials",
        description: "Pair up with matches sharing adjacent goals and schedule next steps via encrypted DMs."
      }
    ],
    resources: [
      { label: "Proof checklist (PDF)", href: "#" },
      { label: "Walrus locker CID", href: "https://aggregator.walrus.xyz/v1/blobs/5dd2a...lisbon" },
      { label: "Lisbon Telegram backchannel", href: "#" }
    ]
  },
  {
    id: "singapore-daybreak",
    title: "Daybreak Standup · APAC Sync",
    location: "Singapore · Marina Cloud Hub",
    dateLabel: "Tuesday, Oct 22",
    startTime: "08:30",
    mode: "Hybrid",
    tags: ["Morning ritual", "Governance", "Hybrid"],
    capacity: { confirmed: 44, total: 65 },
    status: "Open",
    walrusCid: "walrus:meetups:sg:9ac11",
    minTrustScore: 88,
    heroImage:
      "https://images.unsplash.com/photo-1475724017904-b712052c192a?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Sunrise sync bridging remote squads with on-site café seating. Hybrid stream validated with zk-location beacons.",
    host: { name: "Mira", handle: "@mira.sg" },
    highlights: [
      "ZK attendance ensures hybrid contributors receive equal trust boosts.",
      "Governance updates split into IRL pods and remote breakout sessions.",
      "Walrus snapshots shared in real time for async catchup."
    ],
    agenda: [
      {
        time: "08:30",
        title: "Beacon warm-up",
        description: "Check in via zk-location proof or remote attestation to unlock agenda materials."
      },
      {
        time: "09:00",
        title: "Community care huddles",
        description: "Pod-style discussions based on mission focus with facilitators capturing commitments."
      },
      {
        time: "09:45",
        title: "Remote-first demo desk",
        description: "Five hybrid projects demo, audience interacts through proof-gated Q&A."
      }
    ],
    resources: [
      { label: "Hybrid playbook", href: "#" },
      { label: "Beacon status board", href: "#" },
      { label: "Walrus stream (read-only)", href: "https://aggregator.walrus.xyz/v1/blobs/9ac11...sg" }
    ]
  },
  {
    id: "denver-hack-brunch",
    title: "Denver Hack Brunch · Governance IRL",
    location: "Denver · RiNo Studio",
    dateLabel: "Sunday, Nov 3",
    startTime: "11:00",
    mode: "IRL",
    tags: ["Governance", "Food", "IRL"],
    capacity: { confirmed: 28, total: 40 },
    status: "Waitlist",
    walrusCid: "walrus:meetups:den:71f09",
    minTrustScore: 76,
    heroImage:
      "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Slow brunch featuring policy whiteboarding, ve-tokenomics clinics, and fresh arepas. Secondary trust boosts for facilitation.",
    host: { name: "Diego", handle: "@diego.ba" },
    highlights: [
      "Bring a governance deck or proposal for immediate peer review.",
      "IRL zk-notarized attendance feeds the steward leaderboard.",
      "Local artists hosting a proof-of-culture gallery walkthrough."
    ],
    agenda: [
      {
        time: "11:00",
        title: "Kitchen credentials",
        description: "Secure brunch entry with zk-provisioning; swap community recipes while proofing."
      },
      {
        time: "12:15",
        title: "Policy jam session",
        description: "Collaborative whiteboard with token voting simulations and streaming feedback."
      },
      {
        time: "13:30",
        title: "Ambient governance lab",
        description: "Small breakout pods remix proposals and annotate outcomes to publish on-chain."
      }
    ],
    resources: [
      { label: "Gov deck template", href: "#" },
      { label: "Chef playlist", href: "#" },
      { label: "Walrus brunch cache", href: "https://aggregator.walrus.xyz/v1/blobs/71f09...den" }
    ]
  },
  {
    id: "online-proof-sprint",
    title: "Proof Sprint · Global Remote",
    location: "Virtual · Interchain Studio",
    dateLabel: "Thursday, Nov 14",
    startTime: "16:00 UTC",
    mode: "Virtual",
    tags: ["Virtual", "Pairing", "ZK"],
    capacity: { confirmed: 120, total: 160 },
    status: "Open",
    walrusCid: "walrus:meetups:remote:438c2",
    minTrustScore: 70,
    heroImage:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Global remote co-working block focused on pairing and proof reviews. Breakout rooms auto-pair based on trust deltas.",
    host: { name: "Kai", handle: "@kai.xr" },
    highlights: [
      "Auto-matched breakout rooms re-balance every 45 minutes by trust and skills.",
      "Remote snack stipend unlocked via zk-expense proof.",
      "Async follow-ups published to Walrus for later reference."
    ],
    agenda: [
      {
        time: "16:00",
        title: "Opening sync",
        description: "Hosts share goals, breakout assignments trigger once proofs verify."
      },
      {
        time: "16:30",
        title: "Pair programming sprints",
        description: "Participants co-work on proofs or validators, rotating partners every cycle."
      },
      {
        time: "18:30",
        title: "Wrap + trust boosts",
        description: "Deliverables timestamped, hosts sign attestations, and trust deltas propagate."
      }
    ],
    resources: [
      { label: "Sprint doc", href: "#" },
      { label: "Breakout matrix", href: "#" },
      { label: "Walrus recap vault", href: "https://aggregator.walrus.xyz/v1/blobs/438c2...remote" }
    ]
  }
];

const MEETUP_FILTERS: Array<{ key: MeetupFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "irl", label: "IRL" },
  { key: "hybrid", label: "Hybrid" },
  { key: "virtual", label: "Virtual" },
  { key: "trust-90", label: "≥90 trust" }
];

export default function MeetupsPage() {
  const [activeFilter, setActiveFilter] = useState<MeetupFilterKey>("all");
  const filteredMeetups = useMemo(() => {
    return UPCOMING_MEETUPS.filter((meetup) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "irl") return meetup.mode === "IRL";
      if (activeFilter === "hybrid") return meetup.mode === "Hybrid";
      if (activeFilter === "virtual") return meetup.mode === "Virtual";
      if (activeFilter === "trust-90") return meetup.minTrustScore >= 90;
      return true;
    });
  }, [activeFilter]);

  const [activeMeetupId, setActiveMeetupId] = useState<string>(() => filteredMeetups[0]?.id ?? "");

  useEffect(() => {
    if (filteredMeetups.length === 0) {
      if (activeMeetupId !== "") {
        setActiveMeetupId("");
      }
      return;
    }
    const currentMatchesFilter = filteredMeetups.some((meetup) => meetup.id === activeMeetupId);
    if (!currentMatchesFilter) {
      setActiveMeetupId(filteredMeetups[0]?.id ?? "");
    }
  }, [filteredMeetups, activeMeetupId]);

  const activeMeetup =
    filteredMeetups.find((meetup) => meetup.id === activeMeetupId) ?? filteredMeetups[0] ?? null;
  const navItems = NAV_ITEMS.map((item) =>
    item.key === "meetups" ? { ...item, active: true } : item
  );
  const bottomNav = navItems.filter((item) => item.key !== "edit");
  const desktopNav = navItems.filter((item) => !item.hideOnMobileNav);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--color-bg-start)] via-[var(--color-bg-mid)] to-[var(--color-bg-end)] text-[var(--color-text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 pb-4 pt-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Image
              src="/assets/ProoFlirt-logo.png"
              alt="ProoFlirt logo"
              width={64}
              height={64}
              className="h-14 w-14 object-contain"
              priority
            />
            <div className="flex flex-col">
              <p className="text-base font-heading font-semibold text-[var(--color-text-primary)]">ProoFlirt</p>
              <p className="text-xs text-[var(--color-text-muted)]">Proof-locked meetups & rituals</p>
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
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              disabled
            >
              Host meetup
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 pb-28 pt-6 sm:px-6 lg:pt-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-strong)] px-6 py-8 shadow-[var(--shadow-accent)] sm:px-8">
            <div className="flex flex-col gap-2">
              <p className="text-sm uppercase tracking-widest text-[var(--color-text-muted)]">Community rituals</p>
              <h1 className="text-2xl font-heading font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                Proof-pinned meetups · zk check-ins
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Join curated gatherings verified through trust scores, Walrus proof lockers, and rotating session badges. Sync IRL or remote without losing credibility.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
              {MEETUP_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={clsx(
                    "rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-1 font-medium transition",
                    activeFilter === filter.key
                      ? "border-[var(--color-border)] text-[var(--color-text-primary)]"
                      : "hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {filter.label}
                </button>
              ))}
              <Link
                href="/discover"
                className="ml-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              >
                Back to matches
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h10m0 0v10m0-10L5 19" />
                </svg>
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <aside className="flex h-fit flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Upcoming meetups
                </h2>
                <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                  {filteredMeetups.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {filteredMeetups.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
                    No meetups match this filter yet. Adjust your trust threshold or ping a steward to host.
                  </p>
                ) : (
                  filteredMeetups.map((meetup) => {
                    const isActive = meetup.id === activeMeetup?.id;
                    const capacityFill = Math.min(
                      100,
                      Math.round((meetup.capacity.confirmed / meetup.capacity.total) * 100)
                    );
                    return (
                      <button
                        key={meetup.id}
                        type="button"
                        onClick={() => setActiveMeetupId(meetup.id)}
                        className={clsx(
                          "flex flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition",
                          isActive
                            ? "border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-accent)]"
                            : "border-[var(--color-border-soft)] bg-[var(--color-surface)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-soft)]"
                        )}
                      >
                        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                          <span>{meetup.dateLabel}</span>
                          <span>{meetup.startTime}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{meetup.title}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{meetup.location}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                          <span className="rounded-full bg-[var(--color-surface-strong)] px-2 py-0.5">
                            {meetup.mode}
                          </span>
                          <span className="rounded-full bg-[var(--color-surface-strong)] px-2 py-0.5">
                            {meetup.status}
                          </span>
                          <span className="rounded-full bg-[var(--color-surface-strong)] px-2 py-0.5">
                            Trust ≥{meetup.minTrustScore}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                            <span>{meetup.capacity.confirmed} confirmed</span>
                            <span>{meetup.capacity.total - meetup.capacity.confirmed} spots left</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border-soft)]">
                            <div
                              className={clsx(
                                "h-full rounded-full transition-all",
                                meetup.status === "Waitlist"
                                  ? "bg-[var(--color-highlight)]"
                                  : "bg-[var(--color-accent)]"
                              )}
                              style={{ width: `${capacityFill}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <article className="flex flex-col gap-6 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 sm:p-6 lg:p-8">
              {activeMeetup ? (
                <>
                  <div className="flex flex-col gap-4">
                    <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)]">
                      <Image
                        src={activeMeetup.heroImage}
                        alt={activeMeetup.title}
                        width={1200}
                        height={640}
                        className="h-60 w-full object-cover sm:h-72 lg:h-80"
                      />
                      <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-white">
                        <span className="rounded-full bg-black/50 px-2 py-0.5">{activeMeetup.mode}</span>
                        <span className={clsx(
                          "rounded-full px-2 py-0.5",
                          activeMeetup.status === "Open"
                            ? "bg-emerald-500/80"
                            : activeMeetup.status === "Waitlist"
                              ? "bg-amber-500/80"
                              : "bg-rose-500/80"
                        )}
                        >
                          {activeMeetup.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-heading font-semibold text-[var(--color-text-primary)]">
                            {activeMeetup.title}
                          </h2>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {activeMeetup.dateLabel} · {activeMeetup.startTime} · {activeMeetup.location}
                          </p>
                        </div>
                        <div className="flex flex-col items-end text-xs text-[var(--color-text-muted)]">
                          <span>
                            Host: <span className="text-[var(--color-text-primary)]">{activeMeetup.host.name}</span>
                          </span>
                          <span>{activeMeetup.host.handle}</span>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">{activeMeetup.summary}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        {activeMeetup.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-3 py-1 text-[var(--color-text-secondary)]"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="ml-auto flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-3 py-1">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m7.8-9h-3m-9.6 0H3m14.56 5.66 2.12 2.12m-13.44-13.4L5.12 5.12m13.44 0 2.12-2.12m-13.44 13.4-2.12 2.12" />
                          </svg>
                          Trust ≥{activeMeetup.minTrustScore}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-text-secondary)] sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L19 7" />
                          </svg>
                          zk check-in required for entry
                        </div>
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          RSVP window closes 12h before start
                        </div>
                      </div>
                      <div className="rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)]">
                        Walrus mirror:{" "}
                        <a
                          className="text-[var(--color-text-primary)] underline decoration-dotted underline-offset-4"
                          href={activeMeetup.resources.find((resource) => resource.href.startsWith("https://aggregator"))?.href ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {activeMeetup.walrusCid}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,13rem)]">
                    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4 sm:p-6">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Highlights
                      </h3>
                      <ul className="flex flex-col gap-3 text-sm text-[var(--color-text-secondary)]">
                        {activeMeetup.highlights.map((highlight) => (
                          <li key={highlight} className="flex gap-3">
                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4 sm:p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        Bring
                      </h3>
                      <ul className="flex flex-col gap-2 text-xs text-[var(--color-text-muted)]">
                        <li className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2">
                          Wallet with recent trust proof delta
                        </li>
                        <li className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2">
                          Optional Walrus artifact to share
                        </li>
                        <li className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2">
                          Headphones for hybrid sync (if remote-friendly)
                        </li>
                      </ul>
                    </section>
                  </div>

                  <section className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4 sm:p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                      Agenda
                    </h3>
                    <div className="space-y-3">
                      {activeMeetup.agenda.map((entry) => (
                        <div
                          key={`${entry.time}-${entry.title}`}
                          className="flex flex-col gap-1 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:gap-4"
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:w-32">
                            <span className="rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5">{entry.time}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[var(--color-text-primary)]">{entry.title}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">{entry.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4 sm:p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                      Resources
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {activeMeetup.resources.map((resource) => (
                        <a
                          key={`${activeMeetup.id}-${resource.label}`}
                          href={resource.href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                        >
                          <span>{resource.label}</span>
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5h6m0 0v6m0-6L5 19" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-sm text-[var(--color-text-muted)]">
                  <h2 className="text-lg font-heading font-semibold text-[var(--color-text-primary)]">
                    Filter result is empty
                  </h2>
                  <p>
                    Try switching filters or lowering the trust threshold. You can also request a steward to unlock a new cohort.
                  </p>
                </div>
              )}
            </article>
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
