/// Prooflirt profile storage contracts.
///
/// The module stores user profile metadata on-chain while images remain off-chain on Walrus.
/// It follows the patterns described in the Sui Move book for shared object registries and
/// capability-gated administration.
module prooflirt::profile {
    use std::string::String;

    /// Maximum number of interests that can be stored for a single profile.
    const MAX_INTERESTS: u64 = 5;
    /// Maximum number of gallery media references aside from the primary media slot.
    const MAX_GALLERY_ITEMS: u64 = 12;

    const E_PROFILE_EXISTS: u64 = 0;
    const E_NOT_PROFILE_OWNER: u64 = 1;
    const E_TOO_MANY_INTERESTS: u64 = 2;
    const E_EMPTY_INTEREST: u64 = 3;
    const E_TOO_MANY_MEDIA_ITEMS: u64 = 4;
    const E_MEDIA_LINK_REQUIRED: u64 = 5;
    const E_ADMIN_ONLY: u64 = 6;
    const E_EMPTY_GENDER: u64 = 7;
    const E_EMPTY_GENDER_PREF: u64 = 8;

    const UPDATE_PERSONA: u8 = 1;
    const UPDATE_MEDIA: u8 = 2;
    const UPDATE_SCORES: u8 = 3;
    const UPDATE_IDENTITY: u8 = 4;

    /// Pointer to media that lives on Walrus.
    public struct MediaRecord has store, drop {
        walrus_link: String,
        mime_type: String,
        /// Hash of the media file (e.g. BLAKE2 or SHA-256 digest).
        file_hash: vector<u8>,
    }

    /// Primary profile object stored for each user.
    public struct Profile has key {
        id: sui::object::UID,
        owner: address,
        display_name: String,
        bio: String,
        gender: String,
        preferred_gender: String,
        interests: vector<String>,
        identity_hash: vector<u8>,
        zk_identity_commitment: vector<u8>,
        primary_media: MediaRecord,
        gallery: vector<MediaRecord>,
        compatibility_score: u64,
        trust_score: u64,
        version: u64,
        last_updated_epoch: u64,
    }

    /// Shared registry that ensures a single profile per address.
    public struct ProfileRegistry has key {
        id: sui::object::UID,
        profiles: sui::table::Table<address, sui::object::ID>,
    }

    /// Capability that authorizes governance-controlled updates such as trust scoring.
    public struct AdminCap has key {
        id: sui::object::UID,
        operator: address,
    }

    public struct RegistryCreatedEvent has copy, drop {
        registry_id: sui::object::ID,
        admin_cap_id: sui::object::ID,
        operator: address,
    }

    public struct ProfileCreatedEvent has copy, drop {
        profile_id: sui::object::ID,
        owner: address,
        version: u64,
    }

    public struct ProfileUpdatedEvent has copy, drop {
        profile_id: sui::object::ID,
        owner: address,
        version: u64,
        update_kind: u8,
    }

    /// Initialize the registry and mint the first admin capability.
    ///
    /// This function is invoked automatically when the package is published.
    fun init(ctx: &mut sui::tx_context::TxContext) {
        let sender = sui::tx_context::sender(ctx);
        let registry = ProfileRegistry {
            id: sui::object::new(ctx),
            profiles: sui::table::new(ctx),
        };
        let registry_id = sui::object::uid_to_inner(&registry.id);

        let admin_cap = AdminCap {
            id: sui::object::new(ctx),
            operator: sender,
        };
        let admin_cap_id = sui::object::uid_to_inner(&admin_cap.id);

        sui::event::emit(RegistryCreatedEvent {
            registry_id,
            admin_cap_id,
            operator: sender,
        });

        sui::transfer::share_object(registry);
        sui::transfer::transfer(admin_cap, sender);
    }

    /// Helper to build a media record for Walrus-hosted assets.
    public fun new_media_record(
        walrus_link: String,
        mime_type: String,
        file_hash: vector<u8>,
    ): MediaRecord {
        assert!(std::string::length(&walrus_link) > 0, E_MEDIA_LINK_REQUIRED);
        MediaRecord {
            walrus_link,
            mime_type,
            file_hash,
        }
    }

    /// Create a profile and map it to the caller in the registry.
    public fun create_profile(
        registry: &mut ProfileRegistry,
        display_name: String,
        bio: String,
        gender: String,
        preferred_gender: String,
        interests: vector<String>,
        identity_hash: vector<u8>,
        zk_identity_commitment: vector<u8>,
        primary_media: MediaRecord,
        gallery: vector<MediaRecord>,
        compatibility_score: u64,
        trust_score: u64,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let sender = sui::tx_context::sender(ctx);
        let profile = create_profile_internal(
            registry,
            display_name,
            bio,
            gender,
            preferred_gender,
            interests,
            identity_hash,
            zk_identity_commitment,
            primary_media,
            gallery,
            compatibility_score,
            trust_score,
            sender,
            true,
            ctx,
        );
        sui::transfer::transfer(profile, sender);
    }

