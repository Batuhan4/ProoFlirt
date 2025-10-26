# 💖 ProoFlirt 💖

**The future of dating is private, secure, and authentic. Say goodbye to catfishing and bots! 🚫🤖**

ProoFlirt is a revolutionary decentralized dating protocol built on the **Sui network**. We leverage the power of **Zero-Knowledge Proofs (ZKPs)** to ensure every user is a real, verified human. Your identity and data are kept private, while your connections are genuine.

## ✨ Core Features

- 🔒 **ZK Login:** Prove you're human without revealing sensitive information. Your privacy is paramount.
- ✅ **Verified Profiles:** Each user profile is an on-chain **Sui object**. This makes fake profiles and bots technically impossible.
- 📸 **Decentralized Media Storage:** Your profile photos and videos are stored off-chain on **Walrus**, a decentralized storage solution. Your media is secure and tamper-proof.
- 💯 **Trust Score:** A dynamic trust metric derived from user interactions and community feedback. This helps to build a safe and respectful community.
- 📍 **Location Verification:** Prove your attendance at real-world meetups using QR codes or device-based verification. No more "they didn't show up" debates.
- 🤖 **AI Profile Moderation:** Google Gemini reviews uploaded profile photos with a trust-focused prompt to block fake or irrelevant images before they ever reach the chain.
- 🤫 **ZK-Encrypted Messaging:** Enjoy fully encrypted, peer-to-peer messaging. Your conversations are secured by ZK authentication and are readable only by you and your match.
- 🚨 **Fake Report System:** A community-driven system to report and verify fake accounts or spam. Confirmed violations have real consequences.
- 💸 **Economic Layer:**
  - **Premium Membership:** Unlock advanced features.
  - **Penalties:** Discourage bad behavior like ghosting or misconduct through token deductions.
- 📱 **Mobile PWA Experience:** A mobile-first, responsive UI that works perfectly on your phone. Install it as a Progressive Web App for offline access and push notifications.

## 🚀 How It Works: Creating Your Profile

1.  **You provide your details:** Share your interests and photos through our user-friendly interface.
2.  **Your browser does the work:** Your files are processed locally in your browser for hashing and AI moderation before they are even uploaded.
3.  **Media is stored on Walrus:** Your approved media is uploaded to Walrus, which provides a secure and immutable link.
4.  **Your profile is created on-chain:** We create a `MediaRecord` on the Sui network, linking to your media on Walrus. Your profile is now a permanent and verifiable Sui object.
5.  **Editing is seamless:** When you update your media, new files are uploaded to Walrus, and your on-chain profile is updated to reference the new links.

## 🤔 Why ProoFlirt?

- **Real, Verified Users:** Say goodbye to fake profiles and bots.
- **Complete Privacy:** Your identity is protected with ZK authentication.
- **Scalable & Fast:** We use Walrus for media and Sui's parallel execution for high throughput and low latency.
- **Mobile-First:** A beautiful and responsive PWA for a great user experience.

## 🛠️ Tech Stack

- **Blockchain:** Sui Network
- **Smart Contracts:** Move
- **Frontend:** Next.js / React (PWA)
- **Authentication:** Sui ZK-Login (OpenID Connect with ZKPs)
- **Storage:** Walrus (for off-chain media)
- **AI:** Google Gemini (for profile photo analysis)

## 🏁 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

> We use a pnpm workspace. Installing at the root wires up the web app, Move contracts, and the shared SDK package.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` at the repository root (or load the same keys into your deployment target):

```bash
cp .env.example .env
```

| Variable                               | Description                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`         | OAuth client id from Google Cloud used for Sui zkLogin.                          |
| `NEXT_PUBLIC_SUI_NETWORK`              | Target network; defaults to `testnet`.                                           |
| `NEXT_PUBLIC_ZK_PROVER_URL`            | URL for the local or hosted prover stack.                                        |
| `ZK_SALT_SECRET`                       | 32-byte secret for server-side salt derivation (generate locally; never commit). |
| `NEXT_PUBLIC_WALRUS_PUBLISHER_URL`     | Walrus publisher endpoint for uploads.                                           |
| `NEXT_PUBLIC_WALRUS_AGGREGATOR_URL`    | Walrus aggregator for retrieval.                                                 |
| `NEXT_PUBLIC_WALRUS_DEFAULT_EPOCHS`    | Number of epochs to pin media.                                                   |
| `NEXT_PUBLIC_PROFILE_PACKAGE`          | Published profile package id on Sui.                                             |
| `NEXT_PUBLIC_PROFILE_REGISTRY_ID`      | Shared profile registry id.                                                      |
| `NEXT_PUBLIC_PROFILE_REGISTRY_VERSION` | Registry object version.                                                         |
| `NEXT_PUBLIC_MESSAGE_PACKAGE`          | Messaging package id on Sui.                                                     |
| `NEXT_PUBLIC_MESSAGE_REGISTRY_ID`      | Shared messaging registry id.                                                    |
| `NEXT_PUBLIC_MESSAGE_REGISTRY_VERSION` | Messaging registry version.                                                      |
| `NEXT_PUBLIC_SEAL_URL`                 | URL for the Seal policy/messaging service.                                       |
| `NEXT_PUBLIC_MESSAGES_ENABLE`          | Enable the DM prototype (`true`/`false`).                                        |

The web app expects an additional `.env.local` inside `apps/web/` for frontend-only secrets. At minimum provide:

```bash
GEMINI_API_KEY=your_api_key_here
# Create an OAuth 2.0 Web client in Google Cloud and copy its client ID into NEXT_PUBLIC_GOOGLE_CLIENT_ID.
# Generate a 32+ byte random string for ZK_SALT_SECRET (e.g. `openssl rand -hex 32`).
# Optional overrides:
# GEMINI_ANALYSIS_MODEL=gemini-2.5-flash
# GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
# NEXT_PUBLIC_GEMINI_ANALYSIS_PATH=/api/gemini/analyze
```

### 3. Run the App

```bash
pnpm -C apps/web dev
```

The dev server defaults to `http://localhost:3000`. Contract tests can be executed from `contracts/` with `sui move test`, and the shared messaging SDK builds via `pnpm -C packages/sdk build`.

### 4. Optional Workspace Commands

```bash
pnpm -w build        # Build web + packages
pnpm -w lint         # Lint the workspace
pnpm -C apps/web test        # Vitest + RTL unit tests
pnpm -C apps/web test:e2e    # Playwright end-to-end suite
```

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines (to be created) to get started.

## 📄 License

This project is licensed under the [LICENSE](./LICENSE) file.
