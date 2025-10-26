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

type SwipeAction = {
  id: "pass" | "verify" | "connect";
  label: string;
  description: string;
  accent: string;
};

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

const ACTIONS: SwipeAction[] = [
  {
    id: "pass",
    label: "Pass",
    description: "Slide to next profile",
    accent: "hover:border-white/40 hover:text-white"
  },
  {
    id: "verify",
    label: "Trust Boost",
    description: "Request updated ZK proof",
    accent: "hover:border-[#10b981] hover:text-[#10b981]"
  },
  {
    id: "connect",
    label: "Connect",
    description: "Send a private hello",
    accent: "hover:border-[#ff2d78] hover:text-[#ff2d78]"
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
  const [lastAction, setLastAction] = useState<SwipeAction["id"] | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);

  const stack = useMemo(() => {
    const items: SwipeProfile[] = [];
    for (let offset = 0; offset <= STACK_DEPTH; offset += 1) {
      items.push(SWIPE_PROFILES[(index + offset) % SWIPE_PROFILES.length]);
    }
    return items;
  }, [index]);

  const activeProfile = stack[0];

  const handleAction = (action: SwipeAction["id"]) => {
    setLastAction(action);
    setIndex((prev) => (prev + 1) % SWIPE_PROFILES.length);
    setDragOffset(0);
    setIsDragging(false);
    window.setTimeout(() => setLastAction(null), 800);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (isDragging) return;
    dragStartX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;
    const deltaX = event.clientX - dragStartX.current;
    setDragOffset(deltaX);
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const delta = event.clientX - dragStartX.current;
    const swipeThreshold = 80;
    if (Math.abs(delta) > swipeThreshold) {
      handleAction(delta > 0 ? "connect" : "pass");
    } else {
      setDragOffset(0);
      setIsDragging(false);
    }
    dragStartX.current = 0;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#070f21] to-[#0b0f1d] text-white">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#070f21]/95 px-4 pb-4 pt-6 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-accent-pink shadow-inner shadow-black/40">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d="M12.1 20.7a1 1 0 0 1-.2 0c-.4-.1-.7-.3-1-.5C6.1 16.2 3 12.2 3 8.7 3 6 5 4 7.6 4c1.4 0 2.7.6 3.6 1.7C12.1 4.6 13.4 4 14.8 4 17.4 4 19.4 6 19.4 8.7c0 3.5-3.1 7.5-7.9 11.5-.3.3-.6.5-1 .5h-.4z" />
              </svg>
            </span>
            <div>
              <p className="text-base font-semibold">ProoFlirt</p>
              <p className="text-xs text-white/60">Private PWA swipe</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-white/40 hover:text-white"
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
                const dragTransform =
                  isActiveCard && (isDragging || dragOffset !== 0)
                    ? ` translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`
                    : "";
                return (
                  <article
                    key={`${profile.id}-${visualIndex}`}
                    className={clsx(
                      "absolute inset-0 flex flex-col justify-end overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-2xl transition-transform duration-300 will-change-transform touch-pan-y",
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
                        backgroundImage: `linear-gradient(180deg, rgba(1, 4, 12, 0) 0%, rgba(1, 4, 12, 0.8) 70%), url(${profile.image})`
                      }}
                    />
                    <div className="relative z-10 flex flex-col gap-4 p-5">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/80">
                        <span className="rounded-full bg-white/15 px-3 py-1">
                          {(profile.matchScore * 100).toFixed(0)}% Match
                        </span>
                        <span className="text-white/70">{profile.distance}</span>
                      </div>
                      <div>
                        <p className="text-3xl font-semibold">{profile.name}</p>
                        <p className="text-lg text-white/70">{profile.age}</p>
                      </div>
                      <p className="text-sm leading-relaxed text-white/80">{profile.about}</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.tags.map((tag) => (
                          <span
                            key={`${profile.id}-${tag}`}
                            className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium"
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

          <div className="grid gap-3 sm:grid-cols-3">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAction(action.id)}
                className={clsx(
                  "flex flex-col gap-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  action.accent
                )}
              >
                <span>{action.label}</span>
                <span className="text-xs text-white/60">{action.description}</span>
              </button>
            ))}
          </div>
          {lastAction && (
            <p className="text-center text-xs text-white/70">
              {lastAction === "connect" && "Connection request prepared with encrypted messaging."}
              {lastAction === "pass" && "Skipping to the next verified profile."}
              {lastAction === "verify" && "Requesting a fresh proof from Walrus + Sui."}
            </p>
          )}

          <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between text-xs text-white/60">
              <div>
                <p className="uppercase tracking-wide text-white/50">Walrus Blob</p>
                <p className="font-mono text-sm text-white">{activeProfile.walrusLink}</p>
              </div>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70">
                zk protected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#0c1528] p-4">
                <p className="text-xs text-white/60">Trust Score</p>
                <p className="text-3xl font-semibold text-white">{activeProfile.trustScore}</p>
                <p className="text-xs text-white/50">DAO signals</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4">
                <p className="text-xs text-white/60">Compatibility</p>
                <p className="text-3xl font-semibold text-white">
                  {(activeProfile.matchScore * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-white/50">Shared rituals</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#101626] p-4 text-sm text-white/70">
              <p className="mb-2 text-white">Next actions</p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#10b981]" /> Request ZK location proof
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#f59e0b]" /> Share meetup itinerary
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ef4444]" /> Flag suspicious behavior
                </li>
              </ul>
            </div>

            <Link
              href="/"
              className="rounded-2xl border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Return home
            </Link>
          </div>
        </section>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/10 bg-[#050914]/95 px-4 py-3 backdrop-blur md:hidden">
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
                  item.active ? "bg-white/10 text-white" : "text-white/60 hover:text-white",
                  item.disabled && "!cursor-not-allowed text-white/30 hover:text-white/30"
                )}
              >
                {Icon && (
                  <Icon
                    className={clsx(
                      "h-5 w-5",
                      item.active ? "text-white" : "text-white/70",
                      item.disabled && "!text-white/30"
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
