'use client';

import { useCallback, useState } from "react";

import { prepareGoogleZkLogin } from "@/lib/zklogin/google";

interface Props {
  className?: string;
}

export function ZkLoginButton({ className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const url = await prepareGoogleZkLogin();
      window.location.assign(url);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unexpected error");
      setLoading(false);
    }
  }, []);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-accent-pink to-accent-purple py-4 text-base font-semibold text-white shadow-lg shadow-accent-pink/30 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg font-bold">
          {loading ? "…" : "G"}
        </span>
        {loading ? "Preparing Google Login…" : "Continue with ZK Login"}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
