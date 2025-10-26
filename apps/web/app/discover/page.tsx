'use client';

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { loadCachedProfile, type CachedProfilePayload } from "@/lib/profile-cache";
import {
  resolveGenderLabel,
  resolveMatchPreferenceLabel,
  type GenderValue,
  type MatchPreferenceValue
} from "@/lib/profile-preferences";

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
  gender: GenderValue;
  preferredGender: MatchPreferenceValue;
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
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    gender: "woman",
    preferredGender: "men"
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
      "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=900&q=80",
    gender: "man",
    preferredGender: "women"
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
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    gender: "woman",
    preferredGender: "women"
  },
  {
    id: "diego-buenos-aires",
    name: "Diego",
    age: 33,
    matchScore: 0.74,
    trustScore: 89,
    distance: "Buenos Aires",
    about:
      "Protocol lawyer turned tango DJ. Loves discussing governance slates over mate and longboard rides.",
    tags: ["Governance", "Music", "Travel"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/2a1c...diego",
    image:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80",
    gender: "man",
    preferredGender: "women"
  },
  {
    id: "noor-dubai",
    name: "Noor",
    age: 29,
    matchScore: 0.9,
    trustScore: 97,
    distance: "Dubai",
    about: "Web3 climate auditor flying drones for mangrove projects. Sunrise desert runs keep me grounded.",
    tags: ["Climate", "Running", "Photography"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/55da...noor",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
    gender: "woman",
    preferredGender: "men"
  },
  {
    id: "kai-seoul",
    name: "Kai",
    age: 27,
    matchScore: 0.76,
    trustScore: 90,
    distance: "Seoul",
    about:
      "Non-binary XR artist minting communal memories. Looking for co-conspirators who love rooftop tea ceremonies.",
    tags: ["XR", "Tea", "Collectibles"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/a13b...kai",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=-50",
    gender: "non-binary",
    preferredGender: "any"
  },
  {
    id: "leila-tunis",
    name: "Leila",
    age: 35,
    matchScore: 0.7,
    trustScore: 83,
    distance: "Tunis",
    about:
      "Community radio host bootstrapping a crypto-literacy tour. Fluent in memes, poetry, and ve-tokenomics.",
    tags: ["Community", "Radio", "Poetry"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/6ce0...leila",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    gender: "woman",
    preferredGender: "women"
  },
  {
    id: "amiram-tel-aviv",
    name: "Amiram",
    age: 32,
    matchScore: 0.79,
    trustScore: 91,
    distance: "Tel Aviv",
    about:
      "Salsa spin instructor, zk fraud-buster by night. Carrying extra hardware wallets for friends in need.",
    tags: ["Dance", "Security", "Food"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/7e4b...amir",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    gender: "man",
    preferredGender: "any"
  },
  {
    id: "sylvi-helsinki",
    name: "Sylvi",
    age: 30,
    matchScore: 0.88,
    trustScore: 94,
    distance: "Helsinki",
    about:
      "Building cold-resistant wearables for DAO couriers. Obsessed with sauna rituals and aurora timelapses.",
    tags: ["Hardware", "Sauna", "Photography"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/812f...sylvi",
    image:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80",
    gender: "woman",
    preferredGender: "men"
  },
  {
    id: "tomas-bogota",
    name: "Tomás",
    age: 24,
    matchScore: 0.68,
    trustScore: 84,
    distance: "Bogotá",
    about:
      "Campus zk ambassador brewing arepas for hackers. Let’s trade playlists and talk light clients.",
    tags: ["Music", "Food", "Education"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/91cf...tomas",
    image:
      "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=900&q=80",
    gender: "man",
    preferredGender: "women"
  },
  {
    id: "ivy-vancouver",
    name: "Ivy",
    age: 34,
    matchScore: 0.82,
    trustScore: 96,
    distance: "Vancouver",
    about:
      "Forestry NFT forecaster using drone LiDAR. Seeking hiking buddies who enjoy stoic philosophy readings.",
    tags: ["Forestry", "Hiking", "Stoicism"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/ab7e...ivy",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&h=900",
    gender: "woman",
    preferredGender: "any"
  },
  {
    id: "neo-capetown",
    name: "Neo",
    age: 29,
    matchScore: 0.73,
    trustScore: 87,
    distance: "Cape Town",
    about:
      "Non-binary surf coach designing zk-panel reward systems. Rise before dawn, meditate, then chase barrels.",
    tags: ["Surfing", "Meditation", "Rewards"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/bb2e...neo",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=-20",
    gender: "non-binary",
    preferredGender: "women"
  },
  {
    id: "zane-auckland",
    name: "Zane",
    age: 27,
    matchScore: 0.71,
    trustScore: 85,
    distance: "Auckland",
    about:
      "Marine biologist tokenizing coral repair. Nights spent jamming lo-fi synths with DAO friends.",
    tags: ["Marine", "Music", "Science"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/cd4a...zane",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80",
    gender: "man",
    preferredGender: "any"
  },
  {
    id: "farah-casablanca",
    name: "Farah",
    age: 31,
    matchScore: 0.86,
    trustScore: 93,
    distance: "Casablanca",
    about:
      "Privacy researcher mixing gnark proofs with Andalusian jazz. Planning a caravan of laptop-friendly riads.",
    tags: ["Privacy", "Jazz", "Architecture"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/dafa...farah",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=30",
    gender: "woman",
    preferredGender: "men"
  },
  {
    id: "amirah-kuala-lumpur",
    name: "Amirah",
    age: 25,
    matchScore: 0.77,
    trustScore: 90,
    distance: "Kuala Lumpur",
    about:
      "Metaverse choreographer teaching DAOs to dance. Searching for collaborators who love bubble tea quests.",
    tags: ["Dance", "XR", "Food"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/e123...amirah",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&h=950",
    gender: "woman",
    preferredGender: "non-binary"
  },
  {
    id: "soren-copenhagen",
    name: "Søren",
    age: 36,
    matchScore: 0.69,
    trustScore: 88,
    distance: "Copenhagen",
    about:
      "DAO treasury pilot who bakes rye bread between multisig calls. Hosting fjord plunges for accountability.",
    tags: ["Finance", "Baking", "Wellness"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/f45c...soren",
    image:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80",
    gender: "man",
    preferredGender: "women"
  },
  {
    id: "jun-tokyo",
    name: "Jun",
    age: 28,
    matchScore: 0.84,
    trustScore: 92,
    distance: "Tokyo",
    about:
      "Zero-knowledge game designer hiding puzzles in konbini receipts. Seeking co-op partners for midnight ramen raids.",
    tags: ["Gaming", "Puzzles", "Food"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/01ef...jun",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80&sat=15",
    gender: "non-binary",
    preferredGender: "men"
  },
  {
    id: "ines-porto",
    name: "Inês",
    age: 29,
    matchScore: 0.83,
    trustScore: 95,
    distance: "Porto",
    about:
      "Building accountable wine clubs on-chain. Weekend surfer with a portable turntable and a heart for street cats.",
    tags: ["Wine", "Surf", "Music"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/12aa...ines",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80&sat=-15",
    gender: "woman",
    preferredGender: "men"
  },
  {
    id: "omar-muscat",
    name: "Omar",
    age: 34,
    matchScore: 0.72,
    trustScore: 82,
    distance: "Muscat",
    about:
      "Logistics lead for humanitarian DAOs. Loves desert astronomy and spicy cardamom coffee tastings.",
    tags: ["Logistics", "Astronomy", "Coffee"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/23bc...omar",
    image:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80&sat=20",
    gender: "man",
    preferredGender: "any"
  },
  {
    id: "luna-boulder",
    name: "Luna",
    age: 26,
    matchScore: 0.8,
    trustScore: 90,
    distance: "Boulder",
    about:
      "Trail-running astrologer who codes verifiable horoscopes. Down to compare Jupiter returns over oat lattes.",
    tags: ["Astrology", "Running", "Coffee"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/347d...luna",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80&sat=-40",
    gender: "woman",
    preferredGender: "any"
  },
  {
    id: "max-riga",
    name: "Max",
    age: 30,
    matchScore: 0.75,
    trustScore: 88,
    distance: "Riga",
    about:
      "Retro console modder turning wristbands into zk badges. Prefers sauna diplomacy and spontaneous road trips.",
    tags: ["Retro", "Hardware", "Travel"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/45de...max",
    image:
      "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=900&q=80&sat=25",
    gender: "man",
    preferredGender: "non-binary"
  },
  {
    id: "yara-accra",
    name: "Yara",
    age: 27,
    matchScore: 0.89,
    trustScore: 98,
    distance: "Accra",
    about:
      "Impact lead funding solar-powered art labs. Loves waist beads, Afrobeats, and on-chain accountability circles.",
    tags: ["Impact", "Music", "Art"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/56ef...yara",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&sat=-10",
    gender: "woman",
    preferredGender: "any"
  },
  {
    id: "eli-reykjavik",
    name: "Eli",
    age: 38,
    matchScore: 0.67,
    trustScore: 81,
    distance: "Reykjavík",
    about:
      "Volcanologist experimenting with geothermal node farms. Happy to show you secret hot springs and rune carving.",
    tags: ["Science", "Outdoors", "Mythology"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/67f0...eli",
    image:
      "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=900&q=80&sat=-25",
    gender: "unspecified",
    preferredGender: "any"
  },
  {
    id: "valerie-montreal",
    name: "Valérie",
    age: 33,
    matchScore: 0.87,
    trustScore: 95,
    distance: "Montréal",
    about:
      "Crypto policy advocate by day, aerial silks coach by night. Hosting multilingual salons for regenerative finance.",
    tags: ["Policy", "Aerial", "Refi"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/78ab...val",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80&sat=10",
    gender: "woman",
    preferredGender: "men"
  },
  {
    id: "orion-phoenix",
    name: "Orion",
    age: 28,
    matchScore: 0.79,
    trustScore: 89,
    distance: "Phoenix",
    about:
      "Biohacker hosting desert breathwork retreats. Tuning modular synth meditations for zk meetup cooldowns.",
    tags: ["Biohack", "Music", "Wellness"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/89cd...orion",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80&sat=5",
    gender: "non-binary",
    preferredGender: "any"
  },
  {
    id: "sofia-rome",
    name: "Sofia",
    age: 32,
    matchScore: 0.82,
    trustScore: 93,
    distance: "Rome",
    about:
      "Legal engineer digitizing UNESCO archives with zk attestations. Pasta club host, art restorer, piazza flâneur.",
    tags: ["Legal", "Art", "Food"],
    walrusLink: "https://aggregator.walrus.xyz/v1/blobs/90ef...sofia",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80&h=880",
    gender: "woman",
    preferredGender: "men"
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
  { key: "meetups", label: "Meetups", href: "/meetups" },
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

function normalizeGender(value?: string | null): GenderValue {
  if (value === "woman" || value === "man" || value === "non-binary" || value === "unspecified") {
    return value;
  }
  return "unspecified";
}

function normalizePreference(value?: string | null): MatchPreferenceValue | null {
  if (value === "women" || value === "men" || value === "non-binary" || value === "any") {
    return value;
  }
  return null;
}

function preferenceAcceptsGender(preference: MatchPreferenceValue | null | undefined, gender: GenderValue) {
  if (!preference || preference === "any") {
    return true;
  }
  if (preference === "women") return gender === "woman";
  if (preference === "men") return gender === "man";
  if (preference === "non-binary") return gender === "non-binary";
  return false;
}

function profileMatchesViewer(
  profile: SwipeProfile,
  viewerGender: GenderValue,
  viewerPreference: MatchPreferenceValue | null
) {
  const viewerLikesCandidate = preferenceAcceptsGender(viewerPreference, profile.gender);
  const candidateLikesViewer = preferenceAcceptsGender(profile.preferredGender, viewerGender);
  return viewerLikesCandidate && candidateLikesViewer;
}

export default function DiscoverPage() {
  const [viewerProfile, setViewerProfile] = useState<CachedProfilePayload | null>(null);
  const [index, setIndex] = useState(0);
  const [lastAction, setLastAction] = useState<SwipeAction | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const viewerGender = normalizeGender(viewerProfile?.gender);
  const viewerPreference = normalizePreference(viewerProfile?.preferredGender);
  const hasViewerPersona = Boolean(viewerProfile?.gender && viewerProfile?.preferredGender);

  useEffect(() => {
    // Loading from localStorage is intentionally deferred until after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewerProfile(loadCachedProfile());
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!hasViewerPersona) {
      return [];
    }
    return SWIPE_PROFILES.filter((profile) =>
      profileMatchesViewer(profile, viewerGender, viewerPreference)
    );
  }, [hasViewerPersona, viewerGender, viewerPreference]);

  const activeProfiles = useMemo(() => {
    if (filteredProfiles.length > 0) {
      return filteredProfiles;
    }
    if (hasViewerPersona) {
      return [];
    }
    return SWIPE_PROFILES;
  }, [filteredProfiles, hasViewerPersona]);
  const profileCount = activeProfiles.length;

  const safeIndex = profileCount === 0 ? 0 : index % profileCount;

  const stack = useMemo(() => {
    if (profileCount === 0) {
      return [];
    }
    const items: SwipeProfile[] = [];
    const maxDepth = Math.min(STACK_DEPTH, profileCount - 1);
    for (let offset = 0; offset <= maxDepth; offset += 1) {
      const targetIndex = (safeIndex + offset) % profileCount;
      items.push(activeProfiles[targetIndex]);
    }
    return items;
  }, [activeProfiles, profileCount, safeIndex]);
  const activeProfile = stack[0] ?? activeProfiles[0];
  const hasMatches = Boolean(activeProfile);

  const filteredCount = filteredProfiles.length;
  const showingFallback = hasViewerPersona && filteredCount === 0;
  const viewerGenderLabel = resolveGenderLabel(viewerGender);
  const viewerPreferenceLabel = viewerPreference
    ? resolveMatchPreferenceLabel(viewerPreference)
    : null;

  const desktopNav = useMemo(
    () =>
      TOP_NAV.filter((item) => !item.hideOnMobileNav).map((item) =>
        item.key === "swipe" ? { ...item, active: true } : item
      ),
    []
  );

  const handleAction = (action: SwipeAction) => {
    if (profileCount === 0) return;
    setLastAction(action);
    setIndex((prev) => (prev + 1) % profileCount);
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
      <header className="sticky top-0 z-40 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 pb-4 pt-6 backdrop-blur">
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
              <p className="text-xs text-[var(--color-text-muted)]">Proof-first swipe journeys</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-1 py-1 text-xs text-[var(--color-text-muted)] md:flex">
              {desktopNav.map((item) => {
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border-soft)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              aria-label="Filters"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" d="M5 7h14M7 12h10M9 17h6" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 pb-28 pt-4 sm:px-6">
        <section className="flex w-full max-w-lg flex-col gap-5">
          {hasViewerPersona && (
            <div className="rounded-[28px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]">
              <p>
                Matching as{" "}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {viewerGenderLabel ?? "you"}
                </span>{" "}
                · Seeking{" "}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {viewerPreferenceLabel ?? "All genders"}
                </span>
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {showingFallback
                  ? "No live matches meet both preferences yet—showing featured profiles."
                  : `${filteredCount} verified match${filteredCount === 1 ? "" : "es"} in queue.`}
              </p>
            </div>
          )}
          <div className="relative h-[65svh] min-h-[420px] max-h-[640px] w-full">
            {hasMatches ? (
              stack
                .slice()
                .reverse()
                .map((profile, stackIndex) => {
                  const profileGenderLabel = resolveGenderLabel(profile.gender) ?? profile.gender;
                  const profilePreferenceLabel =
                    resolveMatchPreferenceLabel(profile.preferredGender) ?? profile.preferredGender;
                  const visualIndex = Math.max(0, stack.length - 1 - stackIndex);
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
                        <div className="flex flex-wrap gap-2 text-[var(--color-text-muted)]">
                          <span className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)]">
                            {profileGenderLabel}
                          </span>
                          <span className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
                            Looking for {profilePreferenceLabel}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] text-center">
                <p className="text-base font-semibold text-[var(--color-text-primary)]">No matches yet</p>
                <p className="mt-2 max-w-xs text-sm text-[var(--color-text-secondary)]">
                  We’ll surface new profiles as soon as other{" "}
                  {viewerPreferenceLabel?.toLowerCase() ?? "people"} looking for {viewerGenderLabel?.toLowerCase() ?? "you"} join.
                </p>
                <p className="mt-4 text-xs text-[var(--color-text-muted)]">
                  Try updating your preferences or come back soon.
                </p>
              </div>
            )}
          </div>

          {lastAction && hasMatches && (
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              {lastAction === "connect" && "Connection request prepared with encrypted messaging."}
              {lastAction === "pass" && "Skipping to the next verified profile."}
              {lastAction === "superlike" && "Super like sent—front of the queue for this match."}
            </p>
          )}

          {hasMatches ? (
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
          ) : (
            <div className="rounded-[28px] border border-dashed border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 text-center text-sm text-[var(--color-text-secondary)]">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">Filters are pretty tight</p>
              <p className="mt-2">
                Update your match settings or check back later—new zk-verified members join constantly.
              </p>
            </div>
          )}
        </section>
      </main>

      <nav className="sticky bottom-0 z-40 border-t border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur md:hidden">
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
