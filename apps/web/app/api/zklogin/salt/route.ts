import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import BN from "bn.js";

import { decodeJwt } from "@mysten/sui/zklogin";

export const runtime = "nodejs";

function ensureSaltSecret() {
  const secret = process.env.ZK_SALT_SECRET;
  if (!secret) {
    throw new Error("ZK_SALT_SECRET is not configured on the server");
  }
  return secret;
}

function hkdfExtract(hash: string, salt: Buffer, ikm: Buffer) {
  return createHmac(hash, salt).update(ikm).digest();
}

function hkdfExpand(hash: string, prk: Buffer, info: Buffer, length: number) {
  const iterations = Math.ceil(length / 32);
  if (iterations > 255) {
    throw new Error("HKDF length too large");
  }

  let previous = Buffer.alloc(0);
  const buffers: Buffer[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const hmac = createHmac(hash, prk);
    hmac.update(previous);
    hmac.update(info);
    hmac.update(Buffer.from([i + 1]));
    previous = hmac.digest();
    buffers.push(previous);
  }
  return Buffer.concat(buffers).subarray(0, length);
}

function deriveSalt(jwt: string): string {
  const decoded = decodeJwt(jwt);
  const iss = decoded?.iss ?? "";
  const aud = Array.isArray(decoded?.aud)
    ? decoded?.aud.filter(Boolean).join("")
    : decoded?.aud ?? "";
  const sub = decoded?.sub ?? "";

  const secret = ensureSaltSecret();
  const ikm = Buffer.from(secret, "utf8");
  const salt = Buffer.from(`${iss}${aud}`, "utf8");
  const info = Buffer.from(sub, "utf8");

  const prk = hkdfExtract("sha256", salt, ikm);
  const okm = hkdfExpand("sha256", prk, info, 16);

  const saltBN = new BN(okm);
  if (saltBN.isZero()) {
    return "1";
  }
  return saltBN.toString(10);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    if (!body?.token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const salt = deriveSalt(body.token);
    return NextResponse.json({ salt }, { status: 200 });
  } catch (error) {
    console.error("Salt derivation error", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Salt derivation failure"
      },
      { status: 500 }
    );
  }
}
