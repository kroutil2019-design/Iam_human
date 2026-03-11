import express from 'express';
import request from 'supertest';
import actionsRouter from '../../routes/actions';

describe('input sanitization', () => {
  test('trims actorId and actionType in envelope request before execution', async () => {
    const app = express();
    app.use(express.json());
    app.use('/actions', actionsRouter);

    const res = await request(app)
      .post('/actions/execute')
      .send({
        device: { deviceId: 'device-1' },
        identity: { actorId: '  user-1  ', actorType: 'user' },
        intent: { actionType: '  AUTH_CHALLENGE  ' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: { publicKey: 'pk1' },
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pass');
    expect(res.body.output.actionType).toBe('AUTH_CHALLENGE');
  });
});
