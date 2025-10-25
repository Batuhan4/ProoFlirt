const DEFAULT_PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
  "https://publisher.walrus-testnet.walrus.space";
const DEFAULT_AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  "https://aggregator.walrus-testnet.walrus.space";
const DEFAULT_EPOCHS = Number(process.env.NEXT_PUBLIC_WALRUS_DEFAULT_EPOCHS || 5);
const DEFAULT_PROXY_PATH = process.env.NEXT_PUBLIC_WALRUS_PROXY_PATH || "/api/walrus/upload";

export interface WalrusUploadOptions {
  publisherUrl?: string;
  aggregatorUrl?: string;
  epochs?: number;
  deletable?: boolean;
  signal?: AbortSignal;
  useProxy?: boolean;
  proxyPath?: string;
}

export interface WalrusUploadResult {
  blobId: string;
  walrusLink: string;
  endEpoch?: number;
  raw: Record<string, unknown>;
}

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

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolveWalrusPublisherUrl() {
  return stripTrailingSlash(DEFAULT_PUBLISHER_URL);
}

export function resolveWalrusAggregatorUrl() {
  return stripTrailingSlash(DEFAULT_AGGREGATOR_URL);
}

export function defaultWalrusEpochCount() {
  return DEFAULT_EPOCHS;
}

export async function hashBlobSha256(
  input: Blob | ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  let buffer: ArrayBuffer;
  if (input instanceof Blob) {
    buffer = await input.arrayBuffer();
  } else if (input instanceof ArrayBuffer) {
    buffer = input;
  } else {
    buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return new Uint8Array(digest);
}

export async function uploadToWalrus(
  file: File,
  options: WalrusUploadOptions = {}
): Promise<WalrusUploadResult> {
  const publisherUrl = stripTrailingSlash(options.publisherUrl || DEFAULT_PUBLISHER_URL);
  const aggregatorUrl = stripTrailingSlash(options.aggregatorUrl || DEFAULT_AGGREGATOR_URL);
  const epochs = options.epochs ?? DEFAULT_EPOCHS;
  const proxyPath = options.proxyPath ?? DEFAULT_PROXY_PATH;
  const useProxy = options.useProxy ?? (typeof window !== "undefined" && Boolean(proxyPath));

  if (useProxy && proxyPath) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("publisherUrl", publisherUrl);
    formData.append("aggregatorUrl", aggregatorUrl);
    if (epochs > 0) {
      formData.append("epochs", String(epochs));
    }
    if (typeof options.deletable === "boolean") {
      formData.append("deletable", String(options.deletable));
    }

    const response = await fetch(proxyPath, {
      method: "POST",
      body: formData,
      signal: options.signal
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Walrus proxy error (${response.status}): ${details || response.statusText}`);
    }

    return (await response.json()) as WalrusUploadResult;
  }

  const params = new URLSearchParams();
  if (epochs > 0) {
    params.set("epochs", String(epochs));
  }
  if (typeof options.deletable === "boolean") {
    params.set("deletable", String(options.deletable));
  }

  const endpoint = `${publisherUrl}/v1/blobs${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    },
    body: file,
    signal: options.signal
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Walrus publisher error (${response.status}): ${details || response.statusText}`);
  }

  const payload = (await response.json().catch(() => ({}))) as WalrusPublisherResponse;
  const blobId =
    payload?.newlyCreated?.blobObject?.blobId || payload?.alreadyCertified?.blobId;

  if (!blobId) {
    throw new Error("Walrus publisher did not return a blobId");
  }

  const endEpoch =
    payload?.newlyCreated?.blobObject?.storage?.endEpoch ||
    payload?.alreadyCertified?.endEpoch;

  return {
    blobId,
    walrusLink: `${aggregatorUrl}/v1/blobs/${blobId}`,
    endEpoch,
    raw: payload
  };
}
