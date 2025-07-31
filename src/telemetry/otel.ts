import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace, metrics } from '@opentelemetry/api';


diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const resource = resourceFromAttributes({
  'service.name': 'tf2-quickserver',
  'service.environment': process.env.ENVIRONMENT || 'local',
})


const loggerProvider = new LoggerProvider({
  resource,
  processors: [
    new SimpleLogRecordProcessor(new OTLPLogExporter()),
    new SimpleLogRecordProcessor({
      export(logs){
        logs.forEach(log => {
          console.log(`[${log.severityText}] ${log.body}`, log.attributes);
        })
      },
      async shutdown() {
        console.log('[otel] Logger shutdown complete.');
      },
    })
  ]
});

export const logger = loggerProvider.getLogger('tf2-quickserver-logger');

console.log('[otel] Logger initialized.');

console.log('[otel] Initializing OpenTelemetry SDK...');
const traceExporter = new OTLPTraceExporter();
const metricExporter = new OTLPMetricExporter();
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
});

const sdk = new NodeSDK({
  traceExporter,
  metricReader,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'tf2-quickserver',
  resource
});

try {
  sdk.start();
  console.log('[otel] OpenTelemetry SDK started successfully.');
} catch (err: unknown) {
  console.error('[otel] Error starting OpenTelemetry SDK:', err);
}

export const tracer = trace.getTracer('tf2-quickserver');
export const meter = metrics.getMeter('tf2-quickserver');
