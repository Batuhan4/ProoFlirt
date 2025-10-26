import fetch from "cross-fetch";
import { toB64 } from "@mysten/sui/utils";

import type { AttachmentReference, AttachmentUpload, WalrusClient } from "../types.js";
import { MessagingError } from "../errors.js";

export interface WalrusProxyClientOptions {
  headers?: Record<string, string>;
}

export class WalrusProxyClient implements WalrusClient {
  constructor(private readonly endpoint: string, private readonly options: WalrusProxyClientOptions = {}) {}

  async publishAttachment(input: AttachmentUpload): Promise<AttachmentReference> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.options.headers
      },
      body: JSON.stringify({
        blob: toB64(input.bytes),
        mimeType: input.mimeType,
        filename: input.filename,
        epochs: input.epochs
      })
    });

    if (!response.ok) {
      throw new MessagingError("Walrus proxy request failed", {
        status: response.status
      });
    }

    const payload = (await response.json()) as AttachmentReference;
    return payload;
  }
}

export class InMemoryWalrusClient implements WalrusClient {
  private readonly objects = new Map<string, AttachmentUpload>();

  async publishAttachment(input: AttachmentUpload): Promise<AttachmentReference> {
    const blobId = `local-${this.objects.size + 1}`;
    this.objects.set(blobId, input);
    return {
      blobId,
      url: `memory://${blobId}`,
      epochs: input.epochs ?? 0
    } satisfies AttachmentReference;
  }

  read(blobId: string): AttachmentUpload | undefined {
    return this.objects.get(blobId);
  }
}
