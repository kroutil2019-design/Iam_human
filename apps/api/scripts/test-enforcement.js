#!/usr/bin/env node
/* eslint-disable no-console */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Client } = require('pg');
const { generateKeyPairSync, sign } = require('crypto');

const apiPort = process.env.PORT || '4000';
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${apiPort}`;
const DATABASE_URL = process.env.DATABASE_URL;

function logStep(step) {
  console.log(`[test:enforcement] STEP ${step}`);
}

function fail(message) {
  throw new Error(message);
}

function getJsonValue(obj, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }
    return acc[key];
  }, obj);
}

function assertStatus(response, expectedStatus, label) {
  if (response.status !== expectedStatus) {
    fail(
      `${label} failed: expected status=${expectedStatus}, got status=${response.status} body=${response.raw}`
    );
  }
}

function assertJsonEquals(response, path, expectedValue, label) {
  const actualValue = getJsonValue(response.json, path);
  if (actualValue !== expectedValue) {
    fail(
      `${label} failed: expected ${path}=${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)} body=${response.raw}`
    );
  }
}

function assertTruthy(value, message) {
  if (!value) {
    fail(message);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, { attempts = 5, initialDelayMs = 200, backoffFactor = 2 } = {}) {
  let delayMs = initialDelayMs;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      await sleep(delayMs);
      delayMs *= backoffFactor;
    }
  }

  fail(`${label} failed after ${attempts} attempts: ${lastError?.message || lastError}`);
}

if (!DATABASE_URL) {
  console.error('[test:enforcement] Missing DATABASE_URL in apps/api/.env');
  process.exit(1);
}

async function postJson(path, body, token) {
  return requestJson('POST', path, { body, token });
}

async function deleteRequest(path, token) {
  return requestJson('DELETE', path, { token });
}

async function requestJson(method, path, { body, token } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return parseJsonResponse(res);
}

async function parseJsonResponse(res) {
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
      await sleep(delayMs);
    }
  }

  throw new Error(`API did not become ready at ${API_BASE_URL} within timeout`);
}

async function main() {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  try {
    logStep('wait-for-api');
    await waitForApiReady(20, 500);

    const runId = Date.now();
    const email = `enforcement.${runId}@example.com`;
    const deviceId = `device-${runId}`;
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyBase64 = publicKey
      .export({ format: 'der', type: 'spki' })
      .toString('base64');

    logStep('request-otp');
    const requestRes = await postJson('/auth/request-otp', { email });
    assertStatus(requestRes, 200, 'request-otp');
    assertJsonEquals(requestRes, 'success', true, 'request-otp');

    logStep('read-otp-row');
    const otpQuery = await withRetry(
      'read otp row',
      async () => {
        const result = await db.query(
          `SELECT otp_code FROM otps WHERE email = $1 ORDER BY expires_at DESC LIMIT 1`,
          [email]
        );
        if (result.rowCount === 0) {
          fail('No OTP row found for test email yet');
        }
        return result;
      },
      { attempts: 6, initialDelayMs: 100, backoffFactor: 2 }
    );
    const otp = otpQuery.rows[0].otp_code;

    logStep('verify-otp');
    const verifyRes = await postJson('/auth/verify-otp', {
      email,
      otp,
      device_id: deviceId,
      public_key: publicKeyBase64,
    });
    assertStatus(verifyRes, 200, 'verify-otp');
    assertJsonEquals(verifyRes, 'success', true, 'verify-otp');

    const authToken = verifyRes.json.auth_token;
    assertTruthy(authToken, 'verify-otp response missing auth_token');

    logStep('load-user-before-delete');
    const userBeforeDelete = await withRetry(
      'load user before delete',
      async () => {
        const result = await db.query(
          `SELECT id, status FROM users WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
          [email]
        );
        if (result.rowCount === 0) {
          fail('Expected user row after verify-otp');
        }
        return result;
      },
      { attempts: 6, initialDelayMs: 100, backoffFactor: 2 }
    );
    const userId = userBeforeDelete.rows[0].id;
    assertTruthy(userId, 'Expected user id to exist before deletion');

    logStep('proof-before-verification-should-fail');
    const proofBeforeSelfie = await postJson('/proofs/human', {}, authToken);
    assertStatus(proofBeforeSelfie, 403, 'proof before deterministic verification');

    logStep('challenge-1');
    const challengeRes = await postJson(
      '/auth/challenge',
      { publicKey: publicKeyBase64, device_id: deviceId },
      authToken
    );
    assertStatus(challengeRes, 200, 'challenge-1');
    assertJsonEquals(challengeRes, 'success', true, 'challenge-1');
    assertTruthy(challengeRes.json.nonce, 'challenge-1 response missing nonce');

    logStep('verify-invalid-signature');
    const invalidVerifyRes = await postJson(
      '/auth/verify',
      {
        publicKey: publicKeyBase64,
        nonce: challengeRes.json.nonce,
        signature: Buffer.from('invalid-signature').toString('base64'),
        device_id: deviceId,
      },
      authToken
    );
    assertStatus(invalidVerifyRes, 403, 'verify-invalid-signature');

    logStep('challenge-2');
    const challengeRes2 = await postJson(
      '/auth/challenge',
      { publicKey: publicKeyBase64, device_id: deviceId },
      authToken
    );
    assertStatus(challengeRes2, 200, 'challenge-2');
    assertJsonEquals(challengeRes2, 'success', true, 'challenge-2');
    assertTruthy(challengeRes2.json.nonce, 'challenge-2 response missing nonce');

    logStep('verify-valid-signature');
    const validSignature = sign(null, Buffer.from(challengeRes2.json.nonce, 'utf8'), privateKey).toString('base64');
    const deviceVerifyRes = await postJson(
      '/auth/verify',
      {
        publicKey: publicKeyBase64,
        nonce: challengeRes2.json.nonce,
        signature: validSignature,
        device_id: deviceId,
      },
      authToken
    );
    assertStatus(deviceVerifyRes, 200, 'verify-valid-signature');
    assertJsonEquals(deviceVerifyRes, 'success', true, 'verify-valid-signature');
    assertJsonEquals(deviceVerifyRes, 'verified', true, 'verify-valid-signature');

    logStep('issue-proof');
    const proofAfterVerify = await postJson('/proofs/human', {}, authToken);
    assertStatus(proofAfterVerify, 200, 'issue-proof');
    assertJsonEquals(proofAfterVerify, 'success', true, 'issue-proof');
    assertTruthy(proofAfterVerify.json.proof, 'issue-proof response missing proof payload');

    const tokenValue = proofAfterVerify.json.proof.token_value;
    assertTruthy(tokenValue, 'issue-proof response missing proof.token_value');

    logStep('verify-proof-before-delete');
    const verifyProof = await postJson('/proofs/verify', { token_value: tokenValue });
    assertStatus(verifyProof, 200, 'verify-proof-before-delete');
    assertJsonEquals(verifyProof, 'valid', true, 'verify-proof-before-delete');

    logStep('delete-account');
    const deleteRes = await deleteRequest('/user/account', authToken);
    assertStatus(deleteRes, 200, 'delete-account');
    assertJsonEquals(deleteRes, 'success', true, 'delete-account');

    logStep('verify-proof-after-delete');
    const verifyProofAfterDelete = await postJson('/proofs/verify', { token_value: tokenValue });
    assertStatus(verifyProofAfterDelete, 200, 'verify-proof-after-delete');
    assertJsonEquals(verifyProofAfterDelete, 'valid', false, 'verify-proof-after-delete');

    logStep('db-verify-proof-revoked');
    const proofStatusAfterDelete = await db.query(
      `SELECT status, revoke_reason, revoked_at FROM human_proofs WHERE token_value = $1`,
      [tokenValue]
    );
    assertTruthy(proofStatusAfterDelete.rowCount > 0, 'Expected issued proof row to exist after account deletion');

    const proofRow = proofStatusAfterDelete.rows[0];
    assertTruthy(proofRow.status === 'revoked', `Expected proof status=revoked after account deletion, got status=${proofRow.status}`);
    assertTruthy(
      proofRow.revoke_reason === 'account_deleted',
      `Expected proof revoke_reason=account_deleted, got revoke_reason=${proofRow.revoke_reason}`
    );
    assertTruthy(proofRow.revoked_at, 'Expected proof revoked_at to be set after account deletion');

    logStep('db-verify-user-soft-deleted');
    const userAfterDelete = await db.query(`SELECT status FROM users WHERE id = $1`, [userId]);
    assertTruthy(userAfterDelete.rowCount > 0, 'Expected user row to still exist after soft deletion');
    assertTruthy(
      userAfterDelete.rows[0].status === 'deleted',
      `Expected user status=deleted after account deletion, got status=${userAfterDelete.rows[0].status}`
    );

    logStep('db-verify-device-retained');
    const deviceRows = await db.query(
      `SELECT COUNT(*)::int AS count FROM devices WHERE user_id = $1 AND device_id = $2`,
      [userId, deviceId]
    );
    assertTruthy(
      deviceRows.rows[0].count > 0,
      'Expected device row to remain after soft account deletion'
    );

    logStep('db-verify-no-active-proofs');
    const activeProofCount = await db.query(
      `SELECT COUNT(*)::int AS count FROM human_proofs WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    assertTruthy(
      activeProofCount.rows[0].count === 0,
      `Expected no active proofs after account deletion, got count=${activeProofCount.rows[0].count}`
    );

    console.log('[test:enforcement] PASS');
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error('[test:enforcement] FAIL:', err.message || err);
  process.exit(1);
});
