import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import pool from '../db/pool';

const router = Router();

router.use(requireAdmin);

// GET /admin/users
router.get('/users', async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT id, email, created_at, verified_basic, selfie_uploaded, status
     FROM users ORDER BY created_at DESC`
  );
  res.json({ success: true, users: result.rows });
});

// GET /admin/proofs
router.get('/proofs', async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT hp.id, hp.token_id, hp.token_value, hp.status,
            hp.issued_at, hp.expires_at, hp.revoked_at, hp.revoke_reason,
            u.email AS user_email
     FROM human_proofs hp
     JOIN users u ON u.id = hp.user_id
     ORDER BY hp.issued_at DESC`
  );
  res.json({ success: true, proofs: result.rows });
});

// POST /admin/proofs/invalidate
router.post('/proofs/invalidate', async (req: Request, res: Response) => {
  const { token_id, reason } = req.body as { token_id?: string; reason?: string };

  if (!token_id || !reason) {
    res.status(400).json({ success: false, error: 'token_id and reason are required' });
    return;
  }

  const result = await pool.query(
    `UPDATE human_proofs
     SET status = 'revoked', revoked_at = NOW(), revoke_reason = $2
     WHERE token_id = $1
     RETURNING id`,
    [token_id, reason]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ success: false, error: 'Token not found' });
    return;
  }

  res.json({ success: true });
});

export default router;
