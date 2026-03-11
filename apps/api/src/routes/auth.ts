import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createPublicKey, randomBytes, verify as verifySignature } from 'crypto';
import { deterministicPipeline } from '../execution';
import { issueProofForUser } from '../services/proof-service';

const router = Router();

function runPipelineOrReject(
  req: Request,
  res: Response,
  params: {
    actionType: string;
    actorId: string;
    deviceId: string;
    payload: Record<string, unknown>;
    authMethod: 'jwt' | 'otp' | 'public' | 'admin';
    permissions: string[];
    actorType?: 'user' | 'system' | 'anonymous';
    trustLevel?: 'high' | 'medium' | 'low';
  }
) {
  const result = deterministicPipeline.run({
    device: { deviceId: params.deviceId },
    identity: {
      actorId: params.actorId,
      actorType: params.actorType ?? 'user',
    },
    intent: { actionType: params.actionType },
    legitimacy: {
      authMethod: params.authMethod,
      trustLevel: params.trustLevel ?? 'medium',
    },
    context: {
      route: req.path,
      requestId: req.header('x-request-id') ?? undefined,
      userAgent: req.header('user-agent') ?? undefined,
      ipAddress: req.ip,
    },
    capability: { permissions: params.permissions },
    payload: params.payload,
  });

  if (!result.execution.success || !result.execution.output) {
    res.status(403).json({
      success: false,
      error: 'Execution blocked by deterministic pipeline',
      validation_errors: result.validation.errors,
      constraint_decision: result.constraints.decision,
      constraint_reasons: result.constraints.reasons,
    });
    return null;
  }

  return result.execution.output;
}

// POST /auth/request-otp
router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid email required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const deterministicOutput = runPipelineOrReject(req, res, {
      actionType: 'AUTH_REQUEST_OTP',
      actorId: normalizedEmail,
      deviceId: 'email-channel',
      payload: { email: normalizedEmail },
      authMethod: 'otp',
      permissions: ['auth:request-otp'],
      actorType: 'anonymous',
      trustLevel: 'medium',
    });
    if (!deterministicOutput) {
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await pool.query(
      `INSERT INTO otps (email, otp_code, expires_at) VALUES ($1, $2, $3)`,
      [normalizedEmail, otp, expiresAt]
    );

    // Log OTP to console (mock email delivery)
    console.log(`[OTP] ${email} -> ${otp} (expires ${expiresAt.toISOString()})`);

    res.json({ success: true, deterministic_output: deterministicOutput });
  } catch (error) {
    console.error('[OTP] request-otp failed:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { email, otp, device_id, public_key } = req.body as {
    email?: string;
    otp?: string;
    device_id?: string;
    public_key?: string;
  };

  if (!email || !otp || !device_id || !public_key) {
    res.status(400).json({ success: false, error: 'email, otp, device_id, and public_key are required' });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const deterministicOutput = runPipelineOrReject(req, res, {
    actionType: 'AUTH_VERIFY_OTP',
    actorId: normalizedEmail,
    deviceId: device_id,
    payload: { email: normalizedEmail, otp, device_id, public_key },
    authMethod: 'otp',
    permissions: ['auth:verify-otp'],
    actorType: 'anonymous',
    trustLevel: 'medium',
  });
  if (!deterministicOutput) {
    return;
  }

  // Find latest unused OTP
  const otpResult = await pool.query(
    `SELECT id, otp_code, expires_at, used
     FROM otps
     WHERE email = $1 AND used = FALSE
     ORDER BY expires_at DESC
     LIMIT 1`,
    [normalizedEmail]
  );

  if (otpResult.rowCount === 0) {
    res.status(400).json({ success: false, error: 'No pending OTP found' });
    return;
  }

  const otpRow = otpResult.rows[0];
  if (new Date(otpRow.expires_at) < new Date()) {
    res.status(400).json({ success: false, error: 'OTP expired' });
    return;
  }

  if (otpRow.otp_code !== otp) {
    res.status(400).json({ success: false, error: 'Invalid OTP' });
    return;
  }

  // Mark OTP as used
  await pool.query(`UPDATE otps SET used = TRUE WHERE id = $1`, [otpRow.id]);

  // Upsert user. OTP only proves email ownership; deterministic verification is completed via signature challenge.
  const userResult = await pool.query(
    `INSERT INTO users (email, status)
     VALUES ($1, 'active')
     ON CONFLICT (email) DO UPDATE
       SET updated_at = NOW(), status = 'active'
     RETURNING id`,
    [normalizedEmail]
  );

  const userId = userResult.rows[0].id as string;

  // Upsert device
  await pool.query(
    `INSERT INTO devices (user_id, device_id, public_key)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [userId, device_id, public_key]
  );
  await pool.query(
    `UPDATE devices
     SET last_seen_at = NOW(), public_key = $3
     WHERE user_id = $1 AND device_id = $2`,
    [userId, device_id, public_key]
  );

  // Issue JWT
  const authToken = jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiry,
  } as jwt.SignOptions);

  res.json({ success: true, user_id: userId, auth_token: authToken, deterministic_output: deterministicOutput });
});

// POST /auth/challenge
router.post('/challenge', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { publicKey, device_id } = req.body as { publicKey?: string; device_id?: string };

  if (!publicKey || typeof publicKey !== 'string' || !device_id || typeof device_id !== 'string') {
    res.status(400).json({ success: false, error: 'publicKey and device_id are required' });
    return;
  }

  const userId = req.userId!;

  const deterministicOutput = runPipelineOrReject(req, res, {
    actionType: 'AUTH_CHALLENGE',
    actorId: userId,
    deviceId: device_id,
    payload: { publicKey, device_id },
    authMethod: 'jwt',
    permissions: ['auth:challenge'],
  });
  if (!deterministicOutput) {
    return;
  }

  const userStatusResult = await pool.query(
    `SELECT status FROM users WHERE id = $1`,
    [userId]
  );
  if (userStatusResult.rowCount === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  if (userStatusResult.rows[0].status !== 'active') {
    res.status(403).json({ success: false, error: 'Account not active' });
    return;
  }

  const deviceResult = await pool.query(
    `SELECT id
     FROM devices
     WHERE user_id = $1 AND device_id = $2
     LIMIT 1`,
    [userId, device_id]
  );

  if (deviceResult.rowCount === 0) {
    await pool.query(
      `INSERT INTO devices (user_id, device_id, public_key)
       VALUES ($1, $2, $3)`,
      [userId, device_id, publicKey]
    );
  } else {
    await pool.query(
      `UPDATE devices
       SET public_key = $3,
           last_seen_at = NOW()
       WHERE user_id = $1 AND device_id = $2`,
      [userId, device_id, publicKey]
    );
  }

  const nonce = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await pool.query(
    `INSERT INTO auth_challenges (user_id, public_key, nonce, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, publicKey, nonce, expiresAt]
  );

  res.json({ success: true, nonce, deterministic_output: deterministicOutput });
});

