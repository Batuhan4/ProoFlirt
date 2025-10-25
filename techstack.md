# Tech Stack — ProoFlirt

This stack aligns with ProoFlirt’s goals: privacy-first, on-chain identity on Sui, off-chain media on Walrus, ZK-based authentication and trust, and encrypted peer-to-peer messaging.

## Deployment Choice: Vercel
- Rationale
  - Best-in-class support for Next.js App Router and serverless APIs.
  - Node.js runtime available for APIs that need Node-specific deps (common in web3/crypto tooling), with optional Edge Functions for lightweight tasks.
  - Simple preview deployments, built-in analytics, and cron jobs for scheduled tasks.
  - Messaging and ZK happen client-side or via third-party networks (no long-lived server requirement), so we avoid Worker/Durable Object lock-in.

## Frontend
- Framework: Next.js (App Router) + React 18 + TypeScript
- Styling/UI: Tailwind CSS + shadcn/ui (Radix primitives)
- State: Zustand (simple, predictable local state)
- Forms/Validation: React Hook Form + Zod
- Routing/Data: Next.js Server Components for data boundaries and progressive enhancement
- Internationalization: next-intl (optional)

## Web3 (Sui) Integration
- SDK: @mysten/sui.js (queries, transactions, subscriptions)
- Wallets: @mysten/wallet-kit (standardized wallet connectors)
- Auth: zkLogin (Sui’s zk-based login flow where appropriate)
- On-chain design: Move modules for Profile Object (identity hash, ZK identity data, compatibility/trust scores, media CIDs) with event emission for off-chain indexing
- Tooling: Sui CLI/localnet for dev/test, Move package in a separate `contracts/` workspace directory

## Zero-Knowledge (ZK)
- Circuits: Circom 2 for proving circuits (identity attestations, trust updates, selective disclosures)
- Prover/Verifier:
  - Client-side proof generation via snarkjs (WASM) to keep secrets on the device
  - Optional server-side verification in API routes for gating actions when on-chain verify isn’t available
- Build tooling: rapidsnark for local dev speed (optional), artifacts stored versioned and integrity-checked

## Messaging (End-to-End Encrypted)
- Transport: Waku (js-waku) for decentralized pub/sub with content topics
- E2EE: X25519 + symmetric AES-GCM (via tweetnacl/libsodium wrappers) with per-conversation keys derived from Sui account keys
- Identity Binding: Derive messaging identity from Sui address; publish only necessary public keys; no plaintext metadata
- Note: This avoids the need for long-lived WebSockets on our infra and keeps message content off our servers

## Off-chain Media (Walrus)
- Storage: Walrus for tamper-proof, content-addressed media
- Client flow: Compute SHA-256 in browser, upload to Walrus, receive CID
- On-chain: Record hash + CID in Sui Profile Object for verifiable linkage
- API proxy: Next.js Route Handler (Node runtime) as an upload proxy if the Walrus API requires credentials/rate limiting

## Backend/API (Serverless on Vercel)
- Next.js Route Handlers under `app/api/*`
- Runtimes:
  - Node runtime for endpoints that need Node crypto/web3 libs (e.g., Walrus proxy, ZK verification, AI moderation webhook)
  - Edge runtime for lightweight signature checks or public metadata endpoints
- Scheduled tasks: Vercel Cron for indexing, cache refreshes, and housekeeping

## Indexing, Cache, and Search
- Primary source of truth: Sui on-chain state
- Off-chain index (for UX/search): Vercel Postgres + Drizzle ORM
  - Stores derived/public metadata and search indices for faster discovery
  - No private content; deterministic re-index from chain events
- Alternative: Neon or Turso if preferred; defaulting to Vercel Postgres for simplicity

## AI Moderation (Privacy-Preserving)
- Tier 1 (client-side): onnxruntime-web with lightweight NSFW/face heuristics before upload
- Tier 2 (server-side): API call to a moderation provider (e.g., Google Vision/Hive) from a serverless route
  - Only hashed references persisted; never store raw media on server; final storage is Walrus
- Appeals/overrides: ZK-backed challenge flow for false positives (planned)

## Security & Privacy
- Keys/Secrets: Vercel Encrypted Env Vars; never expose secrets in client
- E2EE: End-to-end for messaging; only participants can decrypt
- ZK-first: Do not collect PII; proofs attest to properties, not raw data
- Content integrity: All media hashed client-side; CID recorded on-chain

## Testing & Dev Experience
- Unit/Integration: Vitest + React Testing Library
- E2E: Playwright
- Contracts: Move tests via Sui localnet and CLI
- Lint/Format: ESLint + Prettier
- Package manager: pnpm
- CI: GitHub Actions (typecheck, lint, test, build, Move tests). Optional preview deployments via Vercel

## Observability
- Sentry (client + serverless)
- Vercel Analytics (performance/traffic)

## Versions & Constraints
- Node.js 20
- Next.js 15 (App Router)
- TypeScript strict mode enabled
- Runtime selection per route (`runtime: "nodejs"` where Node APIs are needed)

## Summary
- We deploy on Vercel with a Next.js + TypeScript frontend, Sui integration via @mysten packages, ZK via Circom/snarkjs in the client, decentralized messaging via Waku with E2EE, Walrus for media, and a minimal serverless layer for upload proxying, moderation hooks, and indexing. This maximizes privacy, keeps secrets client-side, leverages on-chain verification, and avoids reliance on long-lived backend infrastructure.

