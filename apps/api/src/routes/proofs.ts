import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import pool from '../db/pool';

const router = Router();

// POST /proofs/human  – issue a new HPT
router.post('/human', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  // Check user is verified_basic and not deleted
  const userResult = await pool.query(
    `SELECT verified_basic, status FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rowCount === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const user = userResult.rows[0];
  if (user.status === 'deleted') {
    res.status(403).json({ success: false, error: 'Account deleted' });
    return;
  }

  if (!user.verified_basic) {
    res.status(403).json({ success: false, error: 'User not verified' });
    return;
  }

  const expiryDays = parseInt(process.env.HPT_EXPIRY_DAYS ?? '30', 10);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const tokenId = uuidv4();
  const secret = process.env.JWT_SECRET ?? '';
  const tokenValue = jwt.sign({ tokenId, userId }, secret, {
    expiresIn: `${expiryDays}d`,
  });

  const now = new Date();

  // Revoke any previous active proofs
  await pool.query(
    `UPDATE human_proofs SET status = 'revoked', revoked_at = NOW(), revoke_reason = 'superseded'
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  // Insert new proof
  const result = await pool.query(
    `INSERT INTO human_proofs (user_id, token_id, token_value, status, issued_at, expires_at)
     VALUES ($1, $2, $3, 'active', $4, $5)
     RETURNING *`,
    [userId, tokenId, tokenValue, now, expiresAt]
  );

  const proof = result.rows[0];
  res.json({
    success: true,
    proof: {
      token_id: proof.token_id,
      token_value: proof.token_value,
      user_id: proof.user_id,
      issued_at: proof.issued_at,
      expires_at: proof.expires_at,
      status: proof.status,
    },
  });
});

// GET /proofs/current – get latest active proof for user
router.get('/current', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM human_proofs
     WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
     ORDER BY issued_at DESC LIMIT 1`,
    [req.userId]
  );

  if (result.rowCount === 0) {
    res.json({ success: true, proof: null });
    return;
  }

  const proof = result.rows[0];
  res.json({
    success: true,
    proof: {
      token_id: proof.token_id,
      token_value: proof.token_value,
      user_id: proof.user_id,
      issued_at: proof.issued_at,
      expires_at: proof.expires_at,
      status: proof.status,
    },
  });
});

// POST /proofs/verify – public endpoint for integrators
router.post('/verify', async (req: Request, res: Response) => {
  const { token_value } = req.body as { token_value?: string };

  if (!token_value) {
    res.status(400).json({ valid: false, reason: 'token_value required' });
    return;
  }

  const result = await pool.query(
    `SELECT hp.*, u.email FROM human_proofs hp
     JOIN users u ON u.id = hp.user_id
     WHERE hp.token_value = $1`,
    [token_value]
  );

  if (result.rowCount === 0) {
    res.json({ valid: false, reason: 'Token not found' });
    return;
  }

  const proof = result.rows[0];

  if (proof.status !== 'active') {
    res.json({ valid: false, reason: `Token is ${proof.status}` });
    return;
  }

  if (new Date(proof.expires_at) < new Date()) {
    // Auto-expire
    await pool.query(
      `UPDATE human_proofs SET status = 'expired' WHERE id = $1`,
      [proof.id]
    );
    res.json({ valid: false, reason: 'Token expired' });
    return;
  }

  res.json({
    valid: true,
    user_id: proof.user_id,
    issued_at: proof.issued_at,
    expires_at: proof.expires_at,
  });
});

export default router;
