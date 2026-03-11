import { TelemetryEvent } from './models';

export class TelemetryRecorder {
  record(event: TelemetryEvent): void {
    const normalized = this.normalize(event);
    // Normalized telemetry sink.
    console.log(`[telemetry] ${JSON.stringify(normalized)}`);
  }

  private normalize(event: TelemetryEvent): TelemetryEvent {
    const details = event.details
      ? Object.fromEntries(
          Object.entries(event.details).map(([key, value]) => [
            key.trim().toLowerCase(),
            typeof value === 'string' ? value.trim() : value,
          ])
        )
      : undefined;

    return {
      ...event,
      type: event.type.trim() as TelemetryEvent['type'],
      actorId: event.actorId.trim(),
      actionType: event.actionType.trim(),
      executionId: event.executionId?.trim(),
      details,
    };
  }
}
