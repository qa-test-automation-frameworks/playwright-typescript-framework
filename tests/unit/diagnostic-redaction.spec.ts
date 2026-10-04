import { APIRequestContext, APIResponse, expect, test } from '@playwright/test';
import { z } from 'zod';
import { INVALID_SPAN_CONTEXT, Span, trace, Tracer } from '@opentelemetry/api';
import { ApiError, BaseApiClient } from '../../src/api/BaseApiClient';
import { Logger } from '../../src/utils/logger';

const sentinel = 'SYNTHETIC_PRIVATE_DIAGNOSTIC_VALUE';

function clientWithResponse(body: string, status = 200): BaseApiClient {
  const response = {
    status: () => status,
    statusText: () => sentinel,
    text: () => Promise.resolve(body),
  } as unknown as APIResponse;
  const context = {
    fetch: () => Promise.resolve(response),
  } as unknown as APIRequestContext;
  return new BaseApiClient(context);
}

test('structured redaction handles nested arrays and key casing without mutating input', () => {
  const input = {
    jwtToken: sentinel,
    JWTToken: sentinel,
    nested: [{ Authorization: sentinel, PASSWORD: sentinel, visible: 'keep' }],
    cookie: sentinel,
  };
  expect(Logger.redact(input)).toEqual({
    jwtToken: '[REDACTED]',
    JWTToken: '[REDACTED]',
    nested: [{ Authorization: '[REDACTED]', PASSWORD: '[REDACTED]', visible: 'keep' }],
    cookie: '[REDACTED]',
  });
  expect(input.nested[0]?.PASSWORD).toBe(sentinel);
});

test('captured error output omits arbitrary exception messages and stacks', () => {
  let output = '';
  // eslint-disable-next-line @typescript-eslint/unbound-method -- Stored for restoration, never invoked unbound.
  const original = process.stderr.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    output += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    const error = new Error(sentinel);
    error.name = sentinel;
    Logger.error('request failed', error, { status: 401, jwtToken: sentinel });
  } finally {
    process.stderr.write = original;
  }
  expect(output).not.toContain(sentinel);
  expect(output).toContain('401');
  expect(output).toContain('request failed');
});

for (const body of [sentinel, JSON.stringify({ error: sentinel, jwtToken: sentinel })]) {
  test(`HTTP errors omit ${body.startsWith('{') ? 'JSON' : 'text'} bodies and query values`, async () => {
    const client = clientWithResponse(body, 401);
    const caught: unknown = await client
      .get(`http://127.0.0.1/api/policies?token=${sentinel}`, z.object({ id: z.string() }))
      .catch((error: unknown) => error);
    expect(caught).toBeInstanceOf(ApiError);
    const error = caught as ApiError;
    expect(error.status).toBe(401);
    expect(JSON.stringify(error)).not.toContain(sentinel);
    expect(error.message).toContain('/api/policies');
    expect(error.body).toContain('REDACTED');
  });
}

test('malformed success responses keep raw text out of exported errors', async () => {
  const client = clientWithResponse(sentinel);
  const caught: unknown = await client
    .get('http://127.0.0.1/api/policies', z.object({ id: z.string() }))
    .catch((error: unknown) => error);
  expect(caught).toBeInstanceOf(ApiError);
  expect(JSON.stringify(caught)).not.toContain(sentinel);
  expect((caught as ApiError).message).toContain('not valid JSON');
});

test('schema rejection does not expose values included by parser diagnostics', async () => {
  const client = clientWithResponse(JSON.stringify({ id: sentinel }));
  const caught: unknown = await client
    .get('http://127.0.0.1/api/policies', z.object({ id: z.literal('known-id') }))
    .catch((error: unknown) => error);
  expect(caught).toBeInstanceOf(ApiError);
  expect(JSON.stringify(caught)).not.toContain(sentinel);
  expect((caught as ApiError).message).toContain('Schema Validation failed');
});

test('valid response data remains available to the caller', async () => {
  const client = clientWithResponse(JSON.stringify({ id: 'known-id', token: sentinel }));
  expect(
    await client.get(
      'http://127.0.0.1/api/policies',
      z.object({ id: z.string(), token: z.string() }),
    ),
  ).toEqual({ id: 'known-id', token: sentinel });
});

test('transport exceptions cannot export secret text or URL credentials', async () => {
  const context = {
    fetch: () => Promise.reject(new Error(sentinel)),
  } as unknown as APIRequestContext;
  const client = new BaseApiClient(context);
  const caught: unknown = await client
    .get(`http://member:${sentinel}@127.0.0.1/api/policies?token=${sentinel}`, z.object({}))
    .catch((error: unknown) => error);
  expect(caught).toBeInstanceOf(ApiError);
  expect(JSON.stringify(caught)).not.toContain(sentinel);
  expect((caught as ApiError).message).toContain('transport failed');
});

