# 💖 ProoFlirt 💖

**The future of dating is private, secure, and authentic. Say goodbye to catfishing and bots! 🚫🤖**

ProoFlirt is a revolutionary decentralized dating protocol built on the **Sui network**. We leverage the power of **Zero-Knowledge Proofs (ZKPs)** to ensure every user is a real, verified human. Your identity and data are kept private, while your connections are genuine.

## ✨ Core Features

*   🔒 **ZK Login:** Prove you're human without revealing sensitive information. Your privacy is paramount.
*   ✅ **Verified Profiles:** Each user profile is an on-chain **Sui object**. This makes fake profiles and bots technically impossible.
*   📸 **Decentralized Media Storage:** Your profile photos and videos are stored off-chain on **Walrus**, a decentralized storage solution. Your media is secure and tamper-proof.
*   💯 **Trust Score:** A dynamic trust metric derived from user interactions and community feedback. This helps to build a safe and respectful community.
*   📍 **Location Verification:** Prove your attendance at real-world meetups using QR codes or device-based verification. No more "they didn't show up" debates.
*   🤖 **AI Profile Moderation:** Our AI validates uploaded profile photos to prevent fake or inappropriate images, ensuring a safe browsing experience for everyone.
*   🤫 **ZK-Encrypted Messaging:** Enjoy fully encrypted, peer-to-peer messaging. Your conversations are secured by ZK authentication and are readable only by you and your match.
*   🚨 **Fake Report System:** A community-driven system to report and verify fake accounts or spam. Confirmed violations have real consequences.
*   💸 **Economic Layer:**
    *   **Premium Membership:** Unlock advanced features.
    *   **Tipping:** Show your appreciation by sending tokens to other users.
    *   **Penalties:** Discourage bad behavior like ghosting or misconduct through token deductions.
*   📱 **Mobile PWA Experience:** A mobile-first, responsive UI that works perfectly on your phone. Install it as a Progressive Web App for offline access and push notifications.

## 🚀 How It Works: Creating Your Profile

1.  **You provide your details:** Share your interests and photos through our user-friendly interface.
2.  **Your browser does the work:** Your files are processed locally in your browser for hashing and AI moderation before they are even uploaded.
3.  **Media is stored on Walrus:** Your approved media is uploaded to Walrus, which provides a secure and immutable link.
4.  **Your profile is created on-chain:** We create a `MediaRecord` on the Sui network, linking to your media on Walrus. Your profile is now a permanent and verifiable Sui object.
5.  **Editing is seamless:** When you update your media, new files are uploaded to Walrus, and your on-chain profile is updated to reference the new links.

## 🤔 Why ProoFlirt?

*   **Real, Verified Users:** Say goodbye to fake profiles and bots.
*   **Complete Privacy:** Your identity is protected with ZK authentication.
*   **Scalable & Fast:** We use Walrus for media and Sui's parallel execution for high throughput and low latency.
*   **Mobile-First:** A beautiful and responsive PWA for a great user experience.

## 🛠️ Tech Stack

*   **Blockchain:** [Sui](https://sui.io/)
*   **Storage:** [Walrus](https://www.threefold.io/threefold-cloud/walrus-storage)
*   **Cryptography:** Zero-Knowledge Proofs (ZKPs)
*   **Frontend:** Next.js, React, PWA
*   **Smart Contracts:** Move

## 🏁 Getting Started

*Instructions on how to set up and run the project will be added here soon!*

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines (to be created) to get started.

## 📄 License

This project is licensed under the [LICENSE](./LICENSE) file.