// POST /auth/verify
router.post('/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { publicKey, nonce, signature, device_id } = req.body as {
    publicKey?: string;
    nonce?: string;
    signature?: string;
    device_id?: string;
  };

  if (!publicKey || !nonce || !signature || !device_id) {
    res.status(400).json({ success: false, error: 'publicKey, nonce, signature, and device_id are required' });
    return;
  }

  const userId = req.userId!;

  const deterministicOutput = runPipelineOrReject(req, res, {
    actionType: 'AUTH_VERIFY',
    actorId: userId,
    deviceId: device_id,
    payload: { publicKey, nonce, signature, device_id },
    authMethod: 'jwt',
    permissions: ['auth:verify'],
  });
  if (!deterministicOutput) {
    return;
  }

  const userStatusResult = await pool.query(
    `SELECT status FROM users WHERE id = $1`,
    [userId]
  );
  if (userStatusResult.rowCount === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  if (userStatusResult.rows[0].status !== 'active') {
    res.status(403).json({ success: false, error: 'Account not active' });
    return;
  }

  const deviceResult = await pool.query(
    `SELECT id
     FROM devices
     WHERE user_id = $1 AND device_id = $2 AND public_key = $3
     LIMIT 1`,
    [userId, device_id, publicKey]
  );
  if (deviceResult.rowCount === 0) {
    res.status(403).json({ success: false, error: 'Public key is not registered for this user' });
    return;
  }

  const challengeResult = await pool.query(
    `SELECT id, expires_at, used
     FROM auth_challenges
     WHERE user_id = $1 AND public_key = $2 AND nonce = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, publicKey, nonce]
  );

  if (challengeResult.rowCount === 0) {
    res.status(400).json({ success: false, error: 'Challenge not found' });
    return;
  }

  const challenge = challengeResult.rows[0];

  if (challenge.used) {
    res.status(400).json({ success: false, error: 'Challenge already used' });
    return;
  }

  if (new Date(challenge.expires_at) < new Date()) {
    await pool.query(
      `UPDATE auth_challenges SET used = TRUE, used_at = NOW() WHERE id = $1`,
      [challenge.id]
    );
    res.status(400).json({ success: false, error: 'Challenge expired' });
    return;
  }

  let verified = false;
  try {
    const publicKeyDer = Buffer.from(publicKey, 'base64');
    const signatureBytes = Buffer.from(signature, 'base64');
    const publicKeyObject = createPublicKey({
      key: publicKeyDer,
      format: 'der',
      type: 'spki',
    });
    verified = verifySignature(null, Buffer.from(nonce, 'utf8'), publicKeyObject, signatureBytes);
  } catch {
    verified = false;
  }

  await pool.query(
    `UPDATE auth_challenges SET used = TRUE, used_at = NOW() WHERE id = $1`,
    [challenge.id]
  );

  if (!verified) {
    res.status(403).json({ success: false, error: 'Invalid signature' });
    return;
  }

  await pool.query(
    `UPDATE users SET verified_basic = TRUE, updated_at = NOW() WHERE id = $1`,
    [userId]
  );

  const proof = await issueProofForUser(userId);

  res.json({
    success: true,
    verified: true,
    proof,
    deterministic_output: deterministicOutput,
  });
});

export default router;
