# Architecture

## Component Overview

```
Android App ──────────────────┐
                              ▼
                    ┌─────────────────┐
                    │   Backend API   │  Node.js + Express
                    │  (port 3001)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │  (port 5432)
                    │   Database      │
                    └─────────────────┘

Admin Web Console ────────────┐
(React + Vite, port 5173)     │
                              ▼
                    ┌─────────────────┐
                    │   Backend API   │
                    └─────────────────┘

Android SDK ──────────────────┐
(integrators)                 │
                              ▼
                    ┌─────────────────┐
                    │  POST /proofs/  │
                    │     verify      │
                    └─────────────────┘
```

## Data Flow

1. **OTP Flow:** User provides phone number → API generates OTP → User verifies OTP → API issues JWT
2. **Selfie Upload:** Authenticated user uploads selfie → API stores reference
3. **Proof Issuance:** Authenticated user requests proof → API verifies selfie exists → Issues Human Proof Token
4. **Proof Verification:** Any integrator posts token to `/proofs/verify` → API returns validity

## Database Schema

### `users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `phone` | TEXT | Unique phone number |
| `otp` | TEXT | Current OTP (nullable) |
| `otp_expires_at` | TIMESTAMPTZ | OTP expiry |
| `selfie_url` | TEXT | Path to uploaded selfie |
| `created_at` | TIMESTAMPTZ | Account creation time |

### `proofs`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → users.id |
| `token` | TEXT | Unique proof token (hex) |
| `issued_at` | TIMESTAMPTZ | When the proof was issued |
| `expires_at` | TIMESTAMPTZ | When the proof expires |
| `revoked` | BOOLEAN | Whether the proof has been revoked |
