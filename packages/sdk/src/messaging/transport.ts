import { SuiClient, type SuiEvent, type SuiObjectResponse } from "@mysten/sui/client";
import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { fromB64, toB64 } from "@mysten/sui/utils";

import type {
  ConversationId,
  ConversationSummary,
  MessageEnvelope,
  MessageListOptions,
  MessagingTransactionSigner,
  MessagingTransport,
  OpenConversationRequest,
  OpenConversationResponse,
  SendMessageRequest,
  SendMessageResponse
} from "./types.js";
import { ConversationNotFoundError, MessagingError } from "./errors.js";

const MESSAGE_SENT_EVENT = "MessageSentEvent";
const CONVERSATION_CREATED_EVENT = "ConversationCreatedEvent";
const MESSAGE_SNAPSHOT_TYPE_NAME = "MessageSnapshot";
export const MESSAGE_MODULE_DEFAULT = "message";

const messageSnapshotLayout = {
  sequence: bcs.u64(),
  sender: bcs.Address,
  recipient: bcs.Address,
  ciphertext: bcs.vector(bcs.u8()),
  meta: bcs.vector(bcs.u8()),
  policy_id: bcs.vector(bcs.u8()),
  walrus_blob: bcs.option(bcs.string()),
  created_epoch: bcs.u64(),
  read_epoch: bcs.option(bcs.u64()),
  ciphertext_digest: bcs.vector(bcs.u8()),
  meta_digest: bcs.vector(bcs.u8())
};

export class SuiMessagingTransport implements MessagingTransport {
  private readonly eventModulePath: string;
  private readonly snapshotType: string;

  constructor(
    private readonly client: SuiClient,
    private readonly packageId: string,
    private readonly moduleName: string = MESSAGE_MODULE_DEFAULT
  ) {
    this.eventModulePath = `${packageId}::${moduleName}`;
    this.snapshotType = `${this.eventModulePath}::${MESSAGE_SNAPSHOT_TYPE_NAME}`;
    if (!bcs.hasType(this.snapshotType)) {
      bcs.registerStructType(this.snapshotType, messageSnapshotLayout);
    }
  }

