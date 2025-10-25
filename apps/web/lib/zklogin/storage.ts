import { DEFAULT_SUI_NETWORK } from "./config";

const STORAGE_PREFIX = "prooflirt:zklogin";

export interface PendingZkLogin {
  state: string;
  nonce: string;
  maxEpoch: number;
  randomness: string;
  network: string;
  redirectUri: string;
  postLoginRedirect?: string;
  createdAt: number;
  ephemeralPublicKey: string;
  ephemeralSecretKey: string;
}

export interface ZkLoginEphemeralSession {
  ephemeralPublicKey: string;
  ephemeralSecretKey: string;
  maxEpoch: number;
  randomness: string;
  network: string;
  createdAt: number;
  proof?: Record<string, unknown>;
}

export interface ZkLoginSession {
  address: string;
  provider: "google";
  jwt: string;
  userSalt: string;
  maxEpoch: number;
  randomness: string;
  network: string;
  expiresAt: number | null;
  aud: string;
  iss: string;
  sub: string;
}

function makeKey(state: string) {
  return `${STORAGE_PREFIX}:pending:${state}`;
}

const SESSION_KEY = `${STORAGE_PREFIX}:session`;
const EPHEMERAL_KEY = `${STORAGE_PREFIX}:ephemeral`;

export function persistPendingLogin(data: PendingZkLogin) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(makeKey(data.state), JSON.stringify(data));
}

export function consumePendingLogin(state: string): PendingZkLogin | null {
  if (typeof window === "undefined") return null;
  const key = makeKey(state);
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  sessionStorage.removeItem(key);
  try {
    const parsed = JSON.parse(raw) as PendingZkLogin;
    return parsed;
  } catch (error) {
    console.error("Failed to parse pending zkLogin state", error);
    return null;
  }
}

export function clearPendingLogins() {
  if (typeof window === "undefined") return;
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith(`${STORAGE_PREFIX}:pending:`)) {
      sessionStorage.removeItem(key);
    }
  });
}

export function saveEphemeralSession(data: ZkLoginEphemeralSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(EPHEMERAL_KEY, JSON.stringify(data));
}

export function loadEphemeralSession(): ZkLoginEphemeralSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(EPHEMERAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZkLoginEphemeralSession;
  } catch (error) {
    console.error("Failed to parse ephemeral session", error);
    return null;
  }
}

export function clearEphemeralSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(EPHEMERAL_KEY);
}

export function loadSession(): ZkLoginSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ZkLoginSession;
    return parsed;
  } catch (error) {
    console.error("Failed to parse zkLogin session", error);
    return null;
  }
}

export function saveSession(session: ZkLoginSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function defaultNetwork() {
  return DEFAULT_SUI_NETWORK;
}
