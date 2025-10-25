'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  decodeJwt,
  getExtendedEphemeralPublicKey,
  jwtToAddress
} from "@mysten/sui/zklogin";

import { fromBase64 } from "@/lib/base64";
import { PROVER_SERVICE_URL } from "@/lib/zklogin/config";
import {
  consumePendingLogin,
  saveEphemeralSession,
  saveSession
} from "@/lib/zklogin/storage";

type Status = "idle" | "processing" | "success" | "error";

interface SuccessState {
  address: string;
  provider: "google";
  network: string;
  expiresAt: number | null;
}

function parseParams(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const hashParams = window.location.hash
    ? new URLSearchParams(window.location.hash.slice(1))
    : new URLSearchParams();

  const searchParams = new URLSearchParams(window.location.search);

  hashParams.forEach((value, key) => {
    if (!searchParams.has(key)) {
      searchParams.set(key, value);
    }
  });

  return searchParams;
}

async function requestSalt(jwt: string): Promise<string> {
  const response = await fetch("/api/zklogin/salt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: jwt })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Salt service error (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { salt?: string };
  if (!json?.salt) {
    throw new Error("Salt service response missing `salt`");
  }

  return json.salt;
}

async function requestProof(payload: Record<string, unknown>) {
  const response = await fetch("/api/zklogin/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Prover service error (${response.status}): ${text}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

export default function ZkCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessState | null>(null);

  const params = useMemo(parseParams, []);

  useEffect(() => {
    if (status !== "idle") return;

    async function handleCallback() {
      setStatus("processing");

      const errorParam = params.get("error");
      if (errorParam) {
        throw new Error(errorParam);
      }

      const idToken = params.get("id_token");
      const state = params.get("state");
      if (!idToken || !state) {
        throw new Error("Missing id_token or state in callback response");
      }

      const pending = consumePendingLogin(state);
      if (!pending) {
        throw new Error("Login state expired. Please start the login flow again.");
      }

      const ephemeralKeypair = Ed25519Keypair.fromSecretKey(
        fromBase64(pending.ephemeralSecretKey)
      );

      const decoded = decodeJwt(idToken);
      const userSalt = await requestSalt(idToken);
      const address = jwtToAddress(idToken, userSalt);

      const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
        ephemeralKeypair.getPublicKey()
      );

      let proof: Record<string, unknown> | undefined;
      try {
        proof = await requestProof({
          jwt: idToken,
          extendedEphemeralPublicKey,
          maxEpoch: pending.maxEpoch.toString(),
          jwtRandomness: pending.randomness,
          salt: userSalt,
          keyClaimName: "sub"
        });
      } catch (err) {
        console.warn(
          "Fetching zkLogin proof failed. Transactions may fail until proof generation succeeds.",
          err
        );
      }

      saveEphemeralSession({
        ephemeralPublicKey: pending.ephemeralPublicKey,
        ephemeralSecretKey: pending.ephemeralSecretKey,
        maxEpoch: pending.maxEpoch,
        randomness: pending.randomness,
        network: pending.network,
        createdAt: Date.now(),
        proof
      });

      const expiresAt = decoded?.exp ? decoded.exp * 1000 : null;

      saveSession({
        address,
        provider: "google",
        jwt: idToken,
        userSalt,
        maxEpoch: pending.maxEpoch,
        randomness: pending.randomness,
        network: pending.network,
        expiresAt,
        aud: Array.isArray(decoded?.aud) ? decoded?.aud[0] ?? "" : decoded?.aud ?? "",
        iss: decoded?.iss ?? "",
        sub: decoded?.sub ?? ""
      });

      setResult({
        address,
        provider: "google",
        network: pending.network,
        expiresAt
      });
      setStatus("success");

      const redirectTarget = pending.redirectUri || "/";
      setTimeout(() => {
        router.replace(redirectTarget);
      }, 2500);
    }

    handleCallback().catch((err) => {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    });

    return undefined;
  }, [params, router, status]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-900 p-8 text-center text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-accent-purple/20">
        {status === "processing" && (
          <>
            <div className="mb-4 flex items-center justify-center">
              <span className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
            <h1 className="text-xl font-semibold">Verifying Google credential…</h1>
            <p className="mt-3 text-sm text-white/70">
              We&apos;re exchanging your OAuth credential for a zkLogin identity. Please
              keep this tab open.
            </p>
          </>
        )}

        {status === "success" && result && (
          <>
            <h1 className="text-xl font-semibold">You&apos;re in! 🎉</h1>
            <p className="mt-3 text-sm text-white/70">
              Address <span className="font-mono text-white">{result.address}</span> on
              Sui {result.network} is now linked to your Google account.
            </p>
            <p className="mt-3 text-xs text-white/60">
              Redirecting you to the app…
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Skip wait and continue
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-red-300">Login failed</h1>
            <p className="mt-3 text-sm text-red-200">{error}</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-accent-pink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Try again
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