  async openConversation(request: OpenConversationRequest): Promise<OpenConversationResponse> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${this.eventModulePath}::open`,
      arguments: [
        tx.object(request.registryId),
        tx.pure.address(request.counterparty),
        tx.pure.vector("u8", Array.from(request.policyId))
      ]
    });

    const digest = await request.signer.execute(tx, "open-conversation");
    const events = await this.fetchTransactionEvents(digest);
    const created = events.find((event) =>
      event.type === `${this.eventModulePath}::${CONVERSATION_CREATED_EVENT}`
    );
    if (!created?.parsedJson || typeof created.parsedJson !== "object") {
      throw new MessagingError("ConversationCreatedEvent not found", { digest });
    }

    const conversationId = (created.parsedJson as { conversation_id: string }).conversation_id;
    return {
      digest,
      conversationId
    };
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${this.eventModulePath}::send`,
      arguments: [
        tx.object(request.conversationId),
        tx.pure.address(request.recipient),
        tx.pure.vector("u8", Array.from(request.ciphertext)),
        tx.pure.vector("u8", Array.from(request.meta)),
        tx.pure.vector("u8", Array.from(request.policyId)),
        tx.pure.option("0x1::option::Option<0x1::string::String>", request.walrusBlob ?? null)
      ]
    });

    const digest = await request.signer.execute(tx, "send-message");
    const events = await this.fetchTransactionEvents(digest);
    const sent = events.find((event) =>
      event.type === `${this.eventModulePath}::${MESSAGE_SENT_EVENT}`
    );
    if (!sent?.parsedJson || typeof sent.parsedJson !== "object") {
      throw new MessagingError("MessageSentEvent not found", { digest });
    }

    const payload = sent.parsedJson as { sequence: string };
    return {
      digest,
      sequence: BigInt(payload.sequence)
    };
  }

  async fetchConversation(conversationId: ConversationId): Promise<ConversationSummary | null> {
    const response = await this.client.getObject({ id: conversationId, options: { showContent: true } });
    const fields = this.extractFields(response);
    if (!fields) {
      return null;
    }

    return {
      id: conversationId,
      participants: [fields.participant_a as string, fields.participant_b as string],
      policyId: encodeBase64(fields.policy_id as number[] | string),
      createdEpoch: BigInt(fields.created_epoch as string | number),
      lastMessageEpoch: BigInt(fields.last_message_epoch as string | number)
    };
  }

  async listConversations(address: string): Promise<ConversationSummary[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveEventType: `${this.eventModulePath}::${CONVERSATION_CREATED_EVENT}`
      }
    });

    const matches = events.data.filter((event) => {
      const payload = event.parsedJson as Record<string, unknown> | null;
      if (!payload) return false;
      return payload.participant_a === address || payload.participant_b === address;
    });

    return Promise.all(
      matches.map(async (event) => {
        const payload = event.parsedJson as Record<string, string>;
        const id = payload.conversation_id;
        const summary = await this.fetchConversation(id);
        if (!summary) {
          throw new ConversationNotFoundError(id);
        }
        return summary;
      })
    );
  }

  async listMessages(conversationId: ConversationId, options?: MessageListOptions): Promise<MessageEnvelope[]> {
    const summary = await this.fetchConversation(conversationId);
    if (!summary) {
      throw new ConversationNotFoundError(conversationId);
    }

    const { data } = await this.client.queryEvents({
      query: {
        MoveEventType: `${this.eventModulePath}::${MESSAGE_SENT_EVENT}`
      },
      limit: options?.limit,
      cursor: options?.cursor ?? undefined
    });

    const filtered = data.filter((event) => {
      const payload = event.parsedJson as Record<string, unknown> | null;
      return payload?.conversation_id === conversationId;
    });

    const inspector = summary.participants[0];

    const snapshots = await Promise.all(
      filtered.map((event) => {
        const payload = event.parsedJson as Record<string, string>;
        return this.fetchMessageSnapshot(conversationId, BigInt(payload.sequence), inspector);
      })
    );

    return snapshots;
  }

  private async fetchMessageSnapshot(
    conversationId: ConversationId,
    sequence: bigint,
    sender: string
  ): Promise<MessageEnvelope> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${this.eventModulePath}::message_snapshot`,
      arguments: [tx.object(conversationId), tx.pure.u64(sequence)]
    });

    const inspection = await this.client.devInspectTransactionBlock({
      sender,
      transactionBlock: tx
    });

    const result = inspection.results?.[0];
    const returnValue = result?.returnValues?.[0];
    if (!returnValue) {
      throw new MessagingError("Unable to inspect message snapshot", {
        conversationId,
        sequence: sequence.toString()
      });
    }

    const [bytes, type] = returnValue;
    if (type !== this.snapshotType) {
      throw new MessagingError("Unexpected snapshot type", {
        expected: this.snapshotType,
        received: type
      });
    }

    const snapshot = bcs.de(this.snapshotType, bytes) as Record<string, unknown>;
    return {
      conversationId,
      sequence,
      sender: snapshot.sender as string,
      recipient: snapshot.recipient as string,
      ciphertext: toUint8Array(snapshot.ciphertext),
      meta: toUint8Array(snapshot.meta),
      policyId: toUint8Array(snapshot.policy_id),
      walrusBlob: snapshot.walrus_blob ?? undefined,
      createdEpoch: BigInt(snapshot.created_epoch as string | number),
      readEpoch: normalizeOptional(snapshot.read_epoch),
      ciphertextDigest: encodeBase64(snapshot.ciphertext_digest as number[] | string),
      metaDigest: encodeBase64(snapshot.meta_digest as number[] | string)
    };
  }

  private async fetchTransactionEvents(digest: string): Promise<SuiEvent[]> {
    const receipt = await this.client.waitForTransactionBlock({
      digest,
      options: {
        showEvents: true
      }
    });
    return receipt.events ?? [];
  }

  private extractFields(response: SuiObjectResponse): Record<string, unknown> | null {
    const content = response.data?.content;
    if (!content || content.dataType !== "moveObject") {
      return null;
    }
    return content.fields as Record<string, unknown>;
  }
}

function encodeBase64(value: number[] | string): string {
  if (typeof value === "string") {
    return value;
  }
  return toB64(Uint8Array.from(value));
}

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value as number[]);
  }
  if (typeof value === "string") {
    return fromB64(value);
  }
  throw new MessagingError("Unsupported byte encoding", { value });
}

function normalizeOptional(value: unknown): bigint | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    // devInspect option returns [true, inner] or [] depending on SDK version
    if (value.length === 0) {
      return undefined;
    }
    return normalizeOptional(value[0]);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return BigInt(value);
  }
  return undefined;
}
