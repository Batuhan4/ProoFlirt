## **Prooflirt**

### **Overview**

A privacy-preserving, decentralized dating protocol built on the **Sui** network.  
 User identity and behavior are verified through **Zero-Knowledge Proofs (ZKPs)**.  
 Profiles exist as on-chain **Sui objects**, while media content is stored off-chain on **Walrus**.

---

### **Core Components**

1. **Profile Object (On-chain)**

   * Each user is represented as a **Sui object**.

   * Contains: identity hash, ZK identity data, compatibility score, trust score, media references (CID).

   * Objects are versioned; updates create new immutable states.

2. **Media Storage (Off-chain)**

   * Profile photos, videos, and audio files stored on **Walrus**.

   * Files are static and tamper-proof.

   * Each file’s **hash \+ CID** is recorded on-chain for verification.

3. **ZK Login**

   * Authentication via Zero-Knowledge Proofs without revealing identity.

   * Confirms the user is a verified human, not a bot or fake account.

4. **ZK Trust Score**

   * Dynamic trust metric derived from user interactions and community feedback.

   * Managed and updated by DAO-defined logic.

   * Optional QR-based attendance or identity verification.

5. **Location Verification**

   * QR or device-based location proof.

   * Example use: verifying “I arrived / they didn’t” scenarios for real-world meetups.

6. **AI Profile Moderation**

   * AI validates uploaded profile photos to prevent fake or inappropriate images.

7. **ZK-Encrypted Messaging**

   * Fully encrypted, peer-to-peer messaging secured by ZK authentication.

   * Content readable only by participants.

8. **Fake Report System**

   * Fake account or spam reports verified via ZK proofs and community voting.

   * Confirmed violations trigger penalties or stake burns.

9. **Economic Layer**

   * **Premium membership:** unlocks advanced features.

   * **Tipping system:** users can send tokens to others.

   * **Penalty mechanism:** token deductions for ghosting or misconduct.

10. **Mobile PWA Experience**

   * Mobile-first responsive UI optimized for phones as the primary device.

   * Installable Progressive Web App with offline profile caching and push notifications.

   * Service worker manages background sync for messages and meetup updates.

### **Create Profile Flow (Walrus + Sui)**

1. **UI capture** – `apps/web/app/onboarding/create-profile/page.tsx` gathers the user’s display data, interests, and at least one primary photo. Files never leave the browser unprocessed.

2. **Client-side hashing & moderation** – The browser computes a SHA-256 digest for every file (used for the `file_hash` field in `contracts/sources/profile.move`) and runs AI moderation before uploading.

3. **Upload to Walrus** – Approved media is sent to the Walrus publisher (see `walrus-integration.md` for HTTP examples). Walrus returns a `blobId`; the public aggregator URL (`<aggregator>/v1/blobs/<blobId>`) becomes the immutable `walrus_link`.

4. **Contract call** – The frontend builds a `MediaRecord` via `prooflirt::profile::new_media_record` and submits it to `prooflirt::profile::create_profile`. The contract stores the `walrus_link`, MIME type, and hash on-chain while the bytes live on Walrus.

5. **Future edits** – When users replace media, new Walrus blobs are minted and `prooflirt::profile::update_media` swaps the on-chain references without touching past versions.

---

### **Advantages**

* Real verified users; fake profiles are technically impossible.

* Complete privacy through ZK authentication.

* Scalable media handling via Walrus.

* High throughput and low latency using Sui’s parallel execution.

* Mobile-friendly PWA with offline-first UX and push-enabled engagement.
