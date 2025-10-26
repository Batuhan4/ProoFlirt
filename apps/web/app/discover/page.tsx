'use client';

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useRef, useState, type PointerEvent } from "react";

type SwipeProfile = {
  id: string;
  name: string;
  age: number;
  matchScore: number;
  trustScore: number;
  distance: string;
  about: string;
  tags: string[];
  walrusLink: string;
  image: string;
};

type SwipeAction = "pass" | "connect" | "superlike";

const SWIPE_PROFILES: SwipeProfile[] = [
  {
    id: "jessica-lisbon",
    name: "Jessica",
    age: 28,
    matchScore: 0.85,
    trustScore: 92,
    distance: "5 km away",
    about:
      "Trail runner exploring new L2 ideas, always up for a sunrise hike followed by espresso and a governance debate.",
    tags: ["Hiking", "DeFi", "Art"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/9b1e...jessica",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "ash-berlin",
    name: "Ash",
    age: 31,
    matchScore: 0.78,
    trustScore: 88,
    distance: "Remote · GMT+1",
    about:
      "Designs zk-enabled DAOs by day, spins vinyl and tinkers with modular synths at night. Looking for co-op missions.",
    tags: ["ZK", "Design", "Vinyl"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/5ab2...ash",
    image:
      "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "mira-singapore",
    name: "Mira",
    age: 26,
    matchScore: 0.81,
    trustScore: 95,
    distance: "Singapore",
    about:
      "Product researcher validating IRL meetups with zk location proofs. Loves street photography and third-wave coffee.",
    tags: ["Product", "Photography", "Coffee"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/1c9f...mira",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"
  }
];

type NavKey = "swipe" | "profile" | "messages" | "meetups" | "edit";

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  active?: boolean;
  disabled?: boolean;
  hideOnMobileNav?: boolean;
};

const TOP_NAV: NavItem[] = [
  { key: "swipe", label: "Swipe", href: "/discover", active: true },
  { key: "profile", label: "Profile", href: "/profile", disabled: true },
  { key: "messages", label: "DMs", href: "/messages", disabled: true },
  { key: "meetups", label: "Meetups", href: "#", disabled: true },
  {
    key: "edit",
    label: "Edit profile",
    href: "/onboarding/create-profile",
    hideOnMobileNav: true
  }
];

const BOTTOM_NAV: NavItem[] = TOP_NAV.filter((item) => item.key !== "edit");

const NavIcon: Record<Exclude<NavKey, "edit">, (className?: string) => JSX.Element> = {
  swipe: (className) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 5v14m0 0 4-4m-4 4-4-4M5 9l4-4m6 0 4 4"
      />
    </svg>
  ),
  profile: (className) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 20a7 7 0 0 1 14 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      />
    </svg>
  ),
  messages: (className) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 8h10M7 12h6m-9 8v-4a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4l-4-3H6l-4 3Z"
      />
    </svg>
  ),
  meetups: (className) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 6h14M5 12h14M5 18h8"
      />
    </svg>
  )
};

const STACK_DEPTH = 2;

