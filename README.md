# I Am Human – Deterministic Human Proof Substrate

A Tier‑0 identity primitive that issues reusable Human Proof Tokens for apps, platforms, and systems that require real humans.

## Features
- Android app (APK)
- Backend API (Node + Express)
- Postgres database
- Admin web console
- Android SDK for integrators
- Deterministic proof pipeline placeholder

## Architecture

```
Android App → Backend API → Postgres
         ↓
       Admin Web Console
         ↓
       Android SDK
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/request-otp` | Request a one-time password |
| POST | `/auth/verify-otp` | Verify OTP and receive JWT |
| POST | `/user/selfie` | Upload selfie for identity check |
| POST | `/proofs/human` | Issue a Human Proof Token |
| GET  | `/proofs/current` | Get current proof for authenticated user |
| POST | `/proofs/verify` | Verify a Human Proof Token |

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (via Docker)

### Setup

1. Copy environment variables:
   ```bash
   cp .env.example apps/api/.env
   ```

2. Start services:
   ```bash
   docker-compose up -d
   ```

3. Install dependencies:
   ```bash
   npm install
   cd apps/api && npm install
   cd apps/web && npm install
   ```

4. Run the API:
   ```bash
   cd apps/api && npm start
   ```

5. Run the Admin Web Console:
   ```bash
   cd apps/web && npm run dev
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `ADMIN_PASSWORD` | Admin console password |
| `VITE_API_URL` | API base URL (for web console) |

## Project Structure

```
i-am-human/
  LICENSE
  .gitignore
  README.md
  docker-compose.yml
  package.json
  apps/
    api/        # Node.js + Express backend
    web/        # React + Vite admin console
  sdk/          # Android SDK for integrators
  docs/         # Documentation
  .env.example
```

## Roadmap
- Deterministic biometric proof
- Liveness detection
- Wallet binding
- Zero-knowledge proofs
- Multi-device trust graph

## License

Copyright (c) 2026 Mark Kroutil. All rights reserved. See [LICENSE](LICENSE) for details.
