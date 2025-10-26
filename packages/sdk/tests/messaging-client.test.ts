import { beforeEach, describe, expect, it, vi } from "vitest";

import { MessagingClient } from "../src/messaging/client.js";
import { InMemorySealClient } from "../src/messaging/adapters/seal.js";
import { InMemoryWalrusClient } from "../src/messaging/adapters/walrus.js";
import {
  type AttachmentReference,
  type ConversationId,
  type ConversationSummary,
  type MessageEnvelope,
  type MessageListOptions,
  type MessagingTransactionSigner,
  type MessagingTransport,
  type OpenConversationRequest,
  type OpenConversationResponse,
  type SendMessageRequest,
  type SendMessageResponse
} from "../src/messaging/types.js";

const SELF = "0xabc";
const PARTNER = "0xdef";
const CONVERSATION_ID = "0xconvo";

class StubTransport implements MessagingTransport {
  openConversationMock = vi.fn<[], Promise<OpenConversationResponse>>();
  sendMessageMock = vi.fn<[], Promise<SendMessageResponse>>();
  fetchConversationMock = vi.fn<[], Promise<ConversationSummary | null>>();
  listConversationsMock = vi.fn<[], Promise<ConversationSummary[]>>();
  listMessagesMock = vi.fn<[], Promise<MessageEnvelope[]>>();

  async openConversation(input: OpenConversationRequest): Promise<OpenConversationResponse> {
    return this.openConversationMock(input);
  }

  async sendMessage(input: SendMessageRequest): Promise<SendMessageResponse> {
    return this.sendMessageMock(input);
  }

  async fetchConversation(conversationId: ConversationId): Promise<ConversationSummary | null> {
    return this.fetchConversationMock(conversationId);
  }

  async listConversations(address: string): Promise<ConversationSummary[]> {
    return this.listConversationsMock(address);
  }

  async listMessages(conversationId: ConversationId, options?: MessageListOptions): Promise<MessageEnvelope[]> {
    return this.listMessagesMock(conversationId, options);
  }
}

class StubSigner implements MessagingTransactionSigner {
  executeMock = vi.fn<[], Promise<string>>();

  async execute(): Promise<string> {
    return this.executeMock();
  }
}

describe("MessagingClient", () => {
let transport: StubTransport;
let signer: StubSigner;
let seal: InMemorySealClient;
let walrus: InMemoryWalrusClient;
let client: MessagingClient;

const baseSummary: ConversationSummary = {
  id: CONVERSATION_ID,
  participants: [SELF, PARTNER],
  policyId: "",
  createdEpoch: 0n,
  lastMessageEpoch: 0n
};

beforeEach(() => {
  transport = new StubTransport();
  signer = new StubSigner();
  seal = new InMemorySealClient();
  walrus = new InMemoryWalrusClient();

  client = new MessagingClient({
    packageId: "0x1",
    messageModule: "message",
    registryId: "0xregistry",
    suiNetwork: "testnet",
    selfAddress: SELF,
    transport,
    seal,
    walrus,
    signer
  });
});

  it("opens a conversation and caches it", async () => {
    transport.openConversationMock.mockResolvedValue({ digest: "0xdigest", conversationId: CONVERSATION_ID });
    transport.fetchConversationMock.mockResolvedValue({ ...baseSummary, policyId: "" });
    signer.executeMock.mockResolvedValue("0xdigest");

    const summary = await client.openConversation(PARTNER);

    expect(summary.id).toBe(CONVERSATION_ID);
    expect(transport.openConversationMock).toHaveBeenCalledTimes(1);
    const policyBytes = transport.openConversationMock.mock.calls[0][0].policyId;
    expect(policyBytes).toBeInstanceOf(Uint8Array);

    const cached = await client.getConversation(CONVERSATION_ID);
    expect(cached).toEqual(summary);
  });

  it("sends a message using seal and walrus adapters", async () => {
    transport.fetchConversationMock.mockResolvedValue({ ...baseSummary, policyId: "" });
    transport.sendMessageMock.mockImplementation(async (request) => {
      expect(request.recipient).toBe(PARTNER);
      expect(request.ciphertext.length).toBeGreaterThan(0);
      return { digest: "0xmsg", sequence: 1n } satisfies SendMessageResponse;
    });
    signer.executeMock.mockResolvedValue("0xmsg");

    await client.sendMessage(CONVERSATION_ID, new Uint8Array([1, 2, 3]));

    expect(transport.sendMessageMock).toHaveBeenCalledTimes(1);
  });
});
