import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import pool from '../db/pool';
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
      actorType: params.actorType,
    },
    intent: { actionType: params.actionType },
    legitimacy: {
      authMethod: params.authMethod,
      trustLevel: params.trustLevel,
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

async function issueProofHandler(req: AuthenticatedRequest, res: Response) {
  const userId = req.userId!;
  const deviceId =
    typeof req.body?.device_id === 'string' && req.body.device_id.length > 0
      ? (req.body.device_id as string)
      : 'unknown-device';

  const deterministicOutput = runPipelineOrReject(req, res, {
    actionType: 'PROOF_ISSUE',
    actorId: userId,
    deviceId,
    payload: (req.body ?? {}) as Record<string, unknown>,
    authMethod: 'jwt',
    permissions: ['proof:issue'],
    actorType: 'user',
    trustLevel: 'high',
  });
  if (!deterministicOutput) {
    return;
  }

  // Check user is active and deterministically verified.
  const userResult = await pool.query(
    `SELECT verified_basic, status FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rowCount === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const user = userResult.rows[0];
  if (user.status !== 'active') {
    res.status(403).json({ success: false, error: 'Account not active' });
    return;
  }

  if (!user.verified_basic) {
    res.status(403).json({
      success: false,
      error: 'Verification incomplete: complete deterministic device verification first',
    });
    return;
  }

  const proof = await issueProofForUser(userId);
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
    deterministic_output: deterministicOutput,
  });
}

// POST /proofs/issue - deterministic proof issuance endpoint
router.post('/issue', requireAuth, issueProofHandler);

// Backward-compatible alias for older clients.
router.post('/human', requireAuth, issueProofHandler);

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

  const deterministicOutput = runPipelineOrReject(req, res, {
    actionType: 'PROOF_VERIFY',
    actorId: 'anonymous',
    deviceId:
      typeof req.body?.device_id === 'string' && req.body.device_id.length > 0
        ? (req.body.device_id as string)
        : 'public-client',
    payload: { token_value },
    authMethod: 'public',
    permissions: ['proof:verify'],
    actorType: 'anonymous',
    trustLevel: 'low',
  });
  if (!deterministicOutput) {
    return;
  }

  const result = await pool.query(
    `SELECT hp.*, u.email, u.status AS user_status FROM human_proofs hp
     JOIN users u ON u.id = hp.user_id
     WHERE hp.token_value = $1`,
    [token_value]
  );

  if (result.rowCount === 0) {
    res.json({ valid: false, reason: 'Token not found' });
    return;
  }

  const proof = result.rows[0];

  // A non-active account can never be trusted. Revoke lingering active proofs.
  if (proof.user_status !== 'active') {
    if (proof.status === 'active') {
      await pool.query(
        `UPDATE human_proofs
         SET status = 'revoked', revoked_at = NOW(), revoke_reason = 'user_inactive'
         WHERE id = $1`,
        [proof.id]
      );
    }

    res.json({ valid: false, reason: 'User account is not active', deterministic_output: deterministicOutput });
    return;
  }

  if (proof.status !== 'active') {
    res.json({ valid: false, reason: `Token is ${proof.status}`, deterministic_output: deterministicOutput });
    return;
  }

  if (new Date(proof.expires_at) < new Date()) {
    // Auto-expire
    await pool.query(
      `UPDATE human_proofs SET status = 'expired' WHERE id = $1`,
      [proof.id]
    );
    res.json({ valid: false, reason: 'Token expired', deterministic_output: deterministicOutput });
    return;
  }

  res.json({
    valid: true,
    user_id: proof.user_id,
    issued_at: proof.issued_at,
    expires_at: proof.expires_at,
    deterministic_output: deterministicOutput,
  });
});

export default router;
