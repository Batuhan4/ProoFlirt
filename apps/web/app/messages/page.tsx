'use client';

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { KeyboardEvent } from "react";

const MESSAGES_ENABLED = process.env.NEXT_PUBLIC_MESSAGES_ENABLE === "true";
const REQUIRED_MESSAGING_ENV = {
  NEXT_PUBLIC_MESSAGE_PACKAGE: process.env.NEXT_PUBLIC_MESSAGE_PACKAGE,
  NEXT_PUBLIC_MESSAGE_REGISTRY_ID: process.env.NEXT_PUBLIC_MESSAGE_REGISTRY_ID,
  NEXT_PUBLIC_MESSAGE_REGISTRY_VERSION: process.env.NEXT_PUBLIC_MESSAGE_REGISTRY_VERSION
} as const;

if (MESSAGES_ENABLED) {
  const missingEnv = Object.entries(REQUIRED_MESSAGING_ENV)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missingEnv.length > 0) {
    throw new Error(
      `Encrypted DMs are enabled, but messaging contract env vars are missing: ${missingEnv.join(
        ", "
      )}. Configure them in your environment.`
    );
  }
}

type Conversation = {
  id: string;
  name: string;
  handle: string;
  trustScore: number;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  walrusProofCid: string;
};

type MessageBubble = {
  id: string;
  author: "self" | "partner";
  content: string;
  time: string;
  status?: "sent" | "delivered" | "zk-verified";
  attachmentCid?: string;
};

type SessionInfo = {
  id: string;
  refreshedAt: string;
  expiresIn: string;
  note: string;
};