    /// Check if a given address has previously created a profile.
    public fun profile_exists(registry: &ProfileRegistry, owner: address): bool {
        sui::table::contains(&registry.profiles, owner)
    }

    /// Fetch the profile object ID associated with an address, if present.
    public fun profile_id_for(
        registry: &ProfileRegistry,
        owner: address,
    ): std::option::Option<sui::object::ID> {
        if (!sui::table::contains(&registry.profiles, owner)) {
            std::option::none()
        } else {
            std::option::some(*sui::table::borrow(&registry.profiles, owner))
        }
    }

    /// Return the on-chain object ID for a profile.
    public fun profile_object_id(profile: &Profile): sui::object::ID {
        sui::object::uid_to_inner(&profile.id)
    }

    /// Return the wallet address that owns this profile.
    public fun profile_owner(profile: &Profile): address {
        profile.owner
    }

    /// Return a reference to the display name stored on the profile.
    public fun profile_display_name(profile: &Profile): &String {
        &profile.display_name
    }

    /// Current version for the profile object.
    public fun profile_version(profile: &Profile): u64 {
        profile.version
    }

    /// Update display metadata alongside the caller's interest list.
    public fun update_persona(
        profile: &mut Profile,
        display_name: String,
        bio: String,
        gender: String,
        preferred_gender: String,
        interests: vector<String>,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let sender = sui::tx_context::sender(ctx);
        update_persona_internal(
            profile,
            display_name,
            bio,
            gender,
            preferred_gender,
            interests,
            ctx,
            sender,
            true,
        );
    }

    /// Update the caller's identity commitments without touching presentation data.
    public fun update_identity(
        profile: &mut Profile,
        identity_hash: vector<u8>,
        zk_identity_commitment: vector<u8>,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let sender = sui::tx_context::sender(ctx);
        update_identity_internal(
            profile,
            identity_hash,
            zk_identity_commitment,
            ctx,
            sender,
            true,
        );
    }

    /// Refresh Walrus links after the off-chain assets are moderated and stored.
    public fun update_media(
        profile: &mut Profile,
        primary_media: MediaRecord,
        gallery: vector<MediaRecord>,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let sender = sui::tx_context::sender(ctx);
        update_media_internal(profile, primary_media, gallery, ctx, sender, true);
    }

    /// Governance-controlled update that adjusts trust and compatibility scoring.
    #[allow(unused_mut_parameter)]
    public fun update_scores(
        admin_cap: &AdminCap,
        profile: &mut Profile,
        compatibility_score: u64,
        trust_score: u64,
        ctx: &mut sui::tx_context::TxContext,
    ) {
        let sender = sui::tx_context::sender(ctx);
        update_scores_internal(admin_cap, profile, compatibility_score, trust_score, ctx, sender, true);
    }

    /// Rotate the admin capability to a new operator.
    public fun rotate_admin(
        admin_cap: AdminCap,
        new_operator: address,
        ctx: &sui::tx_context::TxContext,
    ) {
        let sender = sui::tx_context::sender(ctx);
        let mut cap = admin_cap;
        assert_admin_sender(&cap, sender);
        cap.operator = new_operator;
        sui::transfer::transfer(cap, new_operator);
    }

    fun emit_update(profile: &Profile, owner: address, version: u64, update_kind: u8) {
        sui::event::emit(ProfileUpdatedEvent {
            profile_id: sui::object::uid_to_inner(&profile.id),
            owner,
            version,
            update_kind,
        });
    }

    fun bump_version(
        profile: &mut Profile,
        ctx: &sui::tx_context::TxContext,
    ): u64 {
        profile.version = profile.version + 1;
        profile.last_updated_epoch = sui::tx_context::epoch(ctx);
        profile.version
    }

    fun assert_profile_owner(profile: &Profile, sender: address) {
        assert!(profile.owner == sender, E_NOT_PROFILE_OWNER);
    }

    fun assert_admin_sender(cap: &AdminCap, sender: address) {
        assert!(cap.operator == sender, E_ADMIN_ONLY);
    }

    fun ensure_valid_interests(interests: &vector<String>) {
        let count = vector::length(interests);
        assert!(count <= MAX_INTERESTS, E_TOO_MANY_INTERESTS);

        let mut i = 0;
        while (i < count) {
            let interest = vector::borrow(interests, i);
            assert!(std::string::length(interest) > 0, E_EMPTY_INTEREST);
            i = i + 1;
        }
    }

