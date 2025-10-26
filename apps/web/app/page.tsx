import Image from "next/image";
import Link from "next/link";

import { ZkLoginButton } from "@/components/zk-login-button";

const links = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" }
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen w-full justify-center overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero-gradient opacity-95" aria-hidden="true" />
      <div className="absolute inset-x-0 top-28 -z-10 h-[340px] rounded-full bg-[var(--color-accent)] opacity-20 blur-3xl" aria-hidden="true" />

      <div className="flex w-full max-w-3xl flex-col justify-between gap-16 px-6 pb-16 pt-20 sm:px-12">
        <section className="flex flex-col items-center gap-12 text-center text-[var(--color-text-primary)]">
          <div className="flex w-full flex-col gap-10 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-strong)]/90 p-8 shadow-[var(--shadow-accent)] backdrop-blur-lg sm:p-12">
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Image
                  src="/assets/ProoFlirt-logo.png"
                  alt="ProoFlirt logo"
                  width={120}
                  height={120}
                  className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                  priority
                />
                <span className="bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-secondary)] to-[var(--color-highlight)] bg-clip-text text-4xl font-heading font-semibold tracking-tight text-transparent sm:text-5xl">
                  ProoFlirt
                </span>
              </div>

              <div className="flex max-w-2xl flex-col gap-4">
                <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
                  Private Dating, Verified Humans
                </h1>
                <p className="text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
                  Step into meaningful connections with the confidence that every match is a verified human.
                  Your identity stays yours—zero-knowledge proofs do the vouching.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/85 p-6 text-left sm:p-8">
              <h2 className="text-xl font-heading font-semibold text-[var(--color-highlight)] sm:text-2xl">
                Proof-powered trust
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
                Tap once to unlock Google ZK Login and share only what is necessary: that you are a verified,
                unique human. No screenshots, no fake profiles—just cryptographic confidence that every
                conversation starts authentically.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <ZkLoginButton className="w-full sm:w-auto sm:min-w-[18rem]" />

              <Link
                href="/zk-login"
                className="text-sm font-medium text-[var(--color-text-secondary)] underline-offset-4 transition hover:text-[var(--color-text-primary)] hover:underline"
              >
                What is ZK Login?
              </Link>
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center gap-6 text-xs text-[var(--color-text-muted)]">
          <span className="h-px w-full bg-[var(--color-border)]" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-center gap-6">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-[var(--color-text-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
