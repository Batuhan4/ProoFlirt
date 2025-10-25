import { NextResponse } from "next/server";
import { hkdfSync } from "node:crypto";
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

function deriveSalt(jwt: string): string {
  const decoded = decodeJwt(jwt);
  const iss = decoded?.iss ?? "";
  const aud = Array.isArray(decoded?.aud)
    ? decoded?.aud.filter(Boolean).join("")
    : decoded?.aud ?? "";
  const sub = decoded?.sub ?? "";

  const secret = ensureSaltSecret();
  const okm = hkdfSync(
    "sha256",
    Buffer.from(secret, "utf8"),
    Buffer.from(`${iss}${aud}`, "utf8"),
    Buffer.from(sub, "utf8"),
    32
  );

  const saltBN = new BN(Buffer.from(okm)).umod(FIELD_MODULUS);
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
const FIELD_MODULUS = new BN(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617",
  10
);