export default function DiscoverPage() {
  const [index, setIndex] = useState(0);
  const [lastAction, setLastAction] = useState<SwipeAction | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const stack = useMemo(() => {
    const items: SwipeProfile[] = [];
    for (let offset = 0; offset <= STACK_DEPTH; offset += 1) {
      items.push(SWIPE_PROFILES[(index + offset) % SWIPE_PROFILES.length]);
    }
    return items;
  }, [index]);

  const activeProfile = stack[0];

  const handleAction = (action: SwipeAction) => {
    setLastAction(action);
    setIndex((prev) => (prev + 1) % SWIPE_PROFILES.length);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    window.setTimeout(() => setLastAction(null), 800);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (isDragging) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    const horizontalThreshold = 80;
    const verticalThreshold = 100;
    if (deltaY < -verticalThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
      handleAction("superlike");
    } else if (Math.abs(deltaX) > horizontalThreshold) {
      handleAction(deltaX > 0 ? "connect" : "pass");
    } else {
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
    dragStart.current = { x: 0, y: 0 };
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--color-bg-start)] via-[var(--color-bg-mid)] to-[var(--color-bg-end)] text-[var(--color-text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 pb-4 pt-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-accent)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d="M12.1 20.7a1 1 0 0 1-.2 0c-.4-.1-.7-.3-1-.5C6.1 16.2 3 12.2 3 8.7 3 6 5 4 7.6 4c1.4 0 2.7.6 3.6 1.7C12.1 4.6 13.4 4 14.8 4 17.4 4 19.4 6 19.4 8.7c0 3.5-3.1 7.5-7.9 11.5-.3.3-.6.5-1 .5h-.4z" />
              </svg>
            </span>
            <div>
              <p className="text-base font-heading font-semibold text-[var(--color-text-primary)]">ProoFlirt</p>
              <p className="text-xs text-[var(--color-text-muted)]">Private PWA swipe</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border-soft)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            aria-label="Filters"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" d="M5 7h14M7 12h10M9 17h6" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 pb-28 pt-4 sm:px-6">
        <section className="flex w-full max-w-lg flex-col gap-5">
          <div className="relative h-[65svh] min-h-[420px] max-h-[640px] w-full">
            {stack
              .slice()
              .reverse()
              .map((profile, stackIndex) => {
                const visualIndex = STACK_DEPTH - stackIndex;
                const isActiveCard = visualIndex === 0;
                const hasDrag = dragOffset.x !== 0 || dragOffset.y !== 0;
                const dragTransform =
                  isActiveCard && (isDragging || hasDrag)
                    ? ` translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05}deg)`
                    : "";
                return (
                  <article
                    key={`${profile.id}-${visualIndex}`}
                    className={clsx(
                      "absolute inset-0 flex flex-col justify-end overflow-hidden rounded-[32px] border border-[var(--color-border-soft)] bg-[var(--color-surface-strong)] shadow-[var(--shadow-accent)] transition-transform duration-300 will-change-transform touch-pan-y",
                      isActiveCard ? "z-20" : "",
                      isActiveCard && isDragging && "!duration-0"
                    )}
                    style={{
                      transform: `translateY(${visualIndex * 12}px) scale(${1 - visualIndex * 0.035})${dragTransform}`,
                      opacity: visualIndex === 0 ? 1 : 0.55
                    }}
                    onPointerDown={isActiveCard ? handlePointerDown : undefined}
                    onPointerMove={isActiveCard ? handlePointerMove : undefined}
                    onPointerUp={isActiveCard ? handlePointerEnd : undefined}
                    onPointerCancel={isActiveCard ? handlePointerEnd : undefined}
                    role="group"
                    aria-label={`${profile.name} profile card`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(22, 4, 15, 0) 0%, rgba(22, 4, 15, 0.92) 72%), url(${profile.image})`
                      }}
                    />
                    <div className="relative z-10 flex flex-col gap-4 p-5">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        <span className="rounded-full bg-[var(--color-surface-soft)] px-3 py-1">
                          {(profile.matchScore * 100).toFixed(0)}% Match
                        </span>
                        <span className="text-[var(--color-text-muted)]">{profile.distance}</span>
                      </div>
                      <div>
                        <p className="text-3xl font-heading font-semibold text-[var(--color-text-primary)]">
                          {profile.name}
                        </p>
                        <p className="text-lg text-[var(--color-text-muted)]">{profile.age}</p>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{profile.about}</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.tags.map((tag) => (
                          <span
                            key={`${profile.id}-${tag}`}
                            className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>

          {lastAction && (
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              {lastAction === "connect" && "Connection request prepared with encrypted messaging."}
              {lastAction === "pass" && "Skipping to the next verified profile."}
              {lastAction === "superlike" && "Super like sent—front of the queue for this match."}
            </p>
          )}

          <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <div>
                <p className="uppercase tracking-wide text-[var(--color-text-secondary)]">Walrus Blob</p>
                <p className="font-mono text-sm text-[var(--color-text-primary)] break-all">
                  {activeProfile.walrusLink}
                </p>
              </div>
              <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)]">
                zk protected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4">
                <p className="text-xs text-[var(--color-text-muted)]">Trust Score</p>
                <p className="text-3xl font-semibold text-[var(--color-text-primary)]">{activeProfile.trustScore}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">DAO signals</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4">
                <p className="text-xs text-[var(--color-text-muted)]">Compatibility</p>
                <p className="text-3xl font-semibold text-[var(--color-text-primary)]">
                  {(activeProfile.matchScore * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">Shared rituals</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-text-secondary)]">
              <p className="mb-2 text-[var(--color-text-primary)]">Next actions</p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" /> Request ZK location proof
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-highlight)]" /> Share meetup itinerary
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-border-strong)]" /> Flag suspicious behavior
                </li>
              </ul>
            </div>

            <Link
              href="/"
              className="rounded-2xl border border-[var(--color-border)] px-4 py-3 text-center text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            >
              Return home
            </Link>
          </div>
        </section>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {BOTTOM_NAV.filter((item) => item.key !== "edit").map((item) => {
            const Icon = NavIcon[item.key as Exclude<NavKey, "edit">];
            return (
              <Link
                key={item.label}
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
                {Icon && (
                  <Icon
                    className={clsx(
                      "h-5 w-5",
                      item.active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
                      item.disabled && "!text-[var(--color-text-muted)]/70"
                    )}
                  />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
