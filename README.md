# I Am Human – Deterministic Human Proof System

> **Tier-0 Human Proof** – A production-ready system that proves a user is human and issues a reusable Human Proof Token (HPT).

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
- JDK 17
- Android SDK with minSdk 24+

### Setup

1. Open `android/` in Android Studio as the project root.
2. In `android/app/build.gradle.kts`, set `BASE_URL` to your backend:
   ```kotlin
   buildConfigField("String", "BASE_URL", "\"http://10.0.2.2:4000\"")
   // 10.0.2.2 = localhost from Android emulator
   // Use your machine's LAN IP for physical devices
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
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

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
4. **Run Android App** on emulator pointing to `http://10.0.2.2:4000`

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
