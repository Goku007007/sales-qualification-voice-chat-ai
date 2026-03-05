import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const globalForOTel = globalThis as unknown as {
  otelSdk?: NodeSDK;
  otelStarted?: boolean;
};

function parseHeaders(rawHeaders: string | undefined): Record<string, string> {
  if (!rawHeaders) return {};

  return rawHeaders
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) return acc;

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (key) acc[key] = value;
      return acc;
    }, {});
}

function createSpanProcessor() {
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (endpoint) {
    return new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: endpoint,
        headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
      }),
    );
  }

  // In development without an OTLP endpoint, skip exporting to avoid console spam.
  // Set OTEL_CONSOLE_EXPORT=true to force console output.
  if (process.env.OTEL_CONSOLE_EXPORT === 'true') {
    return new BatchSpanProcessor(new ConsoleSpanExporter());
  }
  return null;
}

function disableMetricsExporterWhenUnconfigured() {
  if (process.env.OTEL_METRICS_EXPORTER) return;

  const hasMetricsEndpoint = Boolean(
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  );

  if (!hasMetricsEndpoint) {
    process.env.OTEL_METRICS_EXPORTER = 'none';
  }
}

export function initOpenTelemetry() {
  if (globalForOTel.otelStarted) return globalForOTel.otelSdk ?? null;
  if (process.env.NEXT_RUNTIME === 'edge') return null;
  if (process.env.OTEL_ENABLED === 'false') return null;

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
  disableMetricsExporterWhenUnconfigured();

  const spanProcessor = createSpanProcessor();

  const sdk = new NodeSDK({
    autoDetectResources: true,
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME ?? 'sales-qualification-ai',
      'service.version': process.env.npm_package_version ?? '0.1.0',
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    }),
    spanProcessors: spanProcessor ? [spanProcessor] : [],
    instrumentations: [new HttpInstrumentation(), new FetchInstrumentation()],
  });

  sdk.start();
  globalForOTel.otelSdk = sdk;
  globalForOTel.otelStarted = true;

  return sdk;
}

export async function shutdownOpenTelemetry() {
  const sdk = globalForOTel.otelSdk;
  if (!sdk) return;

  await sdk.shutdown();
  globalForOTel.otelStarted = false;
  globalForOTel.otelSdk = undefined;
}
