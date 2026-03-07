#!/usr/bin/env node
/* eslint-disable no-console */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Client } = require('pg');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[test:enforcement] Missing DATABASE_URL in apps/api/.env');
  process.exit(1);
}

async function postJson(path, body, token) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, json, raw: text };
}

async function waitForApiReady(maxAttempts, delayMs) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) {
        return;
      }
    } catch {
      // API might still be booting.
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`API did not become ready at ${API_BASE_URL} within timeout`);
}

async function main() {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  try {
    await waitForApiReady(20, 500);

    const email = `enforcement.${Date.now()}@example.com`;
    const deviceId = `device-${Date.now()}`;

    const requestRes = await postJson('/auth/request-otp', { email });
    if (requestRes.status !== 200 || !requestRes.json || requestRes.json.success !== true) {
      throw new Error(`request-otp failed: status=${requestRes.status} body=${requestRes.raw}`);
    }

    const otpQuery = await db.query(
      `SELECT otp_code FROM otps WHERE email = $1 ORDER BY expires_at DESC LIMIT 1`,
      [email]
    );
    if (otpQuery.rowCount === 0) {
      throw new Error('No OTP row found for test email');
    }
    const otp = otpQuery.rows[0].otp_code;

    const verifyRes = await postJson('/auth/verify-otp', {
      email,
      otp,
      device_id: deviceId,
    });
    if (verifyRes.status !== 200 || !verifyRes.json || verifyRes.json.success !== true) {
      throw new Error(`verify-otp failed: status=${verifyRes.status} body=${verifyRes.raw}`);
    }

    const authToken = verifyRes.json.auth_token;
    if (!authToken) {
      throw new Error('verify-otp response missing auth_token');
    }

    const proofBeforeSelfie = await postJson('/proofs/human', {}, authToken);
    if (proofBeforeSelfie.status !== 403) {
      throw new Error(
        `Expected 403 before selfie upload, got status=${proofBeforeSelfie.status} body=${proofBeforeSelfie.raw}`
      );
    }

    const selfieForm = new FormData();
    selfieForm.append('selfie', new Blob(['fake-jpeg-data'], { type: 'image/jpeg' }), 'selfie.jpg');
    const selfieRes = await fetch(`${API_BASE_URL}/user/selfie`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: selfieForm,
    });
    const selfieText = await selfieRes.text();
    let selfieJson = null;
    try {
      selfieJson = selfieText ? JSON.parse(selfieText) : null;
    } catch {
      selfieJson = null;
    }
    if (selfieRes.status !== 200 || !selfieJson || selfieJson.success !== true) {
      throw new Error(`selfie upload failed: status=${selfieRes.status} body=${selfieText}`);
    }

    const proofAfterSelfie = await postJson('/proofs/human', {}, authToken);
    if (
      proofAfterSelfie.status !== 200 ||
      !proofAfterSelfie.json ||
      proofAfterSelfie.json.success !== true ||
      !proofAfterSelfie.json.proof
    ) {
      throw new Error(
        `Expected successful proof issuance after selfie upload, got status=${proofAfterSelfie.status} body=${proofAfterSelfie.raw}`
      );
    }

    console.log('[test:enforcement] PASS');
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error('[test:enforcement] FAIL:', err.message || err);
  process.exit(1);
});
