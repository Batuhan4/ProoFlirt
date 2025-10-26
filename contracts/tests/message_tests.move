/// Tests covering the prooflirt::message module.
#[allow(duplicate_alias)]
#[test_only]
module prooflirt::message_tests;

use prooflirt::message;
use std::option;
use std::string::String;
use std::vector;
use sui::test_scenario;

const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;
const CAROL: address = @0xCAFE;

#[test]
fun test_open_and_send_flow() {
    let mut scenario = test_scenario::begin(ALICE);
    let mut registry = message::testing_new_registry(scenario.ctx());
    let mut conversation = message::testing_open_conversation(
        &mut registry,
        ALICE,
        BOB,
        sample_policy(),
        scenario.ctx(),
    );

    let ciphertext = vector[0u8, 1u8, 2u8];
    let meta = vector[9u8];
    message::testing_send(
        &mut conversation,
        BOB,
        ciphertext,
        meta,
        sample_policy(),
        no_attachment(),
        scenario.ctx(),
    );

    let record = message::message(&conversation, 1);
    assert!(message::message_sender(record) == ALICE, 0);
    assert!(message::message_recipient(record) == BOB, 1);
    assert!(message::message_ciphertext_len(record) == 3, 2);
    assert!(message::latest_sequence(&conversation) == 1, 3);

    scenario.next_tx(BOB);
    message::testing_mark_read(&mut conversation, 1, scenario.ctx());

    let record_after_read = message::message(&conversation, 1);
    assert!(option::is_some(message::message_read_epoch(record_after_read)), 4);

    message::testing_destroy_conversation(&mut registry, conversation);
    message::testing_destroy_registry(registry);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = message::E_NOT_PARTICIPANT)]
fun test_third_party_cannot_send() {
    let mut scenario = test_scenario::begin(ALICE);
    let mut registry = message::testing_new_registry(scenario.ctx());
    let mut conversation = message::testing_open_conversation(
        &mut registry,
        ALICE,
        BOB,
        sample_policy(),
        scenario.ctx(),
    );

    scenario.next_tx(CAROL);
    message::testing_send(
        &mut conversation,
        BOB,
        vector[1u8],
        vector::empty<u8>(),
        sample_policy(),
        no_attachment(),
        scenario.ctx(),
    );

    message::testing_destroy_conversation(&mut registry, conversation);
    message::testing_destroy_registry(registry);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = message::E_PAYLOAD_TOO_LARGE)]
fun test_ciphertext_limit_enforced() {
    let mut scenario = test_scenario::begin(ALICE);
    let mut registry = message::testing_new_registry(scenario.ctx());
    let mut conversation = message::testing_open_conversation(
        &mut registry,
        ALICE,
        BOB,
        sample_policy(),
        scenario.ctx(),
    );

    let mut oversized = vector::empty<u8>();
    let mut i = 0;
    while (i < message::ciphertext_limit() + 1) {
        vector::push_back(&mut oversized, 1u8);
        i = i + 1;
    };

    message::testing_send(
        &mut conversation,
        BOB,
        oversized,
        vector::empty<u8>(),
        sample_policy(),
        no_attachment(),
        scenario.ctx(),
    );

    message::testing_destroy_conversation(&mut registry, conversation);
    message::testing_destroy_registry(registry);
    scenario.end();
}

fun sample_policy(): vector<u8> {
    vector[0xAA, 0xBB, 0xCC]
}

fun no_attachment(): option::Option<String> {
    option::none()
}
