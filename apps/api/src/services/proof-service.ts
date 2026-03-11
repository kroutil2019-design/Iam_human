import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';
import { env } from '../config/env';

export async function issueProofForUser(userId: string) {
  const expiryDays = env.hptExpiryDays;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  const tokenId = uuidv4();
  const tokenValue = jwt.sign({ tokenId, userId }, env.jwtSecret, {
    expiresIn: `${expiryDays}d`,
  });

  await pool.query(
    `UPDATE human_proofs
     SET status = 'revoked', revoked_at = NOW(), revoke_reason = 'superseded'
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  const insertResult = await pool.query(
    `INSERT INTO human_proofs (user_id, token_id, token_value, status, issued_at, expires_at)
     VALUES ($1, $2, $3, 'active', NOW(), $4)
     RETURNING token_id, token_value, user_id, issued_at, expires_at, status`,
    [userId, tokenId, tokenValue, expiresAt]
  );

  return insertResult.rows[0];
}