    fun ensure_valid_gender_fields(gender: &String, preferred_gender: &String) {
        assert!(std::string::length(gender) > 0, E_EMPTY_GENDER);
        assert!(
            std::string::length(preferred_gender) > 0,
            E_EMPTY_GENDER_PREF
        );
    }

    fun ensure_valid_media(primary: &MediaRecord, gallery: &vector<MediaRecord>) {
        assert!(std::string::length(&primary.walrus_link) > 0, E_MEDIA_LINK_REQUIRED);
        let mut i = 0;
        let limit = vector::length(gallery);
        assert!(limit <= MAX_GALLERY_ITEMS, E_TOO_MANY_MEDIA_ITEMS);
        while (i < limit) {
            let item = vector::borrow(gallery, i);
            assert!(std::string::length(&item.walrus_link) > 0, E_MEDIA_LINK_REQUIRED);
            i = i + 1;
        }
    }

    fun create_profile_internal(
        registry: &mut ProfileRegistry,
        display_name: String,
        bio: String,
        gender: String,
        preferred_gender: String,
        interests: vector<String>,
        identity_hash: vector<u8>,
        zk_identity_commitment: vector<u8>,
        primary_media: MediaRecord,
        gallery: vector<MediaRecord>,
        compatibility_score: u64,
        trust_score: u64,
        sender: address,
        emit_events: bool,
        ctx: &mut sui::tx_context::TxContext,
    ): Profile {
        assert!(
            !sui::table::contains(&registry.profiles, sender),
            E_PROFILE_EXISTS
        );
        ensure_valid_interests(&interests);
        ensure_valid_gender_fields(&gender, &preferred_gender);
        ensure_valid_media(&primary_media, &gallery);

        let profile = Profile {
            id: sui::object::new(ctx),
            owner: sender,
            display_name,
            bio,
            gender,
            preferred_gender,
            interests,
            identity_hash,
            zk_identity_commitment,
            primary_media,
            gallery,
            compatibility_score,
            trust_score,
            version: 1,
            last_updated_epoch: sui::tx_context::epoch(ctx),
        };
        let profile_id = sui::object::uid_to_inner(&profile.id);

        sui::table::add(&mut registry.profiles, sender, profile_id);
        if (emit_events) {
            sui::event::emit(ProfileCreatedEvent {
                profile_id,
                owner: sender,
                version: 1,
            });
        };
        profile
    }

    #[allow(unused_mut_parameter)]
    fun update_persona_internal(
        profile: &mut Profile,
        display_name: String,
        bio: String,
        gender: String,
        preferred_gender: String,
        interests: vector<String>,
        ctx: &mut sui::tx_context::TxContext,
        sender: address,
        emit_events: bool,
    ) {
        assert_profile_owner(profile, sender);
        ensure_valid_interests(&interests);
        ensure_valid_gender_fields(&gender, &preferred_gender);

        profile.display_name = display_name;
        profile.bio = bio;
        profile.gender = gender;
        profile.preferred_gender = preferred_gender;
        profile.interests = interests;

        let version = bump_version(profile, ctx);
        if (emit_events) {
            emit_update(profile, sender, version, UPDATE_PERSONA);
        }
    }

    #[allow(unused_mut_parameter)]
    fun update_identity_internal(
        profile: &mut Profile,
        identity_hash: vector<u8>,
        zk_identity_commitment: vector<u8>,
        ctx: &mut sui::tx_context::TxContext,
        sender: address,
        emit_events: bool,
    ) {
        assert_profile_owner(profile, sender);

        profile.identity_hash = identity_hash;
        profile.zk_identity_commitment = zk_identity_commitment;

        let version = bump_version(profile, ctx);
        if (emit_events) {
            emit_update(profile, sender, version, UPDATE_IDENTITY);
        }
    }

    #[allow(unused_mut_parameter)]
    fun update_media_internal(
        profile: &mut Profile,
        primary_media: MediaRecord,
        gallery: vector<MediaRecord>,
        ctx: &mut sui::tx_context::TxContext,
        sender: address,
        emit_events: bool,
    ) {
        assert_profile_owner(profile, sender);
        ensure_valid_media(&primary_media, &gallery);

        profile.primary_media = primary_media;
        profile.gallery = gallery;

        let version = bump_version(profile, ctx);
        if (emit_events) {
            emit_update(profile, sender, version, UPDATE_MEDIA);
        }
    }

