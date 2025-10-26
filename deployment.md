## Prooflirt Profile Deployment (Sui Testnet)

- **Published at:** 2025-10-26 04:37:59 UTC
- **Transaction digest:** `9xUvyohX6YK4HZEYaSXvo2JG9bDncysgVfVNQFs6Y1UH`

### Package

| Item | Value |
|------|-------|
| Package ID | `0x3fb2c7991082be8ced20e0b1cf180d013a802b1a6e256b759616872fe4ebc9a3` |
| Version | `1` |
| Modules | `profile` |
| Upgrade Cap | `0xa102749d4e82776cfed6f548d6486b5d5720cff6eca063cfc7aebfa17aaa54e7` |

### Created Objects

| Object | ID | Version | Notes |
|--------|----|---------|-------|
| `ProfileRegistry` | `0x4f6aeae74f1292551546694187eacbeb3e5de00751e2f6ab902016b08e82abe5` | `627862129` | Shared object referenced by frontend |
| `AdminCap` | `0xb23aac5a4b1df1d0a01acffc42ed171be4fcffa0cba5a0aa04aac2e392b7ae15` | `627862129` | Held by deployer for trust-score updates |
| `UpgradeCap` | `0xa102749d4e82776cfed6f548d6486b5d5720cff6eca063cfc7aebfa17aaa54e7` | `627862129` | Required for future package upgrades |

### Environment Snippet

```env
NEXT_PUBLIC_PROFILE_PACKAGE=0x3fb2c7991082be8ced20e0b1cf180d013a802b1a6e256b759616872fe4ebc9a3
NEXT_PUBLIC_PROFILE_REGISTRY_ID=0x4f6aeae74f1292551546694187eacbeb3e5de00751e2f6ab902016b08e82abe5
NEXT_PUBLIC_PROFILE_REGISTRY_VERSION=627862129
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_DEFAULT_EPOCHS=5
```

Keep `ZK_SALT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and `NEXT_PUBLIC_SUI_NETWORK` unchanged from your local secrets; only the addresses above are meant to be shared.
