export class MessagingError extends Error {
  context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = "MessagingError";
    this.context = context;
  }
}

export class SealUnavailableError extends MessagingError {
  constructor(message = "Seal service is currently unavailable", context?: Record<string, unknown>) {
    super(message, context);
    this.name = "SealUnavailableError";
  }
}

export class ConversationNotFoundError extends MessagingError {
  constructor(conversationId: string) {
    super(`Conversation ${conversationId} could not be found`, { conversationId });
    this.name = "ConversationNotFoundError";
  }
}

export class UnsupportedAttachmentError extends MessagingError {
  constructor(message = "Attachment is not supported for this conversation", context?: Record<string, unknown>) {
    super(message, context);
    this.name = "UnsupportedAttachmentError";
  }
}