test('validation diagnostics preserve known field names but omit values and arbitrary keys', async () => {
  const client = clientWithResponse(
    JSON.stringify({ errors: { email: [sentinel], [sentinel]: ['invalid'] } }),
    409,
  );
  const caught: unknown = await client
    .get('http://127.0.0.1/api/users', z.object({}))
    .catch((error: unknown) => error);
  expect(caught).toBeInstanceOf(ApiError);
  expect((caught as ApiError).body).toContain('validation fields: email');
  expect(JSON.stringify(caught)).not.toContain(sentinel);
});

test('response read errors are sanitized and retain the received HTTP status', async () => {
  const context = {
    fetch: () =>
      Promise.resolve({ status: () => 200, text: () => Promise.reject(new Error(sentinel)) }),
  } as unknown as APIRequestContext;
  const client = new BaseApiClient(context);
  const caught: unknown = await client
    .get('http://127.0.0.1/api/users', z.object({}))
    .catch((error: unknown) => error);
  expect(caught).toBeInstanceOf(ApiError);
  expect((caught as ApiError).status).toBe(200);
  expect((caught as ApiError).message).toContain('response read failed');
  expect(JSON.stringify(caught)).not.toContain(sentinel);
});

test('telemetry receives a sanitized transport exception before export', async () => {
  const recorded: unknown[] = [];
  const span: Span = trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
  span.recordException = (exception): void => {
    recorded.push(exception);
  };
  // eslint-disable-next-line @typescript-eslint/unbound-method -- Stored for restoration, never invoked unbound.
  const original = trace.getTracer;
  const priorEnabled = process.env.OTEL_ENABLED;
  trace.getTracer = (): Tracer =>
    ({
      startActiveSpan: (
        _name: string,
        _attributes: unknown,
        callback: (current: Span) => Promise<unknown>,
      ): Promise<unknown> => callback(span),
    }) as unknown as Tracer;
  process.env.OTEL_ENABLED = 'true';
  try {
    const context = {
      fetch: () => Promise.reject(new Error(sentinel)),
    } as unknown as APIRequestContext;
    const client = new BaseApiClient(context);
    await expect(
      client.get(`http://127.0.0.1/api/users?token=${sentinel}`, z.object({})),
    ).rejects.toThrow('transport failed');
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toBeInstanceOf(ApiError);
    const error = recorded[0] as ApiError;
    expect(`${error.message} ${error.stack}`).not.toContain(sentinel);
    expect(error.message).toContain('/api/users');
  } finally {
    trace.getTracer = original;
    if (priorEnabled === undefined) delete process.env.OTEL_ENABLED;
    else process.env.OTEL_ENABLED = priorEnabled;
  }
});

test('debug diagnostics omit request headers, payloads and response free text', async () => {
  let output = '';
  // eslint-disable-next-line @typescript-eslint/unbound-method -- Stored for restoration, never invoked unbound.
  const original = process.stdout.write;
  const priorDebug = process.env.DEBUG_API;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.env.DEBUG_API = 'true';
  try {
    const client = clientWithResponse(JSON.stringify({ id: 'known-id', description: sentinel }));
    await client.post(
      `http://127.0.0.1/api/users?token=${sentinel}`,
      z.object({ id: z.string() }),
      { description: sentinel },
      { headers: { 'x-custom-private': sentinel } },
    );
  } finally {
    process.stdout.write = original;
    if (priorDebug === undefined) delete process.env.DEBUG_API;
    else process.env.DEBUG_API = priorDebug;
  }
  expect(output).not.toContain(sentinel);
  expect(output).toContain('hasBody');
  expect(output).toContain('API Response: 200');
});

test('only exact known validation messages produce diagnostic codes', async () => {
  const known = clientWithResponse(
    JSON.stringify({ errors: { body: ['email or username already exists', sentinel] } }),
    409,
  );
  const changed = clientWithResponse(
    JSON.stringify({ errors: { body: [`email or username already exists ${sentinel}`] } }),
    409,
  );
  const first: unknown = await known
    .get('http://127.0.0.1/api/users', z.object({}))
    .catch((error: unknown) => error);
  const second: unknown = await changed
    .get('http://127.0.0.1/api/users', z.object({}))
    .catch((error: unknown) => error);
  expect((first as ApiError).body).toContain('email_or_username_conflict');
  expect((second as ApiError).body).not.toContain('email_or_username_conflict');
  expect(JSON.stringify([first, second])).not.toContain(sentinel);
});
