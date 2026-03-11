import { ActionIndex } from '../../execution/action-index';

describe('reconciliation', () => {
  test('reconciles counters to initial state after reset', () => {
    const index = new ActionIndex();
    index.incrementStage('received');
    index.incrementStage('failed');
    index.incrementFailureReason('sample_failure');

    index.reset();
    const snapshot = index.snapshot();

    expect(snapshot.totals.received).toBe(0);
    expect(snapshot.totals.failed).toBe(0);
    expect(snapshot.byFailureReason).toEqual({});
  });
});
