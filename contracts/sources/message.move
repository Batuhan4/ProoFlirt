/// Prooflirt direct messaging contracts.
///
/// Stores conversation metadata on-chain with minimal ciphertext blobs while attachments
/// live on Walrus. Access is restricted to the two participants recorded in each
/// conversation. See `sui-zk-messaging.md` for architectural details.
#[allow(duplicate_alias)]
module prooflirt::message {
    use std::bcs;
    use std::option;
    use std::string;
    use std::vector;

    use sui::event;
    use sui::hash;
    use sui::object;
    use sui::table;
    use sui::tx_context;
    use sui::transfer;

    const MAX_CIPHERTEXT_BYTES: u64 = 4096;
    const MAX_META_BYTES: u64 = 512;
    const MAX_POLICY_BYTES: u64 = 96;
    const MAX_WALRUS_LINK_BYTES: u64 = 512;

    const E_NOT_PARTICIPANT: u64 = 0;
    const E_DUPLICATE_CONVERSATION: u64 = 1;
    const E_POLICY_MISMATCH: u64 = 2;
    const E_PAYLOAD_TOO_LARGE: u64 = 3;
    const E_INVALID_PARTICIPANTS: u64 = 4;
    const E_MESSAGE_NOT_FOUND: u64 = 5;
    const E_ALREADY_READ: u64 = 6;
    const E_UNAUTHORIZED_MARK_READ: u64 = 7;

    /// Canonicalized address pair used as registry key.
    public struct ConversationKey has copy, drop, store {
        first: address,
        second: address,
    }

    /// Shared registry mapping an ordered participant pair to the conversation id.
    public struct ConversationRegistry has key {
        id: object::UID,
        conversations: table::Table<ConversationKey, object::ID>,
    }

    /// Shared conversation object that both participants can mutate.
    public struct Conversation has key {
        id: object::UID,
        participant_a: address,
        participant_b: address,
        policy_id: vector<u8>,
        created_epoch: u64,
        last_message_epoch: u64,
        next_seq: u64,
        messages: table::Table<u64, MessageRecord>,
    }

    /// Stored entry for a single encrypted message.
    public struct MessageRecord has store, drop {
        sender: address,
        recipient: address,
        ciphertext: vector<u8>,
        meta: vector<u8>,
        policy_id: vector<u8>,
        walrus_blob: Option<string::String>,
        created_epoch: u64,
        read_epoch: Option<u64>,
    }

    /// Lightweight snapshot returned to clients via dev-inspect flows.
    public struct MessageSnapshot has copy, drop {
        sequence: u64,
        sender: address,
        recipient: address,
        ciphertext: vector<u8>,
        meta: vector<u8>,
        policy_id: vector<u8>,
        walrus_blob: Option<string::String>,
        created_epoch: u64,
        read_epoch: Option<u64>,
        ciphertext_digest: vector<u8>,
        meta_digest: vector<u8>,
    }

    public struct ConversationCreatedEvent has copy, drop {
        conversation_id: object::ID,
        participant_a: address,
        participant_b: address,
        policy_id: vector<u8>,
        created_epoch: u64,
    }

    public struct MessageSentEvent has copy, drop {
        conversation_id: object::ID,
        sequence: u64,
        sender: address,
        recipient: address,
        ciphertext_digest: vector<u8>,
        meta_digest: vector<u8>,
        has_attachment: bool,
        created_epoch: u64,
    }

    public struct MessageReadEvent has copy, drop {
        conversation_id: object::ID,
        sequence: u64,
        reader: address,
        read_epoch: u64,
    }

