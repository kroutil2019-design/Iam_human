# API Reference

Base URL: `http://localhost:3001` (development)

## Authentication

Endpoints marked **🔒 Auth required** expect an `Authorization: Bearer <token>` header.

---

## Auth Endpoints

### `POST /auth/request-otp`

Request a one-time password to be sent to the given phone number.

**Request body:**
```json
{ "phone": "+15551234567" }
```

**Response:**
```json
{ "message": "OTP sent", "expiresInMinutes": 10 }
```

---

### `POST /auth/verify-otp`

Verify the OTP and receive a JWT.

**Request body:**
```json
{ "phone": "+15551234567", "otp": "123456" }
```

**Response:**
```json
{ "token": "<jwt>" }
```

---

## User Endpoints

### `POST /user/selfie` 🔒 Auth required

Upload a selfie image (required before issuing a proof).

**Request:** `multipart/form-data` with field `selfie` (image file, max 5 MB).

**Response:**
```json
{ "message": "Selfie uploaded", "selfieUrl": "/uploads/<filename>" }
```

---

## Proof Endpoints

### `POST /proofs/human` 🔒 Auth required

Issue a new Human Proof Token for the authenticated user. Requires a selfie to have been uploaded.

**Response:**
```json
{
  "id": "<uuid>",
  "token": "<hex-token>",
  "issued_at": "2026-03-07T00:00:00.000Z",
  "expires_at": "2026-04-06T00:00:00.000Z"
}
```

---

### `GET /proofs/current` 🔒 Auth required

Get the current active Human Proof Token for the authenticated user.

**Response:** Same shape as `POST /proofs/human`.

---

### `POST /proofs/verify`

Verify a Human Proof Token. This is a public endpoint.

**Request body:**
```json
{ "token": "<hex-token>" }
```

**Response (valid):**
```json
{ "valid": true, "issuedAt": "...", "expiresAt": "..." }
```

**Response (invalid):**
```json
{ "valid": false, "reason": "Token expired" }
```
