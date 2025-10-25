# Repository Guidelines

## Project Structure & Module Organization
- `apps/web/` – Next.js + TypeScript frontend (App Router).
- `contracts/` – Sui Move packages and tests.
- `packages/zk/` – Circom circuits, snark artifacts (zkey/wasm).
- `packages/sdk/` – Shared TS utilities for Sui, ZK, and APIs.
- Root docs: `Prooflirt.md`, `techstack.md`, this `AGENTS.md`.

## Build, Test, and Development Commands
- Install: `pnpm install` (workspace root).
- Web dev: `pnpm -C apps/web dev` (starts Next.js on localhost).
- Build all: `pnpm -w build` (web + packages).
- Web tests: `pnpm -C apps/web test` (Vitest + RTL).
- E2E: `pnpm -C apps/web test:e2e` (Playwright).
- Move: `sui move build` / `sui move test` inside `contracts/`.

## Coding Style & Naming Conventions
- TypeScript: strict mode, 2-space indent, no default exports for React components.
- Lint/format: ESLint + Prettier. Run `pnpm -w lint` and `pnpm -w format`.
- Filenames: `kebab-case` for files, `PascalCase` for React components, `camelCase` for vars/functions.
- Move: module names `snake_case`, structs/enums `CamelCase`, 4-space indent.

## Testing Guidelines
- Frameworks: Vitest (unit), React Testing Library (UI), Playwright (E2E), Move tests (contracts).
- Test files: `*.test.ts` / `*.spec.tsx` alongside code or under `__tests__/`.
- Aim for ≥80% line coverage on web (`pnpm -C apps/web test -- --coverage`).
- Keep tests deterministic; mock network/wallets; avoid sleeping.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`.
- Scopes: `web`, `contracts`, `zk`, `sdk`, `docs` (e.g., `feat(web): add zkLogin button`).
- PRs: clear description, linked issue, screenshots for UI, steps to test, and notes on migrations/Move changes.
- Keep diffs focused; include tests or rationale when skipping.

## Security & Configuration Tips
- Do not commit secrets, proving keys, or private keys. Use `.env.local` and Vercel env vars.
- Media uploads: hash client-side; validate mime/size in API proxy; store on Walrus.
- Network config: default to Sui `testnet`; set `NEXT_PUBLIC_SUI_NETWORK`.
- ZK Login env: configure `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, optional `NEXT_PUBLIC_ZK_PROVER_URL`, and server-side `ZK_SALT_SECRET` (32+ byte seed).
- Large ZK artifacts: store externally (releases/storage), reference via URL and checksum.
