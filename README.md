# ProoFlirt

A privacy-first dating platform built on Sui blockchain with zero-knowledge proofs.

## 🔐 Security

**Security Status:** ✅ No secrets committed to repository

This project follows strict security practices:
- All secrets managed via environment variables
- No hardcoded credentials or API keys
- Comprehensive secret scanning (automated and manual)
- Regular security audits

📋 **Documentation:**
- [Security Scan Report](./SECURITY_SCAN_REPORT.md) - Latest security audit results
- [Security Checklist](./SECURITY_CHECKLIST.md) - Developer security guidelines

## 🚀 Quick Start

1. Clone the repository
2. Copy environment template: `cp .env.example .env.local`
3. Configure your environment variables (see [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md))
4. Install dependencies: `pnpm install`
5. Start development server: `pnpm -C apps/web dev`

## 📚 Documentation

- [Tech Stack](./techstack.md) - Complete technology overview
- [Deployment Guide](./deployment.md) - Production deployment instructions
- [Project Overview](./Prooflirt.md) - Project vision and architecture
- [Agent Guidelines](./AGENTS.md) - Development guidelines

## ⚠️ Important Security Notes

**Never commit:**
- `.env` or `.env.local` files
- API keys or secrets
- Private keys or certificates
- Credentials or passwords

**Always:**
- Use environment variables for configuration
- Keep `ZK_SALT_SECRET` unique per environment
- Review [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) before committing

## 📄 License

See [LICENSE](./LICENSE) file for details.
