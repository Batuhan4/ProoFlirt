## Prooflirt Contracts Deployment (Sui Testnet)

- **Published at:** 2025-10-26 07:24:53 UTC
- **Transaction digest:** `FAB5vEuMboa83caKxNkn2sFJtJxNqvF6QN7Hg7j87tzH`

### Package

| Item | Value |
|------|-------|
| Package ID | `0xc991188b615eaf5b2eaa48b9f2a5f1b03cabf41711c89adc6d6cdd25cc003ab8` |
| Version | `1` |
| Modules | `profile`, `message` |
| Upgrade Cap | `0x3dac62a5ee4d30a292a654ca5168c27696c7aa669057aad756e506f4e682a068` |

### Created Objects

| Object | ID | Version | Notes |
|--------|----|---------|-------|
| `ProfileRegistry` | `0xb8b1c83507c31fa7cdc98fd96202f010af901e07df4150ae3b371f02979c88d9` | `627862130` | Shared object consumed by the profile UI |
| `ConversationRegistry` | `0x9a1f7df666bb7f03b9a83f24b83c62677586e1646b1f22643d65b7eaf99b2e70` | `627862130` | Shared object that indexes direct-message threads |
| `AdminCap` | `0x10da935d64da2219917e5740892cd5be5cb6856f13ee4e20cdce4a0ebfb4f79a` | `627862130` | Held by deployer; authorizes score updates |
| `UpgradeCap` | `0x3dac62a5ee4d30a292a654ca5168c27696c7aa669057aad756e506f4e682a068` | `627862130` | Required for future package upgrades |

### Environment Snippet

```env
NEXT_PUBLIC_PROFILE_PACKAGE=0xc991188b615eaf5b2eaa48b9f2a5f1b03cabf41711c89adc6d6cdd25cc003ab8
NEXT_PUBLIC_PROFILE_REGISTRY_ID=0xb8b1c83507c31fa7cdc98fd96202f010af901e07df4150ae3b371f02979c88d9
NEXT_PUBLIC_PROFILE_REGISTRY_VERSION=627862130
NEXT_PUBLIC_MESSAGE_PACKAGE=0xc991188b615eaf5b2eaa48b9f2a5f1b03cabf41711c89adc6d6cdd25cc003ab8
NEXT_PUBLIC_MESSAGE_REGISTRY_ID=0x9a1f7df666bb7f03b9a83f24b83c62677586e1646b1f22643d65b7eaf99b2e70
NEXT_PUBLIC_MESSAGE_REGISTRY_VERSION=627862130
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_DEFAULT_EPOCHS=5
NEXT_PUBLIC_MESSAGES_ENABLE=false
NEXT_PUBLIC_SEAL_URL=https://seal-devnet.prooflirt.example
```

Keep `ZK_SALT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and `NEXT_PUBLIC_SUI_NETWORK` unchanged from your local secrets; only the addresses above are meant to be shared.
