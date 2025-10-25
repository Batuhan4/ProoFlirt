import Link from "next/link";

import { ZkLoginButton } from "@/components/zk-login-button";

const links = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" }
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen w-full justify-center overflow-hidden bg-neutral-900">
      <div className="absolute inset-0 -z-10 bg-hero-gradient" aria-hidden="true" />

      <div className="flex w-full max-w-sm flex-col justify-between gap-16 px-6 pb-8 pt-16 sm:max-w-md sm:px-8">
        <section className="flex flex-col items-center text-center">
          <div className="mb-10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-lg font-medium text-white/90">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 shadow-lg shadow-accent-purple/30">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-accent-pink"
                  fill="currentColor"
                >
                  <path d="M12.1 20.7a1 1 0 0 1-.2 0c-.4-.1-.7-.3-1-.5C6.1 16.2 3 12.2 3 8.7 3 6 5 4 7.6 4c1.4 0 2.7.6 3.6 1.7C12.1 4.6 13.4 4 14.8 4 17.4 4 19.4 6 19.4 8.7c0 3.5-3.1 7.5-7.9 11.5-.3.3-.6.5-1 .5h-.4z" />
                </svg>
              </span>
              <span className="text-xl font-semibold tracking-tight">ProoFlirt</span>
            </div>

            <div className="flex flex-col gap-4 text-white">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Private Dating, Verified Humans
              </h1>
              <p className="text-base leading-relaxed text-white/70">
                Log in securely without sharing your personal data. We use ZK proofs to
                verify you’re a real person, not your identity.
              </p>
            </div>
          </div>

          <ZkLoginButton className="w-full" />

          <Link
            href="/zk-login"
            className="mt-5 text-sm font-medium text-white/80 underline-offset-4 hover:underline"
          >
            What is ZK Login?
          </Link>
        </section>

        <footer className="flex flex-col items-center gap-6 text-xs text-white/60">
          <span className="h-px w-full bg-white/10" aria-hidden="true" />
          <div className="flex items-center gap-6">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
