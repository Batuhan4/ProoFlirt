/// Tests for the Prooflirt profile module.
#[test_only]
module prooflirt::profile_tests;

use prooflirt::profile;
use std::string::String;
use sui::test_scenario;

const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;

#[test]
fun test_create_profile_stores_expected_fields() {
    let mut scenario = test_scenario::begin(ALICE);
    let mut registry = profile::testing_new_registry(scenario.ctx());

    let profile_obj = profile::testing_create_profile(
        &mut registry,
        b"Alice".to_string(),
        b"Privacy-forward dating".to_string(),
        vector[
            b"Web3".to_string(),
            b"ZK Proofs".to_string(),
        ],
        vector[1u8, 2u8, 3u8],
        vector[9u8, 9u8, 9u8],
        sample_media(b"https://walrus.example/primary".to_string()),
        vector::empty(),
        88,
        92,
        ALICE,
        scenario.ctx(),
    );

    assert!(profile::profile_exists(&registry, ALICE), 0);
    let stored_id = profile::profile_id_for(&registry, ALICE);
    assert!(std::option::is_some(&stored_id), 1);
    let profile_id = profile::profile_object_id(&profile_obj);
    assert!(profile_id == std::option::destroy_some(stored_id), 2);

    assert!(profile::profile_owner(&profile_obj) == ALICE, 3);
    assert!(*profile::profile_display_name(&profile_obj) == b"Alice".to_string(), 4);
    assert!(profile::profile_version(&profile_obj) == 1, 5);

    profile::testing_destroy_profile(profile_obj);
    profile::testing_destroy_registry(registry);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = profile::E_PROFILE_EXISTS)]
fun test_duplicate_profile_abort() {
    let mut scenario = test_scenario::begin(ALICE);
    let mut registry = profile::testing_new_registry(scenario.ctx());

    let first_profile = profile::testing_create_profile(
        &mut registry,
        b"Alice".to_string(),
        b"First profile".to_string(),
        vector[b"Move".to_string()],
        vector[1u8],
        vector[2u8],
        sample_media(b"https://walrus.example/main".to_string()),
        vector::empty(),
        10,
        20,
        ALICE,
        scenario.ctx(),
    );
    profile::testing_destroy_profile(first_profile);

    let duplicate_profile = profile::testing_create_profile(
        &mut registry,
        b"Alice".to_string(),
        b"Duplicate".to_string(),
        vector[b"Move".to_string()],
        vector[1u8],
        vector[2u8],
        sample_media(b"https://walrus.example/again".to_string()),
        vector::empty(),
        10,
        20,
        ALICE,
        scenario.ctx(),
    );
    profile::testing_destroy_profile(duplicate_profile);

    abort
}

#[test]
#[expected_failure(abort_code = profile::E_NOT_PROFILE_OWNER)]
fun test_update_persona_wrong_sender() {
    let mut scenario = test_scenario::begin(ALICE);
    let mut registry = profile::testing_new_registry(scenario.ctx());

    let mut profile_obj = profile::testing_create_profile(
        &mut registry,
        b"Alice".to_string(),
        b"Legit user".to_string(),
        vector[b"ZK".to_string()],
        vector[0u8],
        vector[1u8],
        sample_media(b"https://walrus.example/a.png".to_string()),
        vector::empty(),
        50,
        50,
        ALICE,
        scenario.ctx(),
    );

    profile::testing_destroy_registry(registry);
    scenario.next_tx(BOB);
    profile::testing_update_persona(
        &mut profile_obj,
        b"Malicious".to_string(),
        b"I hacked this profile".to_string(),
        vector[b"Hacking".to_string()],
        scenario.ctx(),
        BOB,
    );

    abort
}

#[test]
#[expected_failure(abort_code = profile::E_ADMIN_ONLY)]
fun test_update_scores_requires_admin() {
    let mut scenario = test_scenario::begin(ALICE);
    let mut registry = profile::testing_new_registry(scenario.ctx());
    let admin_cap = profile::testing_new_admin_cap(ALICE, scenario.ctx());

    let mut profile_obj = profile::testing_create_profile(
        &mut registry,
        b"Alice".to_string(),
        b"Legit user".to_string(),
        vector[b"ZK".to_string()],
        vector[0u8],
        vector[1u8],
        sample_media(b"https://walrus.example/a.png".to_string()),
        vector::empty(),
        50,
        50,
        ALICE,
        scenario.ctx(),
    );

    profile::testing_destroy_registry(registry);
    scenario.next_tx(BOB);
    profile::testing_update_scores(
        &admin_cap,
        &mut profile_obj,
        10,
        5,
        scenario.ctx(),
        BOB,
    );

    abort
}

fun sample_media(link: String): profile::MediaRecord {
    profile::new_media_record(
        link,
        b"image/png".to_string(),
        b"sample-hash",
    )
}
