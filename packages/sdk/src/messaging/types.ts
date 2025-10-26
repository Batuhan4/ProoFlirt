import type { Transaction } from "@mysten/sui/transactions";

export type Address = string;
export type ConversationId = string;

export interface ConversationSummary {
  id: ConversationId;
  participants: [Address, Address];
  policyId: string;
  createdEpoch: bigint;
  lastMessageEpoch: bigint;
}

export interface MessageEnvelope {
  conversationId: ConversationId;
  sequence: bigint;
  sender: Address;
  recipient: Address;
  ciphertext: Uint8Array;
  meta: Uint8Array;
  policyId: Uint8Array;
  walrusBlob?: string;
  createdEpoch: bigint;
  readEpoch?: bigint;
  ciphertextDigest: string;
  metaDigest: string;
}

export interface AttachmentUpload {
  bytes: Uint8Array;
  mimeType: string;
  filename?: string;
  epochs?: number;
}

export interface AttachmentReference {
  blobId: string;
  url: string;
  epochs: number;
}

export interface WalrusClient {
  publishAttachment(input: AttachmentUpload): Promise<AttachmentReference>;
}

export interface SealPolicyInput {
  participants: [Address, Address];
  existingPolicyId?: string;
}

export interface SealPolicyDescriptor {
  policyId: string;
  expiresAt?: number;
}

export interface SealEncryptInput {
  policyId: string;
  plaintext: Uint8Array;
}

export interface SealCiphertext {
  ciphertext: Uint8Array;
  nonce?: Uint8Array;
}

export interface SealDecryptInput {
  policyId: string;
  ciphertext: Uint8Array;
}

export interface SealClient {
  ensureConversationPolicy(input: SealPolicyInput): Promise<SealPolicyDescriptor>;
  encryptMessage(input: SealEncryptInput): Promise<SealCiphertext>;
  decryptMessage(input: SealDecryptInput): Promise<Uint8Array>;
}

export interface MessagingTransport {
  openConversation(input: OpenConversationRequest): Promise<OpenConversationResponse>;
  sendMessage(input: SendMessageRequest): Promise<SendMessageResponse>;
  fetchConversation(conversationId: ConversationId): Promise<ConversationSummary | null>;
  listConversations(address: Address): Promise<ConversationSummary[]>;
  listMessages(conversationId: ConversationId, options?: MessageListOptions): Promise<MessageEnvelope[]>;
}

export interface MessageListOptions {
  limit?: number;
  cursor?: string | null;
}

export interface OpenConversationRequest {
  registryId: string;
  counterparty: Address;
  policyId: Uint8Array;
  signer: MessagingTransactionSigner;
}

export interface OpenConversationResponse {
  digest: string;
  conversationId: ConversationId;
}

export interface SendMessageRequest {
  conversationId: ConversationId;
  recipient: Address;
  ciphertext: Uint8Array;
  meta: Uint8Array;
  policyId: Uint8Array;
  walrusBlob?: string;
  signer: MessagingTransactionSigner;
}

export interface SendMessageResponse {
  digest: string;
  sequence: bigint;
}

export interface MessagingTransactionSigner {
  execute(transaction: Transaction, description?: string): Promise<string>;
}

export interface MessagingClientConfig {
  packageId: string;
  messageModule?: string;
  registryId: string;
  suiNetwork: string;
  selfAddress: Address;
  transport: MessagingTransport;
  seal: SealClient;
  walrus: WalrusClient;
  signer: MessagingTransactionSigner;
}

export interface SendMessageOptions {
  attachment?: AttachmentUpload;
  meta?: Uint8Array;
}

export interface ConversationQueryOptions {
  refresh?: boolean;
}
