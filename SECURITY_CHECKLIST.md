# Security Checklist for ProoFlirt Developers

This document provides a security checklist for developers working on ProoFlirt. Follow these guidelines to maintain the security and privacy standards of the project.

## Before Committing Code

### Environment Variables ✓
- [ ] No `.env` files committed (only `.env.example` is allowed)
- [ ] No hardcoded API keys or secrets in source code
- [ ] All secrets loaded from `process.env`
- [ ] Server-side secrets used only in API routes (not client code)
- [ ] Public environment variables prefixed with `NEXT_PUBLIC_`

### Sensitive Files ✓
- [ ] No certificate files (`.pem`, `.crt`, `.cer`) committed
- [ ] No private key files (`.key`, `*_rsa`) committed
- [ ] No credential files (`credentials.json`, `service-account.json`) committed
- [ ] No backup files containing sensitive data

### Code Review ✓
- [ ] No passwords or secrets in code comments
- [ ] No sensitive data in console.log or debug statements
- [ ] No test credentials or mock API keys that look real
- [ ] No connection strings or database URLs hardcoded

## Setting Up Your Environment

### Required Environment Variables

Create a `.env.local` file in `apps/web/` based on `.env.example`:

```bash
# Copy the template
cp .env.example .env.local

# Edit with your values
nano .env.local  # or your preferred editor
```

### Server-Side Secrets (Never Expose to Client)

1. **ZK_SALT_SECRET**
   - Generate a secure random value:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Must be at least 32 characters
   - Different for each environment (dev/staging/prod)
   - Never share or commit this value

### Client-Side Configuration (Safe to Expose)

2. **NEXT_PUBLIC_GOOGLE_CLIENT_ID**
   - Obtain from Google Cloud Console
   - OAuth 2.0 Client ID for zkLogin
   - Can be exposed to client (by design)

3. **NEXT_PUBLIC_SUI_NETWORK**
   - Options: `localnet`, `devnet`, `testnet`, `mainnet`
   - Default: `testnet`

4. **NEXT_PUBLIC_ZK_PROVER_URL** (Optional)
   - Local: `http://localhost:5001/v1`
   - Mysten Labs: `https://prover.mystenlabs.com/v1`

5. **NEXT_PUBLIC_WALRUS_PUBLISHER_URL**
   - Testnet: `https://publisher.walrus-testnet.walrus.space`

6. **NEXT_PUBLIC_WALRUS_AGGREGATOR_URL**
   - Testnet: `https://aggregator.walrus-testnet.walrus.space`

7. **NEXT_PUBLIC_PROFILE_PACKAGE**
   - Your deployed Move package address
   - See `deployment.md` for current values

8. **NEXT_PUBLIC_PROFILE_REGISTRY_ID**
   - Shared ProfileRegistry object ID
   - See `deployment.md` for current values

9. **NEXT_PUBLIC_PROFILE_REGISTRY_VERSION**
   - Initial shared version number
   - See `deployment.md` for current values

## Security Patterns to Follow

### 1. Environment Variable Access

❌ **WRONG:**
```typescript
const apiKey = "AIzaSyC-1234567890abcdefghijklmnopqrstuvw";
```

✅ **CORRECT:**
```typescript
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
if (!apiKey) {
  throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
}
```

### 2. Server-Side Only Secrets

❌ **WRONG (exposes secret to client):**
```typescript
// In a client component
const secret = process.env.ZK_SALT_SECRET; // This will be undefined!
```

✅ **CORRECT (server-side only):**
```typescript
// In app/api/*/route.ts
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.ZK_SALT_SECRET;
  if (!secret) {
    throw new Error("Server configuration error");
  }
  // Use secret here
}
```

### 3. Configuration Validation

✅ **RECOMMENDED:**
```typescript
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const clientId = requireEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", 
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
```

## Git Security

### Check Before Committing

```bash
# Review what you're about to commit
git status
git diff

# Check for accidentally staged secrets
git diff --cached | grep -i "secret\|password\|key"

# Verify no .env files
git status | grep ".env"
```

### If You Accidentally Commit a Secret

⚠️ **IMPORTANT:** If you commit a secret, you must:

1. **Immediately rotate the secret** (generate new one, invalidate old)
2. Remove from git history (not just delete the file):
   ```bash
   # Option 1: Use git-filter-repo (recommended)
   git filter-repo --path-glob '**/.env' --invert-paths
   
   # Option 2: Use BFG Repo-Cleaner
   bfg --delete-files '.env'
   ```
3. Force push (if working on a feature branch):
   ```bash
   git push --force
   ```
4. Contact repository admin if pushed to main branch

## Deployment Security

### Vercel Environment Variables

1. **Go to:** Project Settings → Environment Variables
2. **Add secrets** (do not add to source code):
   - `ZK_SALT_SECRET` - Separate value for each environment
3. **Public variables** can be in code or Vercel:
   - `NEXT_PUBLIC_*` variables

### Environment-Specific Configuration

- **Development:** Use `.env.local` (gitignored)
- **Staging:** Configure in Vercel for preview deployments
- **Production:** Configure in Vercel for production environment

**Different values for each environment:**
- ✅ Different `ZK_SALT_SECRET` for dev/staging/prod
- ✅ Different Google Client IDs if needed
- ✅ Consider different Sui networks (testnet vs mainnet)

## Code Review Checklist

When reviewing PRs, check:

- [ ] No new `.env` files in the diff
- [ ] No hardcoded secrets in code changes
- [ ] Environment variables properly accessed via `process.env`
- [ ] Server-side secrets not used in client components
- [ ] No sensitive data in logs or error messages
- [ ] No commented-out code with secrets
- [ ] No debug code that exposes internals

## Security Tools (Optional)

### Local Git Hooks

Install a pre-commit hook to prevent committing secrets:

```bash
# Install pre-commit framework
pip install pre-commit

# Create .pre-commit-config.yaml (see example below)

# Install hooks
pre-commit install
```

Example `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: check-added-large-files
      - id: check-json
      - id: check-yaml
      - id: detect-private-key
      - id: end-of-file-fixer
      - id: trailing-whitespace
  
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

### Secret Scanning

Run manual scans periodically:

```bash
# Using truffleHog (if installed)
trufflehog filesystem . --only-verified

# Using git-secrets (if installed)
git secrets --scan

# Simple grep-based check
grep -r "api.key\|secret\|password" --include="*.ts" --include="*.js" --exclude-dir=node_modules .
```

## Incident Response

### If a Secret is Exposed

1. **Assess the exposure:**
   - Was it pushed to a public repository?
   - How long was it exposed?
   - What access does the secret provide?

2. **Immediate actions:**
   - Rotate the secret immediately
   - Revoke/invalidate the old secret
   - Check logs for unauthorized usage

3. **Remediation:**
   - Remove from git history (see above)
   - Update all environments with new secret
   - Document the incident

4. **Prevention:**
   - Review why it happened
   - Add additional safeguards if needed
   - Team training if necessary

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Questions?

If you're unsure whether something is safe to commit, ask:
- Is this value unique to my local setup?
- Would this value give someone unauthorized access?
- Is this value different in production?

**When in doubt, use an environment variable!**

---

Last Updated: 2025-10-26
