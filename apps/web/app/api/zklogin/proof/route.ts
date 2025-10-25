import { NextResponse } from "next/server";

import { PROVER_SERVICE_URL } from "@/lib/zklogin/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown> | null;
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: "Missing proof payload" }, { status: 400 });
    }

    const upstream = await fetch(PROVER_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: "Prover service error", status: upstream.status, details: text },
        { status: upstream.status }
      );
    }

    const result = (await upstream.json()) as Record<string, unknown>;
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Prover proxy error", error);
    return NextResponse.json({ error: "Prover proxy failure" }, { status: 500 });
  }
}
