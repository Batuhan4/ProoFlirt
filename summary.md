# Proo**F**lirt: One-Page Project Summary

---

### **Vision**

Proo**F**lirt (from **Proof** + **Flirt**) is a decentralized dating protocol that uses Zero-Knowledge Proofs (ZKPs) and the Sui blockchain to create a secure, private, and fair online dating experience where all users are verified and in control of their own data.

### **The Problem**

Modern online dating is plagued by fake profiles, bots, and centralized platforms that harvest and misuse user data. This creates a low-trust environment where users are the product, not the customer.

### **The Solution: Key Features**

Proo**F**lirt addresses these issues with a unique combination of on-chain and off-chain technologies:

*   **ZK-Verified Users:** Utilizes Sui's **ZK-Login** to ensure every user is a real person, effectively eliminating bots and catfishing. Users authenticate with existing OAuth credentials (e.g., Google) to generate a proof of identity without revealing private information.

*   **User-Owned Profiles:** Each user's profile is an **on-chain Sui object** (`Profile`) that they own in their crypto wallet. This gives them full control over their data, which cannot be deleted or modified by a central authority.

*   **Decentralized & Verifiable Media:** Media files (photos, videos) are stored on the **Walrus decentralized storage network**. The on-chain profile stores only a link to the media and a **client-side hash** of the file, guaranteeing that the media cannot be tampered with.

*   **Dynamic Trust Score:** A novel on-chain metric (`trust_score`) that quantifies user authenticity. The score is initially boosted by an **AI-powered photo analysis** (using Gemini) that verifies the profile picture is of a real human. The score can be updated via a governance mechanism (`AdminCap`), creating a reputation system.

*   **Private, Encrypted Messaging:** A peer-to-peer messaging system where conversations are **end-to-end encrypted**. The `message` smart contract acts as a secure transport layer, but has no access to the message content, ensuring complete privacy.

### **Technology Stack**

*   **Blockchain:** Sui Network
*   **Smart Contracts:** Move
*   **Frontend:** Next.js / React (PWA)
*   **Authentication:** Sui ZK-Login (OpenID Connect with ZKPs)
*   **Storage:** Walrus (for off-chain media)
*   **AI:** Google Gemini (for profile photo analysis)

### **The Future**

Proo**F**lirt is building a new paradigm for online social interaction—one founded on cryptographic truth and user sovereignty. It's a protocol for trustworthy human connection, designed for the decentralized web.