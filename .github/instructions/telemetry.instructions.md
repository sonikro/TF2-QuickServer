---
applyTo: "src/**/*.ts"
---

# Copilot Instructions for Telemetry

## OpenTelemetry Integration

- Use the OpenTelemetry SDK for all telemetry concerns (metrics, logs, and traces).
- Do not implement custom telemetry solutions or third-party integrations outside of OpenTelemetry.

## Logging

- Import and use the exported `logger` from `src/telemetry/otel.ts` for all logging needs:
  ```typescript
  import { logger } from '../telemetry/otel';
  
  // Example usage:
  logger.emit({
    severityText: "INFO",
    body: "Operation completed",
    attributes: {
      entityId: "entity-123",
      region: "us-east-1"
    }
  });
  ```
- Use appropriate severity levels: "INFO", "WARN", "ERROR", "DEBUG".
- Include relevant context in the attributes object.
- Structure log messages consistently with operation and entity information.

## Tracing

- For operation tracing, use the `OperationTracingService`:
  ```typescript
  import { OperationTracingService } from '../telemetry/OperationTracingService';
  
  const tracingService = new OperationTracingService();
  
  // Execute with tracing
  await tracingService.executeWithTracing(
    "operation-name",
    "entity-id",
    async (span) => {
      // Add custom attributes to span if needed
      span.setAttribute("customAttribute", "value");
      
      // Your operation logic here
      return result;
    }
  );
  
  // Log operation lifecycle events
  tracingService.logOperationStart("create", "server-123", Region.US_EAST_1);
  tracingService.logOperationSuccess("create", "server-123", Region.US_EAST_1);
  ```
- Ensure spans are properly ended (handled automatically by `executeWithTracing`).
- Use span attributes to enrich tracing data with relevant context.

## Metrics

- Use the OpenTelemetry metric system for all application metrics:
  ```typescript
  import { meter } from '../telemetry/otel';
  
  // Create and use counters
  const requestCounter = meter.createCounter('app.requests', {
    description: 'Count of requests'
  });
  requestCounter.add(1, { route: '/api/servers', status: 'success' });
  
  // Create and use gauges
  const activeServersGauge = meter.createObservableGauge('app.active_servers', {
    description: 'Number of active servers'
  });
  activeServersGauge.addCallback((result) => {
    result.observe(getActiveServerCount(), { region: 'us-east-1' });
  });
  ```
- Ensure all metrics have descriptive names and appropriate attributes.
- Follow the naming pattern: `<component>.<metric_name>`.

## Best Practices

- Keep metrics granular and focused on specific measurements.
- Structure logs consistently across the application.
- Use tracing for complex operations that span multiple components.
- Always include relevant context (entity IDs, regions, etc.) in telemetry data.
- When creating custom metrics, ensure they are registered with the global meter.
- Never log sensitive information like authentication tokens or personal data.
- Ensure error states are properly logged and traced for debugging.
