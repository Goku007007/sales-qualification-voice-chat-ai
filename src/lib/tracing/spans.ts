import { context, trace, SpanStatusCode, type Attributes, type Span } from '@opentelemetry/api';

const TRACER_NAME = 'sales-qualification-ai';
const TRACER_VERSION = '1.0.0';

export function getTracer(namespace?: string) {
  return trace.getTracer(namespace ? `${TRACER_NAME}/${namespace}` : TRACER_NAME, TRACER_VERSION);
}

export function startSpan(name: string, attributes: Attributes = {}, namespace?: string): Span {
  return getTracer(namespace).startSpan(name, { attributes });
}

export function annotateSpan(span: Span, attributes: Attributes) {
  span.setAttributes(attributes);
}

export function recordSpanError(span: Span, error: unknown) {
  if (error instanceof Error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    return;
  }

  span.recordException({ name: 'UnknownError', message: String(error) });
  span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
}

export async function withSpan<T>(
  name: string,
  operation: (span: Span) => Promise<T> | T,
  options?: {
    attributes?: Attributes;
    namespace?: string;
  },
): Promise<T> {
  const span = startSpan(name, options?.attributes ?? {}, options?.namespace);
  const activeContext = trace.setSpan(context.active(), span);

  try {
    const result = await context.with(activeContext, () => operation(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    recordSpanError(span, error);
    throw error;
  } finally {
    span.end();
  }
}

export async function withSessionSpan<T>(
  sessionId: string,
  spanName: string,
  operation: (span: Span) => Promise<T> | T,
  attributes: Attributes = {},
): Promise<T> {
  return withSpan(spanName, operation, {
    namespace: 'session',
    attributes: {
      session_id: sessionId,
      ...attributes,
    },
  });
}
