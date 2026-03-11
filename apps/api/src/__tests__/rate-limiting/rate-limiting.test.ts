import { ActionIndex } from '../../execution/action-index';

describe('rate limiting', () => {
  test('tracks repeated stage hits over time', () => {
    const index = new ActionIndex();

    for (let i = 0; i < 3; i += 1) {
      index.incrementStage('received');
      index.incrementIntent('AUTH_CHALLENGE');
    }

    const snapshot = index.snapshot();
    expect(snapshot.totals.received).toBe(3);
    expect(snapshot.byIntent.AUTH_CHALLENGE).toBe(3);
  });
});
