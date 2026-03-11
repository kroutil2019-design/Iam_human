import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import pool from '../db/pool';
import { deterministicPipeline } from '../execution';

const router = Router();

// GET /user/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const result = await pool.query(
    `SELECT id, email, created_at, verified_basic, status FROM users WHERE id = $1`,
    [req.userId]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.json({ success: true, user: result.rows[0] });
});

// DELETE /user/account
router.delete('/account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const deviceId =
    typeof req.body?.device_id === 'string' && req.body.device_id.length > 0
      ? (req.body.device_id as string)
      : 'unknown-device';

  const pipelineResult = deterministicPipeline.run({
    device: { deviceId },
    identity: { actorId: userId, actorType: 'user' },
    intent: { actionType: 'USER_DELETE_ACCOUNT' },
    legitimacy: { authMethod: 'jwt', trustLevel: 'high' },
    context: {
      route: req.path,
      requestId: req.header('x-request-id') ?? undefined,
      userAgent: req.header('user-agent') ?? undefined,
      ipAddress: req.ip,
    },
    capability: { permissions: ['user:delete-account'] },
    payload: (req.body ?? {}) as Record<string, unknown>,
  });

  if (!pipelineResult.execution.success || !pipelineResult.execution.output) {
    res.status(403).json({
      success: false,
      error: 'Execution blocked by deterministic pipeline',
      validation_errors: pipelineResult.validation.errors,
      constraint_decision: pipelineResult.constraints.decision,
      constraint_reasons: pipelineResult.constraints.reasons,
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    await client.query(
      `UPDATE human_proofs
       SET status = 'revoked', revoked_at = NOW(), revoke_reason = 'account_deleted'
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    await client.query('COMMIT');
    res.json({ success: true, deterministic_output: pipelineResult.execution.output });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default router;
