import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogsHandler, sanitizeEvent } from '../api/logs.mjs';
import ts from 'typescript';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const id = '11111111-1111-4111-8111-111111111111';
const at = Date.now();
const event = { event: 'runtime_error', sessionId: id, at, code: 'type_error' };
const env = {
  LOGFLARE_API_KEY: 'secret',
  LOGFLARE_SOURCE_ID: id,
  LOG_ALLOWED_ORIGINS: 'https://town.example',
  VERCEL_GIT_COMMIT_SHA: 'abc123',
};
function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(s) {
      this.statusCode = s;
      return this;
    },
    end() {},
  };
}
function request(events = [event]) {
  return {
    method: 'POST',
    headers: { origin: 'https://town.example', 'content-type': 'application/json' },
    body: { events },
  };
}

test('allowlist removes private fields and arbitrary error text', () => {
  const safe = sanitizeEvent(
    {
      ...event,
      message: 'token-secret',
      stack: 'email@example.com',
      metadata: { password: 'password' },
      code: 'token-secret',
      operation: 'arbitrary',
      userId: id,
      url: '/?token=secret',
    },
    at,
  );
  assert.equal(safe.message, 'runtime_error');
  assert.equal(safe.metadata.code, undefined);
  assert.doesNotMatch(JSON.stringify(safe), /token-secret|password|email@|userId|url|arbitrary/);
  assert.equal(sanitizeEvent({ ...event, event: 'arbitrary' }, at), null);
  assert.equal(sanitizeEvent({ ...event, at: at - 86400001 }, at), null);
});
test('forwards only sanitized batch to Logflare with server credentials', async () => {
  const calls = [];
  const handler = createLogsHandler(
    env,
    async (...args) => {
      calls.push(args);
      return { ok: true };
    },
    () => at,
  );
  const res = response();
  await handler(request(), res);
  assert.equal(res.statusCode, 204);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], `https://api.logflare.app/api/logs?source=${id}`);
  assert.equal(calls[0][1].headers['X-API-KEY'], 'secret');
  const payload = JSON.parse(calls[0][1].body);
  assert.equal(payload.batch[0].metadata.release, 'abc123');
  assert.equal(payload.batch[0].metadata.session_id, id);
});
test('rejects origin, content type, malformed/oversized batches and missing config', async () => {
  let calls = 0;
  const handler = createLogsHandler(
    env,
    async () => {
      calls++;
      return { ok: true };
    },
    () => at,
  );
  for (const [req, status] of [
    [{ ...request(), method: 'GET' }, 405],
    [{ ...request(), headers: { ...request().headers, origin: 'https://evil.example' } }, 403],
    [{ ...request(), headers: { ...request().headers, 'content-type': 'text/plain' } }, 415],
    [{ ...request(), body: '{' }, 400],
    [request([]), 400],
    [request(Array(21).fill(event)), 400],
    [request([{ ...event, sessionId: 'bad' }]), 400],
    [{ ...request(), body: ' '.repeat(16385) }, 413],
  ]) {
    const res = response();
    await handler(req, res);
    assert.equal(res.statusCode, status);
  }
  assert.equal(calls, 0);
  const res = response();
  await createLogsHandler({ ...env, LOGFLARE_API_KEY: '' })(request(), res);
  assert.equal(res.statusCode, 503);
});
test('upstream failures are contained and instance budget recovers next minute', async () => {
  let time = at;
  let calls = 0;
  const handler = createLogsHandler(
    env,
    async () => {
      calls++;
      return { ok: false };
    },
    () => time,
  );
  for (let i = 0; i < 30; i++) {
    const res = response();
    await handler(request(Array(20).fill(event)), res);
    assert.equal(res.statusCode, 502);
  }
  const limited = response();
  await handler(request(), limited);
  assert.equal(limited.statusCode, 429);
  assert.equal(calls, 30);
  time += 60001;
  const recovered = response();
  await handler(request(), recovered);
  assert.equal(recovered.statusCode, 502);
  const failed = response();
  await createLogsHandler(
    env,
    async () => {
      throw Error('private upstream failure');
    },
    () => at,
  )(request(), failed);
  assert.equal(failed.statusCode, 502);
});
test('browser batches, deduplicates, limits noise and never sends raw errors', async () => {
  const source = readFileSync(new URL('../src/services/telemetry.ts', import.meta.url), 'utf8').replace(
    'import.meta.env.VITE_LOGGING_ENABLED',
    "'true'",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const calls = [];
  const listeners = {};
  const context = {
    exports: {},
    Date,
    Map,
    JSON,
    Error,
    TypeError,
    RangeError,
    DOMException,
    AbortSignal,
    crypto: { randomUUID: () => id },
    setTimeout: () => 1,
    fetch: async (...args) => {
      calls.push(args);
      throw Error('offline');
    },
    window: {
      addEventListener: (key, fn) => {
        listeners[key] = fn;
      },
    },
    document: { hidden: false, addEventListener: () => {} },
  };
  vm.runInNewContext(js, context);
  const { logEvent, flushLogs, startTelemetry } = context.exports;
  startTelemetry();
  startTelemetry();
  listeners.error({ error: new TypeError('token=SECRET email@example.com'), lineno: 12, colno: 3 });
  logEvent('channel_enter', { channel: 1 });
  logEvent('channel_enter', { channel: 1 });
  await flushLogs();
  assert.equal(calls.length, 1);
  let payload = JSON.parse(calls[0][1].body);
  assert.equal(payload.events.length, 2);
  assert.equal(payload.events[0].code, 'type_error');
  assert.doesNotMatch(calls[0][1].body, /SECRET|email@/);
  for (let i = 0; i < 100; i++) logEvent('api_failed', { status: i });
  await flushLogs();
  assert.equal(JSON.parse(calls[1][1].body).events.length, 20);
  await flushLogs();
  assert.equal(calls.length, 2);
});
