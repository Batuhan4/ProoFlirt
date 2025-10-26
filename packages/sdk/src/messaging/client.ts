import { fromB64, toB64 } from "@mysten/sui/utils";

import {
  type Address,
  type ConversationId,
  type ConversationQueryOptions,
  type ConversationSummary,
  type MessagingClientConfig,
  type MessageEnvelope,
  type MessageListOptions,
  type SendMessageOptions
} from "./types.js";
import { ConversationNotFoundError, MessagingError } from "./errors.js";

export class MessagingClient {
  private conversationCache = new Map<ConversationId, ConversationSummary>();

  constructor(private readonly config: MessagingClientConfig) {}

  async openConversation(recipient: Address, options?: ConversationQueryOptions): Promise<ConversationSummary> {
    const participants: [Address, Address] = [this.config.selfAddress, recipient];

    const policy = await this.config.seal.ensureConversationPolicy({ participants });
    const response = await this.config.transport.openConversation({
      registryId: this.config.registryId,
      counterparty: recipient,
      policyId: fromB64(policy.policyId),
      signer: this.config.signer
    });

    const summary = await this.mustFetchConversation(response.conversationId, options);
    this.conversationCache.set(response.conversationId, summary);
    return summary;
  }

  async listConversations(address: Address = this.config.selfAddress): Promise<ConversationSummary[]> {
    const conversations = await this.config.transport.listConversations(address);
    conversations.forEach((conversation) => this.conversationCache.set(conversation.id, conversation));
    return conversations;
  }

  async getConversation(conversationId: ConversationId, options?: ConversationQueryOptions): Promise<ConversationSummary> {
    if (!options?.refresh && this.conversationCache.has(conversationId)) {
      return this.conversationCache.get(conversationId)!;
    }

    const summary = await this.mustFetchConversation(conversationId, options);
    this.conversationCache.set(conversationId, summary);
    return summary;
  }

  async sendMessage(conversationId: ConversationId, plaintext: Uint8Array, options?: SendMessageOptions) {
    const summary = await this.getConversation(conversationId, { refresh: options?.attachment !== undefined });
    const participants: [Address, Address] = summary.participants;
    const otherParticipant = participants.find((participant) => participant !== this.config.selfAddress);
    if (!otherParticipant) {
      throw new MessagingError("Conversation participants are malformed", { conversationId, participants });
    }

    const policy = await this.config.seal.ensureConversationPolicy({
      participants,
      existingPolicyId: summary.policyId
    });
    const ciphertext = await this.config.seal.encryptMessage({
      policyId: policy.policyId,
      plaintext
    });

    let walrusBlob: string | undefined;
    if (options?.attachment) {
      const reference = await this.config.walrus.publishAttachment(options.attachment);
      walrusBlob = reference.blobId;
    }

    const meta = options?.meta ?? new Uint8Array();
    const response = await this.config.transport.sendMessage({
      conversationId,
      recipient: otherParticipant,
      ciphertext: ciphertext.ciphertext,
      meta,
      policyId: fromB64(policy.policyId),
      walrusBlob,
      signer: this.config.signer
    });

    return response;
  }

  async listMessages(conversationId: ConversationId, options?: MessageListOptions): Promise<MessageEnvelope[]> {
    await this.getConversation(conversationId, { refresh: false });
    return this.config.transport.listMessages(conversationId, options);
  }

  async decryptMessage(envelope: MessageEnvelope): Promise<Uint8Array> {
    return this.config.seal.decryptMessage({
      policyId: toB64(envelope.policyId),
      ciphertext: envelope.ciphertext
    });
  }

  private async mustFetchConversation(conversationId: ConversationId, options?: ConversationQueryOptions) {
    const summary = await this.config.transport.fetchConversation(conversationId);
    if (!summary) {
      throw new ConversationNotFoundError(conversationId);
    }
    return summary;
  }
}