type ConversationThread = Conversation & {
  session: SessionInfo;
  messages: MessageBubble[];
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

const INITIAL_THREADS: ConversationThread[] = [
  {
    id: "ash-berlin",
    name: "Ash",
    handle: "@ash.zk",
    trustScore: 91,
    lastMessage: "Sending now. I have a snapshot showing +12 confirmations after the weekend brunch.",
    timestamp: "10:47",
    walrusProofCid: "walrus:5ab2...ash",
    session: {
      id: "session:0x5fd...ff1",
      refreshedAt: "9m ago",
      expiresIn: "19h",
      note: "Session rotates when either party requests a new zk channel."
    },
    messages: [
      {
        id: "msg-1",
        author: "partner",
        content:
          "Hey Nova! Locked tomorrow 10:00 for the cowork sprint. I minted a Walrus stub so we can cache offline.",
        time: "10:42",
        status: "zk-verified",
        attachmentCid: "walrus:meeting:stub"
      },
      {
        id: "msg-2",
        author: "self",
        content:
          "Perfect! I will request a zk-location proof when I arrive. Want me to pre-order snacks from the DAO pantry?",
        time: "10:44",
        status: "delivered"
      },
      {
        id: "msg-3",
        author: "partner",
        content:
          "Yes please. Also, can you share the latest trust score deltas? Thinking of a quick warm-up exercise.",
        time: "10:45",
        status: "sent"
      },
      {
        id: "msg-4",
        author: "self",
        content: "Sending now. I have a snapshot showing +12 confirmations after the weekend brunch.",
        time: "10:47",
        status: "zk-verified"
      }
    ]
  },
  {
    id: "mira-singapore",
    name: "Mira",
    handle: "@mira.sg",
    trustScore: 95,
    lastMessage: "Queued a trust boost for your community care session.",
    timestamp: "1h ago",
    unreadCount: 2,
    walrusProofCid: "walrus:1c9f...mira",
    session: {
      id: "session:0x9ab...mira",
      refreshedAt: "1h ago",
      expiresIn: "6h",
      note: "Awaiting Mira's proof refresh to unlock attachments."
    },
    messages: [
      {
        id: "mira-msg-1",
        author: "partner",
        content: "Trust uplink queued. Rotate when you are ready so we can sync the new attestations.",
        time: "09:32",
        status: "sent"
      },
      {
        id: "mira-msg-2",
        author: "self",
        content: "Copy. I'll nudge the validator set after stand-up and share the metrics bundle.",
        time: "09:36",
        status: "delivered"
      }
    ]
  },
  {
    id: "leo-nyc",
    name: "Leo",
    handle: "@leo.nyc",
    trustScore: 82,
    lastMessage: "Shared governance deck – take a look when free.",
    timestamp: "Yesterday",
    walrusProofCid: "walrus:7e3b...leo",
    session: {
      id: "session:0x41c...leo",
      refreshedAt: "Yesterday",
      expiresIn: "3d",
      note: "Low-traffic channel. Rotate when governance cadence resumes."
    },
    messages: [
      {
        id: "leo-msg-1",
        author: "partner",
        content: "I dropped the governance deck plus notes. Let me know if anything needs redacting.",
        time: "14:12",
        status: "sent",
        attachmentCid: "walrus:deck:v3"
      }
    ]
  }
];

const filters = ["All", "Trusted", "Pending proof", "Ghost check"];

const statusCopy: Record<NonNullable<MessageBubble["status"]>, string> = {
  sent: "Sent",
  delivered: "Delivered",
  "zk-verified": "ZK verified"
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<ConversationThread[]>(() => INITIAL_THREADS);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    () => INITIAL_THREADS[0]?.id ?? ""
  );
  const [draftMessage, setDraftMessage] = useState("");

  const activeThread =
    threads.find((thread) => thread.id === activeConversationId) ?? threads[0] ?? null;
  const canSend = draftMessage.trim().length > 0;

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setDraftMessage("");
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === conversationId ? { ...thread, unreadCount: undefined } : thread
      )
    );
  };

  const handleSend = () => {
    const trimmed = draftMessage.trim();
    if (!trimmed || !activeThread) {
      return;
    }

    const now = new Date();
    const newMessage: MessageBubble = {
      id: `local-${now.getTime()}`,
      author: "self",
      content: trimmed,
      time: formatTimeLabel(now),
      status: "sent"
    };

    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              messages: [...thread.messages, newMessage],
              lastMessage: trimmed,
              timestamp: formatTimestampSummary(now),
              unreadCount: undefined
            }
          : thread
      )
    );
    setDraftMessage("");
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        handleSend();
      }
    }
  };

  if (!MESSAGES_ENABLED) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#080312] via-[#0e0424] to-[#120535] px-6 py-16 text-center text-white">
        <h1 className="text-2xl font-semibold">Private messages are almost ready</h1>
        <p className="max-w-xl text-sm text-white/70">
          Encrypted DMs roll out gradually. Set <code className="rounded bg-white/10 px-1 py-0.5 text-xs">NEXT_PUBLIC_MESSAGES_ENABLE=true</code> in your environment once your wallet is allow-listed.
        </p>
      </main>
    );
  }

  if (!activeThread) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#080312] via-[#0e0424] to-[#120535] px-6 py-16 text-center text-white">
        <h1 className="text-2xl font-semibold">No conversations yet</h1>
        <p className="max-w-md text-sm text-white/70">
          You are allow-listed for DMs, but there are no threads to display. Start a new chat from a
          profile to seed this inbox.
        </p>
      </main>
    );
  }

  const navItems = NAV_ITEMS.map((item) =>
    item.key === "messages" ? { ...item, active: true } : item
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
              <p className="text-xs text-[var(--color-text-muted)]">Proof-locked private messages</p>
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
              New DM
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
              <p className="text-sm uppercase tracking-widest text-[var(--color-text-muted)]">
                Direct messages
              </p>
              <h1 className="text-2xl font-heading font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                Encrypted threads · zk-authenticated
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Messages are sealed with rotating session keys and synced through Walrus blobs. Only matched peers can open the payload.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={clsx(
                    "rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-1 font-medium transition",
                    item === "All"
                      ? "border-[var(--color-border)] text-[var(--color-text-primary)]"
                      : "hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {item}
                </button>
              ))}
              <Link
                href="/discover"
                className="ml-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              >
                Discover new matches
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h10m0 0v10m0-10L5 19" />
                </svg>
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <aside className="flex flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 sm:p-6">
              <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                <p className="font-heading font-semibold tracking-tight text-[var(--color-text-primary)]">Threads</p>
                <span className="text-xs text-[var(--color-text-muted)]">Proof-sorted</span>
              </div>

              <div className="space-y-3">
                {threads.map((conversation) => {
                  const isActive = conversation.id === activeThread.id;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={clsx(
                        "flex w-full flex-col gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-3 text-left transition hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]",
                        isActive && "border-[var(--color-border-strong)] bg-[var(--color-surface-strong)]"
                      )}
                      aria-pressed={isActive}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {conversation.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">{conversation.handle}</p>
                        </div>
                        <span className="rounded-full bg-[var(--color-accent)]/25 px-2 py-1 text-xs font-medium text-[var(--color-text-primary)]">
                          {conversation.trustScore}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">{conversation.lastMessage}</p>
                      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                        <span>{conversation.timestamp}</span>
                        <div className="flex items-center gap-1 font-mono">
                          <ShieldIcon className="h-3 w-3 text-[var(--color-text-secondary)]" />
                          {conversation.walrusProofCid}
                        </div>
                      </div>
                      {conversation.unreadCount ? (
                        <span className="self-end rounded-full bg-[var(--color-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] shadow-[var(--shadow-accent)]">
                          {conversation.unreadCount} new
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </aside>

            <article className="flex flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 sm:p-6">
              <header className="flex flex-wrap items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[var(--color-border-soft)]">
                  <Image
                    src="https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=300&q=80"
                    alt={`${activeThread.name} profile`}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex flex-col">
                  <p className="text-base font-heading font-semibold text-[var(--color-text-primary)]">
                    {activeThread.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {activeThread.handle} · Trust {activeThread.trustScore}
                  </p>
                </div>
                <span className="ml-auto rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
                  Session {activeThread.session.id}
                </span>
              </header>

              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-3 text-xs text-[var(--color-text-muted)]">
                <p>Channel refreshed {activeThread.session.refreshedAt}</p>
                <p>Auto-rotates in {activeThread.session.expiresIn}</p>
                <p className="pt-1 text-[var(--color-text-secondary)]">{activeThread.session.note}</p>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {activeThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={clsx(
                      "flex flex-col gap-1 text-sm",
                      message.author === "self" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={clsx(
                        "max-w-[85%] rounded-2xl border px-3 py-2 leading-relaxed sm:max-w-[70%]",
                        message.author === "self"
                          ? "border-[var(--color-border-strong)] bg-[var(--color-accent)]/25 text-[var(--color-text-primary)]"
                          : "border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] text-[var(--color-text-secondary)]"
                      )}
                    >
                      <p>{message.content}</p>
                      {message.attachmentCid ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-mono text-[var(--color-text-secondary)]">
                          <ShieldIcon className="h-3 w-3 text-[var(--color-text-muted)]" />
                          {message.attachmentCid}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span>{message.time}</span>
                      {message.status ? (
                        <span className="flex items-center gap-1">
                          <ShieldIcon className="h-3 w-3 text-[var(--color-text-muted)]" />
                          {statusCopy[message.status]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Compose message
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/70"
                    placeholder="Write an encrypted hello…"
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    onKeyDown={handleDraftKeyDown}
                  />
                  <button
                    type="button"
                    className="whitespace-nowrap rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-[var(--shadow-accent)] transition hover:bg-[var(--color-accent-strong)]"
                    onClick={handleSend}
                    disabled={!canSend}
                  >
                    Send · ZK lock
                  </button>
                </div>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Messages stay local in prototype mode. Production will route through encrypted channels before persisting on-chain.
                </p>
              </div>
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

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTimestampSummary(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) {
    return "Just now";
  }
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return `${minutes}m ago`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 4.5 6v6.75C4.5 16.15 7.24 19.74 12 21c4.76-1.26 7.5-4.85 7.5-8.25V6L12 3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 0 2-1.5M12 13l-2-1.5" />
    </svg>
  );
}
