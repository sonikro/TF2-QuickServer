---
name: telemetry
description: "Use when adding or modifying logging, metrics, or tracing in TypeScript code across packages/** and src/ in this repository. Enforces OpenTelemetry as the only telemetry mechanism, using the @tf2qs/telemetry workspace package — emit logs via the exported logger (severityText INFO/WARN/ERROR/DEBUG plus attributes), trace multi-step operations with OperationTracingService.executeWithTracing, and create metrics via the exported meter. Never log secrets or personal data."
---

# Telemetry (OpenTelemetry)

All telemetry — logs, metrics, and traces — goes through **OpenTelemetry**
using the `@tf2qs/telemetry` workspace package. Do not implement custom
telemetry solutions or third-party integrations outside OpenTelemetry.

## Imports

Import from the workspace alias (already wired in `tsconfig.json` paths):

```typescript
import { logger, tracer, meter } from '@tf2qs/telemetry';
import { OperationTracingService } from '@tf2qs/telemetry';
```

`index.ts` re-exports `otel.ts` (`logger`, `tracer`, `meter`) and
`OperationTracingService.ts`. Import the telemetry package once at boot
(see `src/index.ts`).

## Logging

Use the exported `logger` and its `emit` method:

```typescript
logger.emit({
  severityText: 'INFO',
  body: 'Operation completed',
  attributes: {
    entityId: 'entity-123',
    region: 'sa-saopaulo-1',
  },
});
```

- Severity levels: `INFO`, `WARN`, `ERROR`, `DEBUG`.
- Include relevant context in `attributes` (entity IDs, regions, etc.).
- Structure log messages consistently with operation and entity information.

## Tracing

Use `OperationTracingService` for multi-step operations:

```typescript
const tracingService = new OperationTracingService();

await tracingService.executeWithTracing('operation-name', 'entity-id', async (span) => {
  span.setAttribute('customAttribute', 'value');
  return result;
});

tracingService.logOperationStart('create', 'server-123', Region.SA_SAOPAULO_1);
tracingService.logOperationSuccess('create', 'server-123', Region.SA_SAOPAULO_1);
```

- Spans are ended automatically by `executeWithTracing`.
- Use span attributes to enrich tracing data with relevant context.

## Metrics

Use the OpenTelemetry metric system via the exported `meter`:

```typescript
const requestCounter = meter.createCounter('app.requests', {
  description: 'Count of requests',
});
requestCounter.add(1, { route: '/api/servers', status: 'success' });

const activeServersGauge = meter.createObservableGauge('app.active_servers', {
  description: 'Number of active servers',
});
activeServersGauge.addCallback((result) => {
  result.observe(getActiveServerCount(), { region: 'sa-saopaulo-1' });
});
```

- Give metrics descriptive names and appropriate attributes.
- Naming pattern: `<component>.<metric_name>`.

## Best Practices

- Keep metrics granular and focused on specific measurements.
- Keep logs structured consistently across the application.
- Use tracing for complex operations spanning multiple components.
- Always include relevant context (entity IDs, regions, etc.).
- Register custom metrics with the global meter.
- **Never log sensitive information** — auth tokens, passwords, or personal data.
- Ensure error states are properly logged and traced for debugging.