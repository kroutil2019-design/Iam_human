import { Router, Request, Response } from 'express';
import {
  deterministicPipeline,
  actionIndex,
  ActionRequest,
  PrimitiveConfiguration,
  createEventHash,
} from '../execution';
import { ConfigurationBuilder } from '../execution/configuration-builder';

const router = Router();
const configurationBuilder = new ConfigurationBuilder();

function toBestEffortActionRequest(req: Request, body: Partial<ActionRequest> | undefined): ActionRequest {
  const payload = body?.payload;
  const normalizedPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};

  return {
    device: {
      deviceId: typeof body?.device?.deviceId === 'string' ? body.device.deviceId.trim() : '',
      publicKey: body?.device?.publicKey,
      fingerprint: body?.device?.fingerprint,
    },
    identity: {
      actorId: typeof body?.identity?.actorId === 'string' ? body.identity.actorId.trim() : '',
      actorType: body?.identity?.actorType,
      sessionId: body?.identity?.sessionId,
    },
    intent: {
      actionType: typeof body?.intent?.actionType === 'string' ? body.intent.actionType.trim() : '',
    },
    legitimacy: {
      authMethod: (body?.legitimacy?.authMethod as ActionRequest['legitimacy']['authMethod']) ?? 'public',
      trustLevel: body?.legitimacy?.trustLevel,
      evidence: body?.legitimacy?.evidence,
    },
    context: {
      route: body?.context?.route ?? req.path,
      requestId: body?.context?.requestId ?? req.header('x-request-id') ?? undefined,
      userAgent: body?.context?.userAgent ?? req.header('user-agent') ?? undefined,
      ipAddress: body?.context?.ipAddress ?? req.ip,
    },
    capability: {
      permissions: body?.capability?.permissions,
      constraintsVersion: body?.capability?.constraintsVersion,
    },
    payload: normalizedPayload,
  };
}

function buildEventHashFromBody(req: Request, body: Partial<ActionRequest> | undefined): string {
  const request = toBestEffortActionRequest(req, body);
  const configuration: PrimitiveConfiguration = configurationBuilder.build(request);
  return createEventHash(configuration);
}

function failEnvelope(res: Response, statusCode: number, eventHash: string, reason: string): void {
  res.status(statusCode).json({
    status: 'fail',
    polarity: '-',
    eventHash,
    reason,
  });
}

router.get('/index', (_req: Request, res: Response) => {
  res.json(actionIndex.snapshot());
});

// POST /actions/execute — generic envelope endpoint for deterministic pipeline execution.
// Clients submit ActionRequest objects directly; the pipeline validates and executes.
router.post('/execute', (req: Request, res: Response) => {
  const body = req.body as Partial<ActionRequest> | undefined;
  const bestEffortEventHash = buildEventHashFromBody(req, body);

  if (!body || !body.device || typeof body.device.deviceId !== 'string' || !body.device.deviceId.trim()) {
    failEnvelope(res, 400, bestEffortEventHash, 'device.deviceId is required');
    return;
  }

  if (!body.identity || typeof body.identity.actorId !== 'string' || !body.identity.actorId.trim()) {
    failEnvelope(res, 400, bestEffortEventHash, 'identity.actorId is required');
    return;
  }

  if (!body.intent || typeof body.intent.actionType !== 'string' || !body.intent.actionType.trim()) {
    failEnvelope(res, 400, bestEffortEventHash, 'intent.actionType is required');
    return;
  }

  if (!body.legitimacy || typeof body.legitimacy.authMethod !== 'string' || !body.legitimacy.authMethod.trim()) {
    failEnvelope(res, 400, bestEffortEventHash, 'legitimacy.authMethod is required');
    return;
  }

  if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
    failEnvelope(res, 400, bestEffortEventHash, 'payload must be a non-null object');
    return;
  }

  const actionRequest = toBestEffortActionRequest(req, body);
  actionRequest.legitimacy.authMethod = body.legitimacy.authMethod as ActionRequest['legitimacy']['authMethod'];

  const result = deterministicPipeline.run(actionRequest);

  if (!result.execution.success) {
    failEnvelope(
      res,
      403,
      result.eventHash,
      result.execution.error ?? 'Execution blocked by deterministic pipeline'
    );
    return;
  }

  res.json({
    status: result.polarity === '+' ? 'pass' : 'fail',
    polarity: result.polarity,
    eventHash: result.eventHash,
    output: result.execution.output,
  });
});

export default router;
