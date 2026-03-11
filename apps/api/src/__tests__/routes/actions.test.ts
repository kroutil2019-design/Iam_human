/**
 * Integration tests for POST /actions/execute envelope endpoint.
 * Uses a lightweight express app with only the actions router to avoid
 * needing database connections or env secrets.
 */
import express from 'express';
import request from 'supertest';
import actionsRouter from '../../routes/actions';
import { actionIndex } from '../../execution';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/actions', actionsRouter);
  return app;
}

const validBody = {
  device: { deviceId: 'device-1' },
  identity: { actorId: 'user-1', actorType: 'user' },
  intent: { actionType: 'AUTH_CHALLENGE' },
  legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
  context: { route: '/auth/challenge' },
  capability: { permissions: ['auth:challenge'] },
  payload: { publicKey: 'pk123' },
};

describe('POST /actions/execute', () => {
  const app = buildApp();

  beforeEach(() => {
    actionIndex.reset();
  });

  // --- Input validation ---
  it('returns 400 when device.deviceId is missing', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({ ...validBody, device: undefined });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.polarity).toBe('-');
    expect(res.body.eventHash).toHaveLength(64);
    expect(res.body.reason).toMatch(/device\.deviceId/);
  });

  it('returns - polarity when a primitive is missing', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({ ...validBody, device: undefined });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.polarity).toBe('-');
    expect(res.body.eventHash).toHaveLength(64);
  });

  it('returns 400 when identity.actorId is missing', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({ ...validBody, identity: undefined });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.eventHash).toHaveLength(64);
    expect(res.body.reason).toMatch(/identity\.actorId/);
  });

  it('returns 400 when intent.actionType is missing', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({ ...validBody, intent: undefined });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.eventHash).toHaveLength(64);
    expect(res.body.reason).toMatch(/intent\.actionType/);
  });

  it('returns 400 when legitimacy.authMethod is missing', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({ ...validBody, legitimacy: undefined });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.eventHash).toHaveLength(64);
    expect(res.body.reason).toMatch(/legitimacy\.authMethod/);
  });

  it('returns 400 when payload is missing', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({ ...validBody, payload: undefined });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.eventHash).toHaveLength(64);
    expect(res.body.reason).toMatch(/payload/);
  });

  it('returns 400 when payload is not an object', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({ ...validBody, payload: 'string' });
    expect(res.status).toBe(400);
  });

  // --- Pipeline validation rejection ---
  it('returns 400 when pipeline validation fails (empty deviceId)', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({ ...validBody, device: { deviceId: '   ' } });
    expect(res.status).toBe(400); // caught before pipeline by trim check
  });

  // --- Pipeline constraint rejection ---
  it('returns 403 when constraints reject (low trust on AUTH)', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({
        ...validBody,
        legitimacy: { ...validBody.legitimacy, trustLevel: 'low' },
      });
    expect(res.status).toBe(403);
    expect(res.body.status).toBe('fail');
    expect(res.body.polarity).toBe('-');
    expect(res.body.eventHash).toHaveLength(64);
    expect(res.body.reason).toMatch(/fail closed/i);
  });

  // --- Successful execution ---
  it('returns 200 with deterministic_output on success', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pass');
    expect(res.body.polarity).toBe('+');
    expect(res.body.eventHash).toHaveLength(64);
    expect(res.body.output).toBeDefined();
    expect(res.body.output.actionType).toBe('AUTH_CHALLENGE');
    expect(res.body.output.outputHash).toBeTruthy();
  });

  it('returns identical outputHash for identical requests', async () => {
    const now = new Date('2025-01-01T00:00:00.000Z');
    jest.useFakeTimers({ now });
    const a = await request(app).post('/actions/execute').send(validBody);
    const b = await request(app).post('/actions/execute').send(validBody);
    jest.useRealTimers();
    expect(a.body.output.outputHash).toBe(b.body.output.outputHash);
    expect(a.body.eventHash).toBe(b.body.eventHash);
  });

  // --- PROOF_VERIFY via envelope ---
  it('executes PROOF_VERIFY through envelope endpoint', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({
        device: { deviceId: 'public-client' },
        identity: { actorId: 'anonymous', actorType: 'anonymous' },
        intent: { actionType: 'PROOF_VERIFY' },
        legitimacy: { authMethod: 'public', trustLevel: 'low' },
        context: { route: '/proofs/verify' },
        capability: { permissions: ['proof:verify'] },
        payload: { token_value: 'tok123' },
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pass');
    expect(res.body.polarity).toBe('+');
    expect(res.body.eventHash).toHaveLength(64);
  });

  // --- Semantic validation failure via envelope ---
  it('rejects PROOF_VERIFY with non-anonymous actorType', async () => {
    const res = await request(app)
      .post('/actions/execute')
      .send({
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: { actionType: 'PROOF_VERIFY' },
        legitimacy: { authMethod: 'public', trustLevel: 'low' },
        context: { route: '/proofs/verify' },
        capability: { permissions: ['proof:verify'] },
        payload: { token_value: 'tok' },
      });
    expect(res.status).toBe(403);
    expect(res.body.status).toBe('fail');
    expect(res.body.polarity).toBe('-');
    expect(res.body.eventHash).toHaveLength(64);
  });

  it('returns deterministic eventHash for repeated validation failures', async () => {
    const body = { ...validBody, device: { deviceId: '   ' } };
    const a = await request(app).post('/actions/execute').send(body);
    const b = await request(app).post('/actions/execute').send(body);
    expect(a.status).toBe(400);
    expect(b.status).toBe(400);
    expect(a.body.eventHash).toBe(b.body.eventHash);
  });
});

describe('GET /actions/index', () => {
  const app = buildApp();

  beforeEach(() => {
    actionIndex.reset();
  });

  it('returns index structure with expected totals and dimension maps', async () => {
    const res = await request(app).get('/actions/index');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totals: {
        received: 0,
        configurationBuilt: 0,
        zGateValidated: 0,
        constraintEvaluated: 0,
        passed: 0,
        failed: 0,
        polarityPositive: 0,
        polarityNegative: 0,
        executionStarted: 0,
        executionCompleted: 0,
        executionFailed: 0,
      },
      byIntent: {},
      byCapability: {},
      byFailureReason: {},
    });
  });

  it('increments counters after valid and failed actions', async () => {
    await request(app).post('/actions/execute').send(validBody);
    await request(app)
      .post('/actions/execute')
      .send({
        ...validBody,
        legitimacy: { ...validBody.legitimacy, trustLevel: 'low' },
      });

    const indexRes = await request(app).get('/actions/index');
    expect(indexRes.status).toBe(200);
    expect(indexRes.body.totals.received).toBe(2);
    expect(indexRes.body.totals.configurationBuilt).toBe(2);
    expect(indexRes.body.totals.zGateValidated).toBe(2);
    expect(indexRes.body.totals.constraintEvaluated).toBe(2);
    expect(indexRes.body.totals.passed).toBe(1);
    expect(indexRes.body.totals.failed).toBe(1);
    expect(indexRes.body.totals.polarityPositive).toBe(1);
    expect(indexRes.body.totals.polarityNegative).toBe(1);
    expect(indexRes.body.totals.executionStarted).toBe(1);
    expect(indexRes.body.totals.executionCompleted).toBe(1);
    expect(indexRes.body.totals.executionFailed).toBe(1);
    expect(indexRes.body.byIntent.AUTH_CHALLENGE).toBe(2);
    expect(indexRes.body.byCapability['auth:challenge']).toBe(2);
    expect(indexRes.body.byFailureReason['Policy constraint: AUTH actions require trust level medium or high']).toBe(1);
  });
});
