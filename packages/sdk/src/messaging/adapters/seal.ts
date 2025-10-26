import fetch from "cross-fetch";
import { fromB64, toB64 } from "@mysten/sui/utils";

import {
  type SealCiphertext,
  type SealClient,
  type SealDecryptInput,
  type SealEncryptInput,
  type SealPolicyDescriptor,
  type SealPolicyInput
} from "../types.js";
import { SealUnavailableError } from "../errors.js";

export interface HttpSealClientOptions {
  apiKey?: string;
  headers?: Record<string, string>;
}

export class HttpSealClient implements SealClient {
  constructor(private readonly baseUrl: string, private readonly options: HttpSealClientOptions = {}) {}

  async ensureConversationPolicy(input: SealPolicyInput): Promise<SealPolicyDescriptor> {
    const response = await this.request("/policies/ensure", {
      participants: input.participants,
      existingPolicyId: input.existingPolicyId
    });
    return response as SealPolicyDescriptor;
  }

  async encryptMessage(input: SealEncryptInput): Promise<SealCiphertext> {
    const response = await this.request("/messages/encrypt", {
      policyId: input.policyId,
      plaintext: toB64(input.plaintext)
    });
    return {
      ciphertext: fromB64(response.ciphertext),
      nonce: response.nonce ? fromB64(response.nonce) : undefined
    } satisfies SealCiphertext;
  }

  async decryptMessage(input: SealDecryptInput): Promise<Uint8Array> {
    const response = await this.request("/messages/decrypt", {
      policyId: input.policyId,
      ciphertext: toB64(input.ciphertext)
    });
    return fromB64(response.plaintext);
  }

  private async request(path: string, body: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}),
        ...this.options.headers
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new SealUnavailableError("Seal API request failed", {
        status: response.status,
        path
      });
    }

    return response.json();
  }
}

export class InMemorySealClient implements SealClient {
  private readonly policies = new Map<string, SealPolicyDescriptor>();

  async ensureConversationPolicy(input: SealPolicyInput): Promise<SealPolicyDescriptor> {
    const key = this.keyForParticipants(input.participants);
    let descriptor = this.policies.get(key);
    if (!descriptor) {
      descriptor = {
        policyId: toB64(randomBytes(16))
      } satisfies SealPolicyDescriptor;
      this.policies.set(key, descriptor);
    }
    return descriptor;
  }

  async encryptMessage(input: SealEncryptInput): Promise<SealCiphertext> {
    // Deterministic XOR "encryption" suitable for tests.
    const keyBytes = fromB64(input.policyId);
    const buffer = input.plaintext;
    const encrypted = xor(buffer, keyBytes);
    return {
      ciphertext: encrypted
    } satisfies SealCiphertext;
  }

  async decryptMessage(input: SealDecryptInput): Promise<Uint8Array> {
    const keyBytes = fromB64(input.policyId);
    return xor(input.ciphertext, keyBytes);
  }

  private keyForParticipants(participants: [string, string]): string {
    return participants.slice().sort().join(":");
  }
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function xor(data: Uint8Array, key: Uint8Array): Uint8Array {
  const output = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    output[i] = data[i] ^ key[i % key.length];
  }
  return output;
}