    #[allow(unused_mut_parameter)]
    fun update_scores_internal(
        admin_cap: &AdminCap,
        profile: &mut Profile,
        compatibility_score: u64,
        trust_score: u64,
        ctx: &mut sui::tx_context::TxContext,
        sender: address,
        emit_events: bool,
    ) {
        assert_admin_sender(admin_cap, sender);

        profile.compatibility_score = compatibility_score;
        profile.trust_score = trust_score;

        let version = bump_version(profile, ctx);
        if (emit_events) {
            emit_update(profile, profile.owner, version, UPDATE_SCORES);
        }
    }

    #[test_only]
    public fun testing_new_registry(ctx: &mut sui::tx_context::TxContext): ProfileRegistry {
        ProfileRegistry {
            id: sui::object::new(ctx),
            profiles: sui::table::new(ctx),
        }
    }

    #[test_only]
    public fun testing_new_admin_cap(
        operator: address,
        ctx: &mut sui::tx_context::TxContext,
    ): AdminCap {
        AdminCap {
            id: sui::object::new(ctx),
            operator,
        }
    }

    #[test_only]
    public fun testing_create_profile(
        registry: &mut ProfileRegistry,
        display_name: String,
        bio: String,
        gender: String,
        preferred_gender: String,
        interests: vector<String>,
        identity_hash: vector<u8>,
        zk_identity_commitment: vector<u8>,
        primary_media: MediaRecord,
        gallery: vector<MediaRecord>,
        compatibility_score: u64,
        trust_score: u64,
        sender: address,
        ctx: &mut sui::tx_context::TxContext,
    ): Profile {
        create_profile_internal(
            registry,
            display_name,
            bio,
            gender,
            preferred_gender,
            interests,
            identity_hash,
            zk_identity_commitment,
            primary_media,
            gallery,
            compatibility_score,
            trust_score,
            sender,
            false,
            ctx,
        )
    }

    #[test_only]
    public fun testing_update_persona(
        profile: &mut Profile,
        display_name: String,
        bio: String,
        gender: String,
        preferred_gender: String,
        interests: vector<String>,
        ctx: &mut sui::tx_context::TxContext,
        sender: address,
    ) {
        update_persona_internal(
            profile,
            display_name,
            bio,
            gender,
            preferred_gender,
            interests,
            ctx,
            sender,
            false,
        );
    }

    #[test_only]
    #[allow(unused_mut_parameter)]
    public fun testing_update_identity(
        profile: &mut Profile,
        identity_hash: vector<u8>,
        zk_identity_commitment: vector<u8>,
        ctx: &mut sui::tx_context::TxContext,
        sender: address,
    ) {
        update_identity_internal(
            profile,
            identity_hash,
            zk_identity_commitment,
            ctx,
            sender,
            false,
        );
    }

    #[test_only]
    #[allow(unused_mut_parameter)]
    public fun testing_update_media(
        profile: &mut Profile,
        primary_media: MediaRecord,
        gallery: vector<MediaRecord>,
        ctx: &mut sui::tx_context::TxContext,
        sender: address,
    ) {
        update_media_internal(profile, primary_media, gallery, ctx, sender, false);
    }

    #[test_only]
    #[allow(unused_mut_parameter)]
    public fun testing_update_scores(
        admin_cap: &AdminCap,
        profile: &mut Profile,
        compatibility_score: u64,
        trust_score: u64,
        ctx: &mut sui::tx_context::TxContext,
        sender: address,
    ) {
        update_scores_internal(
            admin_cap,
            profile,
            compatibility_score,
            trust_score,
            ctx,
            sender,
            false,
        );
    }

    #[test_only]
    public fun testing_remove_registry_entry(
        registry: &mut ProfileRegistry,
        owner: address,
    ) {
        if (sui::table::contains(&registry.profiles, owner)) {
            let _ = sui::table::remove(&mut registry.profiles, owner);
        };
    }

    #[test_only]
    public fun testing_destroy_registry(registry: ProfileRegistry) {
        let ProfileRegistry { id, profiles } = registry;
        sui::table::drop(profiles);
        sui::object::delete(id);
    }

    #[test_only]
    public fun testing_destroy_admin_cap(admin_cap: AdminCap) {
        let AdminCap { id, operator: _ } = admin_cap;
        sui::object::delete(id);
    }

    #[test_only]
    public fun testing_destroy_profile(
        registry: &mut ProfileRegistry,
        profile: Profile,
    ) {
        let Profile {
            id,
            owner,
            display_name: _,
            bio: _,
            gender: _,
            preferred_gender: _,
            interests: _,
            identity_hash: _,
            zk_identity_commitment: _,
            primary_media: _,
            gallery: _,
            compatibility_score: _,
            trust_score: _,
            version: _,
            last_updated_epoch: _,
        } = profile;
        let _ = sui::table::remove(&mut registry.profiles, owner);
        sui::object::delete(id);
    }
}
