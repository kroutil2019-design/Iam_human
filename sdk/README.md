# I Am Human – Android SDK

This SDK enables Android apps to integrate Human Proof Token verification into their authentication flow.

## Installation

Add the following to your `build.gradle` (module level):

```groovy
dependencies {
    implementation 'com.iamhuman:sdk-android:1.0.0'
}
```

> **Note:** The SDK is currently a placeholder. Full implementation is on the roadmap.

## Usage

```kotlin
import com.iamhuman.sdk.IamHumanClient

val client = IamHumanClient(apiUrl = "https://api.example.com")

// Verify a Human Proof Token
val result = client.verifyToken(token = "abc123...")
if (result.valid) {
    // User is verified as human
} else {
    println("Verification failed: ${result.reason}")
}
```

## API Reference

### `IamHumanClient`

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `verifyToken` | `token: String` | `VerifyResult` | Verifies a Human Proof Token against the API |

### `VerifyResult`

| Field | Type | Description |
|-------|------|-------------|
| `valid` | `Boolean` | Whether the token is valid |
| `reason` | `String?` | Reason for invalidity (if applicable) |
| `issuedAt` | `String?` | ISO 8601 timestamp when the token was issued |
| `expiresAt` | `String?` | ISO 8601 timestamp when the token expires |

## Roadmap

- Full OTP authentication flow
- Selfie capture and upload
- Proof issuance
- Biometric binding
- Offline verification cache

## License

Copyright (c) 2026 Mark Kroutil. All rights reserved. See root [LICENSE](../LICENSE) for details.
