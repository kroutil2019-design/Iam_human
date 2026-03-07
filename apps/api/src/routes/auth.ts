import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import jwt from 'jsonwebtoken';

const router = Router();

// POST /auth/request-otp
router.post('/request-otp', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ success: false, error: 'Valid email required' });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await pool.query(
    `INSERT INTO otps (email, otp_code, expires_at) VALUES ($1, $2, $3)`,
    [email.toLowerCase().trim(), otp, expiresAt]
  );

  // Log OTP to console (mock email delivery)
  console.log(`[OTP] ${email} → ${otp} (expires ${expiresAt.toISOString()})`);

  res.json({ success: true });
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { email, otp, device_id } = req.body as {
    email?: string;
    otp?: string;
    device_id?: string;
  };

  if (!email || !otp || !device_id) {
    res.status(400).json({ success: false, error: 'email, otp, and device_id are required' });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

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

  // Upsert user
  const userResult = await pool.query(
    `INSERT INTO users (email, verified_basic, status)
     VALUES ($1, TRUE, 'active')
     ON CONFLICT (email) DO UPDATE
       SET verified_basic = TRUE, updated_at = NOW(), status = 'active'
     RETURNING id`,
    [normalizedEmail]
  );

  const userId = userResult.rows[0].id as string;

  // Upsert device
  await pool.query(
    `INSERT INTO devices (user_id, device_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, device_id]
  );
  await pool.query(
    `UPDATE devices SET last_seen_at = NOW() WHERE user_id = $1 AND device_id = $2`,
    [userId, device_id]
  );

  // Issue JWT
  const secret = process.env.JWT_SECRET ?? '';
  const jwtExpiry = process.env.JWT_EXPIRY ?? '7d';
  const authToken = jwt.sign({ userId }, secret, {
    expiresIn: jwtExpiry,
  } as jwt.SignOptions);

  res.json({ success: true, user_id: userId, auth_token: authToken });
});

export default router;
