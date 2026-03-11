# I Am Human – Deterministic Human Proof System

[![Deterministic Validate](https://github.com/kroutil2019-design/Iam_human/actions/workflows/deterministic-validate.yml/badge.svg)](https://github.com/kroutil2019-design/Iam_human/actions/workflows/deterministic-validate.yml)

> **Tier-0 Human Proof** – A production-ready system that proves a user is human and issues a reusable Human Proof Token (HPT).

## Deterministic Workflow

From repo root, use the deterministic scripts in this order:

```bash
./scripts/dev-up.sh
./scripts/dev-status.sh
./scripts/dev-test.sh
./scripts/run-enforcement-if-ready.sh --require-ready
./scripts/dev-down.sh
```

Before opening a PR, run:

```bash
./scripts/pre-pr-check.sh --fast
# or CI-parity scope
./scripts/pre-pr-check.sh --ci
# or CI-parity + backend enforcement contract
./scripts/pre-pr-check.sh --ci-enforcement
```

For faster local checks (skip Android build):

```bash
./scripts/dev-test.sh --skip-android
```

When to use each mode:

- Use `./scripts/dev-test.sh` for release candidates, CI parity checks, and any Android-related change.
- Use `./scripts/dev-test.sh --skip-android` for API/web-only edits when you need a faster local loop.

For log tailing and cleanup:

```bash
./scripts/dev-logs.sh api
./scripts/dev-logs.sh web
./scripts/dev-reset.sh
./scripts/dev-reset.sh --purge
```

Governance docs:

- Security policy: `SECURITY.md`
- Release checklist: `release-checklist.md`
- Changelog: `CHANGELOG.md`
- Security reporting template: `.github/ISSUE_TEMPLATE/security-report.yml`
- Bug/feature templates: `.github/ISSUE_TEMPLATE/bug-report.yml`, `.github/ISSUE_TEMPLATE/feature-request.yml`

Release helper:

```bash
./scripts/release-verify.sh
./scripts/release-verify.sh --full
```

---

## Architecture

```
Iam_human/
├── apps/
│   ├── api/          # Node.js + TypeScript + Express backend
│   └── web/          # React + TypeScript + Vite admin console
├── android/
│   ├── app/          # Android app (Kotlin + Jetpack Compose)
│   └── iamhuman-sdk/ # Android SDK module for third-party integrators
└── README.md
```

---

## 1. Backend API

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
cd apps/api
npm install

# Copy and edit environment
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, ADMIN_API_KEY

# Run DB migration
npm run db:migrate

# Start development server
npm run dev
```

The API will be available at **http://localhost:4000**.

OTP codes are logged to the console (no real email is sent in development).

### Environment Variables

| Variable          | Description                              | Default                      |
|-------------------|------------------------------------------|------------------------------|
| `PORT`            | Server port                              | `4000`                       |
| `DATABASE_URL`    | PostgreSQL connection string             | (required)                   |
| `JWT_SECRET`      | Secret for signing JWTs                  | (required – change in prod!) |
| `JWT_EXPIRY`      | JWT expiry duration                      | `7d`                         |
| `ADMIN_API_KEY`   | Admin API key for console                | (required – change in prod!) |
| `HPT_EXPIRY_DAYS` | Human Proof Token validity (days)        | `30`                         |
| `CORS_ORIGINS`    | Comma-separated allowed CORS origins     | `http://localhost:5173`      |

### API Endpoints

#### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/request-otp` | None | Request 6-digit OTP |
| POST | `/auth/verify-otp` | None | Verify OTP, get JWT |

#### User
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/user/me` | Bearer | Get current user |
| POST | `/user/selfie` | Bearer | Upload selfie image |
| DELETE | `/user/account` | Bearer | Soft-delete account |

#### Proofs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/proofs/human` | Bearer | Issue new Human Proof Token |
| GET | `/proofs/current` | Bearer | Get current active proof |
| POST | `/proofs/verify` | None | Verify a token (public) |

#### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | `x-admin-key` header | List all users |
| GET | `/admin/proofs` | `x-admin-key` header | List all proofs |
| POST | `/admin/proofs/invalidate` | `x-admin-key` header | Revoke a proof |

#### Actions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/actions/execute` | None | Deterministic action execution envelope |
| GET | `/actions/index` | None | In-memory trust-fabric action index snapshot |

### Action Contract

`POST /actions/execute` response envelope:

```json
{
    "status": "pass" | "fail",
    "polarity": "+" | "-",
    "eventHash": "string",
    "output": {},
    "reason": "string"
}
```

Notes:
- `eventHash` is always returned.
- `output` is present only when `status` is `pass`.
- `reason` is present on failures.

`GET /actions/index` returns:

```json
{
    "totals": {
        "received": 0,
        "configurationBuilt": 0,
        "zGateValidated": 0,
        "constraintEvaluated": 0,
        "passed": 0,
        "failed": 0,
        "polarityPositive": 0,
        "polarityNegative": 0,
        "executionStarted": 0,
        "executionCompleted": 0,
        "executionFailed": 0
    },
    "byIntent": {},
    "byCapability": {},
    "byFailureReason": {}
}
```

---

## 2. Admin Web Console

### Prerequisites
- Node.js 18+

### Setup

```bash
cd apps/web
npm install
npm run dev
```

The admin console will be available at **http://localhost:5173**.

1. Open the console in your browser
2. Enter the `ADMIN_API_KEY` from your API `.env` file
3. View users, proofs, and revoke tokens as needed

---

## 3. Android App

### Prerequisites
- Android Studio Hedgehog or newer
- JDK 17+ (JDK 21 recommended for this repo's Gradle setup)
- Android SDK with minSdk 24+

### Setup

1. Open `android/` in Android Studio as the project root.
2. Configure `IAMHUMAN_BASE_URL` for the backend endpoint used during build:
    ```bash
    export IAMHUMAN_BASE_URL=https://effective-winner-97vgw4grp963p5xp-4000.app.github.dev
    ```
    You can also pass it directly to Gradle:
    ```bash
    ./gradlew assembleDebug -PIAMHUMAN_BASE_URL=https://effective-winner-97vgw4grp963p5xp-4000.app.github.dev
    ```
3. Sync Gradle and build the project.
4. Run on an emulator or physical device (minSdk 24 / Android 7.0+).

### App Flow

```
Splash → Onboarding (3 slides) → Email Entry → OTP Verify
       → [Optional Selfie] → Proof Screen (HPT + QR)
       → Settings
```

### Building APK

```bash
cd android
./build-debug.sh
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

`build-debug.sh` pins JDK 21 in this dev container for deterministic builds.

---

## 4. Android SDK (for Integrators)

The `:iamhuman-sdk` module allows third-party Android apps to verify Human Proof Tokens.

### Integration

Add the SDK module as a dependency, or publish it as a local AAR:

```kotlin
// In your app's build.gradle.kts
implementation(project(":iamhuman-sdk"))
// or after publishing:
// implementation("com.iamhuman:sdk:1.0.0")
```

### Usage

```kotlin
import com.iamhuman.sdk.IAmHumanSDK

// Initialize once (e.g., in Application.onCreate)
IAmHumanSDK.initialize("https://your-api-host.com")

// Verify a token (suspend function – call from coroutine)
val isHuman = IAmHumanSDK.isVerifiedHuman(tokenValue)

// Get detailed verification result
val result = IAmHumanSDK.verifyToken(tokenValue)
if (result.valid) {
    println("Human verified! Expires: ${result.expiresAt}")
}

// Deep-link to I Am Human app (or Play Store if not installed)
IAmHumanSDK.openIAmHumanAppOrPlayStore(context)
```

### SDK Public API

```kotlin
object IAmHumanSDK {
    fun initialize(baseUrl: String, apiKey: String? = null)
    suspend fun isVerifiedHuman(tokenValue: String): Boolean
    suspend fun verifyToken(tokenValue: String): VerifyResult
    suspend fun getCurrentProof(authToken: String): Proof?
    fun openIAmHumanAppOrPlayStore(context: Context)
}

data class Proof(
    val tokenId: String,
    val tokenValue: String,
    val userId: String,
    val issuedAt: String,
    val expiresAt: String,
    val status: String,
)

data class VerifyResult(
    val valid: Boolean,
    val reason: String?,
    val userId: String?,
    val issuedAt: String?,
    val expiresAt: String?,
)
```

---

## Database Schema

The API automatically creates the following tables when `npm run db:migrate` is run:

| Table | Description |
|-------|-------------|
| `users` | Registered users with verification status |
| `devices` | Device registrations per user |
| `otps` | One-time passwords (5-minute expiry) |
| `human_proofs` | Issued Human Proof Tokens |
| `selfies` | Selfie file references |

---

## Running Locally (Full Stack)

1. **Start PostgreSQL** with a database named `iamhuman`
2. **Start API**: `cd apps/api && npm run db:migrate && npm run dev`
3. **Start Admin Web**: `cd apps/web && npm run dev`
4. **Run Android App** pointing to `https://effective-winner-97vgw4grp963p5xp-4000.app.github.dev`

### Deterministic One-Command Local Stack

Use the helper scripts from repo root:

```bash
./scripts/dev-up.sh
./scripts/dev-status.sh
./scripts/dev-test.sh
./scripts/dev-logs.sh api
./scripts/dev-logs.sh web
./scripts/dev-down.sh
./scripts/dev-reset.sh
# Optional: also stop PostgreSQL container
./scripts/dev-down.sh --with-db
./scripts/dev-reset.sh --with-db
# Optional: remove DB container and .run/ files
./scripts/dev-reset.sh --purge
```

`dev-up.sh` ensures PostgreSQL is running (Docker), creates `apps/api/.env` from `.env.example` when missing, runs DB migration, then starts API and web servers with logs in `.run/`.

`dev-test.sh` runs deterministic build validation across API, web, and Android (app + SDK).

`npm --prefix apps/api run test:enforcement` validates strict backend enforcement: proof issuance is blocked before selfie upload and allowed after selfie upload.

CI runs deterministic build validation plus the backend enforcement contract via `.github/workflows/deterministic-validate.yml`.

---

## Security Notes

- JWT secrets and admin keys must be rotated for production deployments
- Use HTTPS in production (reverse proxy with nginx/caddy)
- OTP delivery should be replaced with a real email provider (SendGrid, SES, etc.)
- Selfie analysis should be replaced with a real biometric/liveness check
- The `usesCleartextTraffic=true` in AndroidManifest is for local development only

---

## Design

- **Theme**: Dark, cinematic, minimal
- **Background**: `#050509` (near-black)
- **Accent**: `#3D7FFF` (electric blue)
- **Text**: `#E8E8F0` / `#8888A0`
- **Typography**: System sans-serif, clean and modern
