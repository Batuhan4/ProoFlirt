import { NextResponse } from "next/server";

const DEFAULT_PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
  "https://publisher.walrus-testnet.walrus.space";
const DEFAULT_AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  "https://aggregator.walrus-testnet.walrus.space";

export const runtime = "nodejs";

interface WalrusPublisherResponse {
  newlyCreated?: {
    blobObject?: {
      blobId?: string;
      storage?: { endEpoch?: number };
    };
  };
  alreadyCertified?: {
    blobId?: string;
    endEpoch?: number;
  };
  [key: string]: unknown;
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const publisherOverride = form.get("publisherUrl");
    const aggregatorOverride = form.get("aggregatorUrl");
    const epochs = form.get("epochs");
    const deletable = form.get("deletable");

    const publisherUrl = stripTrailingSlash(
      typeof publisherOverride === "string" && publisherOverride.length > 0
        ? publisherOverride
        : DEFAULT_PUBLISHER_URL
    );
    const aggregatorUrl = stripTrailingSlash(
      typeof aggregatorOverride === "string" && aggregatorOverride.length > 0
        ? aggregatorOverride
        : DEFAULT_AGGREGATOR_URL
    );

    const params = new URLSearchParams();
    if (epochs) {
      params.set("epochs", String(epochs));
    }
    if (typeof deletable === "string" && deletable.length > 0) {
      params.set("deletable", deletable);
    }

    const endpoint = `${publisherUrl}/v1/blobs${params.toString() ? `?${params}` : ""}`;

    const upstream = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream"
      },
      body: file.stream(),
      // Node's undici fetch requires `duplex` when streaming a body.
      duplex: "half"
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "Walrus upload failed", status: upstream.status, details: text },
        { status: upstream.status }
      );
    }

    const payload = (await upstream.json().catch(() => ({}))) as WalrusPublisherResponse;
    const blobId =
      payload?.newlyCreated?.blobObject?.blobId || payload?.alreadyCertified?.blobId;

    if (!blobId) {
      return NextResponse.json({ error: "Walrus response missing blobId", payload }, { status: 502 });
    }

    const endEpoch =
      payload?.newlyCreated?.blobObject?.storage?.endEpoch ||
      payload?.alreadyCertified?.endEpoch;

    return NextResponse.json(
      {
        blobId,
        walrusLink: `${aggregatorUrl}/v1/blobs/${blobId}`,
        endEpoch,
        raw: payload
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Walrus proxy error", error);
    return NextResponse.json(
      { error: "Walrus proxy failure", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
