## Prooflirt Profile Deployment (Sui Testnet)

- **Published at:** 2025-10-25 22:59:59 UTC
- **Transaction digest:** `8f7PAgEVKV4fBUm9scR7Cy59jr3V3Y3vJDzAG8cnpU5C`

### Package

| Item | Value |
|------|-------|
| Package ID | `0x06f5539f60dde5021ba7ca0ea037de21ba4097d25f43192c845b3863f515d673` |
| Version | `1` |
| Modules | `profile` |
| Upgrade Cap | `0xa8ae326e78ed557e9e113a5c6381c37707d8724c91cdbaccbbcbd42a325ceb0b` |

### Created Objects

| Object | ID | Version | Notes |
|--------|----|---------|-------|
| `ProfileRegistry` | `0x6f5539f60dde5021ba7ca0ea037de21ba4097d25f43192c845b3863f515d673` | `627862126` | Shared object referenced by frontend |
| `AdminCap` | `0xf99610723194fdb8e2c4fa04f7a71dac39c850ffa5651c7dc4c1da5861d950bd` | `627862126` | Held by deployer for trust-score updates |

### Environment Snippet

```env
NEXT_PUBLIC_PROFILE_PACKAGE=0x06f5539f60dde5021ba7ca0ea037de21ba4097d25f43192c845b3863f515d673
NEXT_PUBLIC_PROFILE_REGISTRY_ID=0x6f5539f60dde5021ba7ca0ea037de21ba4097d25f43192c845b3863f515d673
NEXT_PUBLIC_PROFILE_REGISTRY_VERSION=627862126
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_DEFAULT_EPOCHS=5
```

Keep `ZK_SALT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and `NEXT_PUBLIC_SUI_NETWORK` unchanged from your local secrets; only the addresses above are meant to be shared.