    /// Initializes the conversation registry during package publish.
    fun init(ctx: &mut tx_context::TxContext) {
        let registry = ConversationRegistry {
            id: object::new(ctx),
            conversations: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Open a new conversation between the sender and `counterparty`. Aborts if a conversation already exists.
    public fun open(
        registry: &mut ConversationRegistry,
        counterparty: address,
        policy_id: vector<u8>,
        ctx: &mut tx_context::TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let conversation = open_internal(registry, sender, counterparty, policy_id, ctx);

        event::emit(ConversationCreatedEvent {
            conversation_id: object::uid_to_inner(&conversation.id),
            participant_a: conversation.participant_a,
            participant_b: conversation.participant_b,
            policy_id: clone_vector(&conversation.policy_id),
            created_epoch: conversation.created_epoch,
        });

        transfer::share_object(conversation);
    }

    /// Send a ciphertext message into the conversation.
    public fun send(
        conversation: &mut Conversation,
        recipient: address,
        ciphertext: vector<u8>,
        meta: vector<u8>,
        policy_id: vector<u8>,
        walrus_blob: Option<string::String>,
        ctx: &mut tx_context::TxContext,
    ) {
        send_internal(
            conversation,
            recipient,
            ciphertext,
            meta,
            policy_id,
            walrus_blob,
            ctx,
            true,
        );
    }

    #[allow(unused_mut_parameter)]
    fun send_internal(
        conversation: &mut Conversation,
        recipient: address,
        ciphertext: vector<u8>,
        meta: vector<u8>,
        policy_id: vector<u8>,
        walrus_blob: Option<string::String>,
        ctx: &mut tx_context::TxContext,
        emit_events: bool,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(
            is_participant(conversation, sender) && is_participant(conversation, recipient),
            E_NOT_PARTICIPANT
        );
        assert!(sender != recipient, E_INVALID_PARTICIPANTS);
        assert_policy_matches(&conversation.policy_id, &policy_id);

        ensure_lengths(&ciphertext, &meta, &policy_id, &walrus_blob);

        let sequence = conversation.next_seq + 1;
        conversation.next_seq = sequence;
        conversation.last_message_epoch = tx_context::epoch(ctx);

        let ciphertext_digest = if (emit_events) {
            option::some(hash::blake2b256(&ciphertext))
        } else {
            option::none()
        };
        let meta_digest = if (emit_events) {
            option::some(hash::blake2b256(&meta))
        } else {
            option::none()
        };
        let has_attachment = if (emit_events) {
            option::is_some(&walrus_blob)
        } else {
            false
        };

        table::add(
            &mut conversation.messages,
            sequence,
            MessageRecord {
                sender,
                recipient,
                ciphertext,
                meta,
                policy_id,
                walrus_blob,
                created_epoch: conversation.last_message_epoch,
                read_epoch: option::none(),
            },
        );

        if (emit_events) {
            event::emit(MessageSentEvent {
                conversation_id: object::uid_to_inner(&conversation.id),
                sequence,
                sender,
                recipient,
                ciphertext_digest: option::destroy_some(ciphertext_digest),
                meta_digest: option::destroy_some(meta_digest),
                has_attachment,
                created_epoch: conversation.last_message_epoch,
            });
        } else {
            option::destroy_none(ciphertext_digest);
            option::destroy_none(meta_digest);
        };
    }

    /// Mark a message as read by the recipient.
    public fun mark_read(
        conversation: &mut Conversation,
        sequence: u64,
        ctx: &mut tx_context::TxContext,
    ) {
        mark_read_internal(conversation, sequence, ctx, true);
    }

    #[allow(unused_mut_parameter)]
    fun mark_read_internal(
        conversation: &mut Conversation,
        sequence: u64,
        ctx: &mut tx_context::TxContext,
        emit_events: bool,
    ) {
        assert!(table::contains(&conversation.messages, sequence), E_MESSAGE_NOT_FOUND);
        let sender = tx_context::sender(ctx);
        let message = table::borrow_mut(&mut conversation.messages, sequence);
        assert!(message.recipient == sender, E_UNAUTHORIZED_MARK_READ);
        if (option::is_some(&message.read_epoch)) {
            abort E_ALREADY_READ
        };

        let read_epoch = tx_context::epoch(ctx);
        message.read_epoch = option::some(read_epoch);

        if (emit_events) {
            event::emit(MessageReadEvent {
                conversation_id: object::uid_to_inner(&conversation.id),
                sequence,
                reader: sender,
                read_epoch,
            });
        };
    }

    /// Return participant tuple for clients that need to inspect the conversation.
    public fun participants(conversation: &Conversation): (address, address) {
        (conversation.participant_a, conversation.participant_b)
    }

    /// Returns the policy identifier attached to the conversation.
    public fun policy(conversation: &Conversation): &vector<u8> {
        &conversation.policy_id
    }

    /// Total messages recorded (sequence number of the latest message).
    public fun latest_sequence(conversation: &Conversation): u64 {
        conversation.next_seq
    }

    /// Borrow a specific message by sequence number.
    public fun message(
        conversation: &Conversation,
        sequence: u64,
    ): &MessageRecord {
        table::borrow(&conversation.messages, sequence)
    }

    /// Snapshot view for off-chain clients (accessible via dev-inspect).
    public fun message_snapshot(
        conversation: &Conversation,
        sequence: u64,
    ): MessageSnapshot {
        let message_ref = table::borrow(&conversation.messages, sequence);

        MessageSnapshot {
            sequence,
            sender: message_ref.sender,
            recipient: message_ref.recipient,
            ciphertext: clone_vector(&message_ref.ciphertext),
            meta: clone_vector(&message_ref.meta),
            policy_id: clone_vector(&message_ref.policy_id),
            walrus_blob: clone_option_string(&message_ref.walrus_blob),
            created_epoch: message_ref.created_epoch,
            read_epoch: message_ref.read_epoch,
            ciphertext_digest: hash::blake2b256(&message_ref.ciphertext),
            meta_digest: hash::blake2b256(&message_ref.meta),
        }
    }

    /// Sender address for a stored message record.
    public fun message_sender(message: &MessageRecord): address {
        message.sender
    }

    /// Recipient address for a stored message record.
    public fun message_recipient(message: &MessageRecord): address {
        message.recipient
    }

    /// Ciphertext length helper to avoid leaking field visibility.
    public fun message_ciphertext_len(message: &MessageRecord): u64 {
        vector::length(&message.ciphertext)
    }

    /// Read receipt state for a message.
    public fun message_read_epoch(message: &MessageRecord): &option::Option<u64> {
        &message.read_epoch
    }

    /// Max ciphertext size allowed by the contract.
    public fun ciphertext_limit(): u64 {
        MAX_CIPHERTEXT_BYTES
    }

    fun open_internal(
        registry: &mut ConversationRegistry,
        participant_a: address,
        participant_b: address,
        policy_id: vector<u8>,
        ctx: &mut tx_context::TxContext,
    ): Conversation {
        assert!(participant_a != participant_b, E_INVALID_PARTICIPANTS);
        ensure_policy_length(&policy_id);

        let key = key_for_pair(participant_a, participant_b);
        let key_for_insert = key;
        assert!(
            !table::contains(&registry.conversations, key),
            E_DUPLICATE_CONVERSATION
        );

        let conversation = Conversation {
            id: object::new(ctx),
            participant_a,
            participant_b,
            policy_id,
            created_epoch: tx_context::epoch(ctx),
            last_message_epoch: 0,
            next_seq: 0,
            messages: table::new(ctx),
        };

        let conversation_id = object::uid_to_inner(&conversation.id);
        table::add(&mut registry.conversations, key_for_insert, conversation_id);

        conversation
    }

    fun ensure_lengths(
        ciphertext: &vector<u8>,
        meta: &vector<u8>,
        policy_id: &vector<u8>,
        walrus_blob: &Option<string::String>,
    ) {
        let ciphertext_len = vector::length(ciphertext);
        let meta_len = vector::length(meta);
        let policy_len = vector::length(policy_id);
        let walrus_len = walrus_length(walrus_blob);

        assert!(ciphertext_len <= MAX_CIPHERTEXT_BYTES, E_PAYLOAD_TOO_LARGE);
        assert!(meta_len <= MAX_META_BYTES, E_PAYLOAD_TOO_LARGE);
        assert!(policy_len <= MAX_POLICY_BYTES, E_PAYLOAD_TOO_LARGE);
        assert!(walrus_len <= MAX_WALRUS_LINK_BYTES, E_PAYLOAD_TOO_LARGE);
    }

    fun ensure_policy_length(policy_id: &vector<u8>) {
        let policy_len = vector::length(policy_id);
        assert!(policy_len <= MAX_POLICY_BYTES && policy_len > 0, E_PAYLOAD_TOO_LARGE);
    }

    fun walrus_length(walrus_blob: &Option<string::String>): u64 {
        if (option::is_some(walrus_blob)) {
            string::length(option::borrow(walrus_blob))
        } else {
            0
        }
    }

    fun is_participant(conversation: &Conversation, participant: address): bool {
        conversation.participant_a == participant || conversation.participant_b == participant
    }

    fun key_for_pair(a: address, b: address): ConversationKey {
        let (first, second) = ordered_pair(a, b);
        ConversationKey { first, second }
    }

    fun assert_policy_matches(expected: &vector<u8>, provided: &vector<u8>) {
        assert!(vector_equals(expected, provided), E_POLICY_MISMATCH);
    }

    fun vector_equals(left: &vector<u8>, right: &vector<u8>): bool {
        let left_len = vector::length(left);
        if (left_len != vector::length(right)) {
            return false
        };

        let mut i = 0;
        while (i < left_len) {
            if (*vector::borrow(left, i) != *vector::borrow(right, i)) {
                return false
            };
            i = i + 1;
        };
        true
    }

    fun clone_vector(source: &vector<u8>): vector<u8> {
        let mut copy_vec = vector::empty<u8>();
        let len = vector::length(source);
        let mut i = 0;
        while (i < len) {
            let byte = *vector::borrow(source, i);
            vector::push_back(&mut copy_vec, byte);
            i = i + 1;
        };
        copy_vec
    }

    fun clone_string(value: &string::String): string::String {
        let bytes_ref = string::as_bytes(value);
        let mut cloned = vector::empty<u8>();
        let len = vector::length(bytes_ref);
        let mut i = 0;
        while (i < len) {
            let byte = *vector::borrow(bytes_ref, i);
            vector::push_back(&mut cloned, byte);
            i = i + 1;
        };
        string::utf8(cloned)
    }

    fun clone_option_string(option_string: &Option<string::String>): Option<string::String> {
        if (option::is_some(option_string)) {
            let borrowed = option::borrow(option_string);
            option::some(clone_string(borrowed))
        } else {
            option::none()
        }
    }

    fun ordered_pair(a: address, b: address): (address, address) {
        if (address_less_than(a, b)) {
            (a, b)
        } else {
            (b, a)
        }
    }

    fun address_less_than(a: address, b: address): bool {
        let bytes_a = bcs::to_bytes(&a);
        let bytes_b = bcs::to_bytes(&b);
        let len = vector::length(&bytes_a);
        let mut i = 0;
        let mut result = false;
        let mut decided = false;
        while (i < len) {
            if (!decided) {
                let byte_a = *vector::borrow(&bytes_a, i);
                let byte_b = *vector::borrow(&bytes_b, i);
                if (byte_a != byte_b) {
                    result = byte_a < byte_b;
                    decided = true;
                };
            };
            i = i + 1;
        };
        result
    }

    #[test_only]
    public fun testing_new_registry(ctx: &mut tx_context::TxContext): ConversationRegistry {
        ConversationRegistry {
            id: object::new(ctx),
            conversations: table::new(ctx),
        }
    }

    #[test_only]
    public fun testing_open_conversation(
        registry: &mut ConversationRegistry,
        participant_a: address,
        participant_b: address,
        policy_id: vector<u8>,
        ctx: &mut tx_context::TxContext,
    ): Conversation {
        open_internal(registry, participant_a, participant_b, policy_id, ctx)
    }

    #[test_only]
    public fun testing_send(
        conversation: &mut Conversation,
        recipient: address,
        ciphertext: vector<u8>,
        meta: vector<u8>,
        policy_id: vector<u8>,
        walrus_blob: Option<string::String>,
        ctx: &mut tx_context::TxContext,
    ) {
        send_internal(
            conversation,
            recipient,
            ciphertext,
            meta,
            policy_id,
            walrus_blob,
            ctx,
            false,
        );
    }

    #[test_only]
    public fun testing_mark_read(
        conversation: &mut Conversation,
        sequence: u64,
        ctx: &mut tx_context::TxContext,
    ) {
        mark_read_internal(conversation, sequence, ctx, false);
    }

    #[test_only]
    public fun testing_destroy_conversation(
        registry: &mut ConversationRegistry,
        conversation: Conversation,
    ) {
        let Conversation {
            id,
            participant_a,
            participant_b,
            policy_id: _,
            created_epoch: _,
            last_message_epoch: _,
            next_seq,
            messages,
        } = conversation;

        let key = key_for_pair(participant_a, participant_b);
        let _ = table::remove(&mut registry.conversations, key);

        drop_messages(messages, next_seq);
        object::delete(id);
    }

    #[test_only]
    public fun testing_destroy_registry(registry: ConversationRegistry) {
        let ConversationRegistry { id, conversations } = registry;
        assert!(table::length(&conversations) == 0, E_DUPLICATE_CONVERSATION);
        table::destroy_empty(conversations);
        object::delete(id);
    }

    #[test_only]
    fun drop_messages(mut messages: table::Table<u64, MessageRecord>, next_seq: u64) {
        let mut seq = 1;
        while (seq <= next_seq) {
            if (table::contains(&messages, seq)) {
                let _ = table::remove(&mut messages, seq);
            };
            seq = seq + 1;
        };
        table::destroy_empty(messages);
    }
}
