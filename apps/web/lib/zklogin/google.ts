"use client";

import { SuiClient } from "@mysten/sui/client";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness } from "@mysten/sui/zklogin";

import { toBase64 } from "../base64";
import {
  DEFAULT_REDIRECT_PATH,
  GOOGLE_OPENID_ENDPOINT,
  getSuiRpcUrl
} from "./config";
import { clearEphemeralSession, defaultNetwork, persistPendingLogin } from "./storage";

interface PrepareOptions {
  redirectUri?: string;
  network?: string;
  postLoginRedirect?: string;
}

const DEFAULT_POST_LOGIN_REDIRECT = "/onboarding/create-profile";

function ensureEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getRedirectUri(custom?: string) {
  if (custom) return custom;
  if (typeof window === "undefined") return DEFAULT_REDIRECT_PATH;
  return `${window.location.origin}${DEFAULT_REDIRECT_PATH}`;
}

function randomState() {
  const array = new Uint8Array(10);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i += 1) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function prepareGoogleZkLogin({
  redirectUri,
  network,
  postLoginRedirect
}: PrepareOptions = {}): Promise<string> {
  const clientId = ensureEnv(
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );

  const resolvedRedirectUri = getRedirectUri(redirectUri);
  const resolvedNetwork = network || defaultNetwork();
  const resolvedPostLoginRedirect = postLoginRedirect || DEFAULT_POST_LOGIN_REDIRECT;

  const suiClient = new SuiClient({ url: getSuiRpcUrl(resolvedNetwork) });
  const { epoch } = await suiClient.getLatestSuiSystemState();
  const maxEpoch = Number(epoch) + 2;

  const ephemeralKeyPair = new Ed25519Keypair();
  const randomness = generateRandomness();
  const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);

  const state = randomState();

  clearEphemeralSession();
  const parsedSecret = decodeSuiPrivateKey(ephemeralKeyPair.getSecretKey());

  persistPendingLogin({
    state,
    nonce,
    maxEpoch,
    randomness,
    network: resolvedNetwork,
    redirectUri: resolvedRedirectUri,
    postLoginRedirect: resolvedPostLoginRedirect,
    createdAt: Date.now(),
    ephemeralPublicKey: ephemeralKeyPair.getPublicKey().toBase64(),
    ephemeralSecretKey: toBase64(parsedSecret.secretKey)
  });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "id_token",
    redirect_uri: resolvedRedirectUri,
    scope: "openid email profile",
    nonce,
    state,
    prompt: "select_account"
  });

  return `${GOOGLE_OPENID_ENDPOINT}?${params.toString()}`;
}
