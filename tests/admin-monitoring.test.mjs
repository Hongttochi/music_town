import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createMonitoringHandler, summarizeLogs } from '../api/admin-monitoring.mjs';

const clock = Date.parse('2026-11-20T12:00:00Z');
const at = new Date(clock - 1000).toISOString();
async function fixture(t) {
  const state = { admin: true, authorized: true, logStatus: 200, roomStatus: 200, calls: [] };
  const server = createServer((req, res) => {
    state.calls.push({
      path: req.url,
      auth: req.headers.authorization,
      key: req.headers['x-api-key'],
    });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/auth/v1/user') {
      res.statusCode = state.authorized ? 200 : 401;
      res.end(JSON.stringify(state.authorized ? { id: 'admin-user' } : { message: 'expired' }));
    } else if (req.url === '/rest/v1/rpc/admin_whoami') {
      res.end(JSON.stringify({ admin: state.admin, userId: 'admin-user' }));
    } else if (req.url === '/logs') {
      res.statusCode = state.logStatus;
      res.end(
        JSON.stringify({
          result: [
            {
              at,
              event: 'voice_failed',
              code: 'permission_denied',
              operation: 'voice_connect',
              channel: 1,
              secret: 'PRIVATE',
            },
            { at, event: 'login_success', session_id: 'PRIVATE' },
            { at, event: 'login_failed', code: 'network' },
            { at, event: 'private@email.example' },
          ],
        }),
      );
    } else if (req.url === '/twirp/livekit.RoomService/ListRooms') {
      res.statusCode = state.roomStatus;
      res.end(
        JSON.stringify(
          state.roomStatus === 200
            ? {
                rooms: [
                  {
                    name: `town-performance-${'a'.repeat(32)}`,
                    numParticipants: 4,
                    numPublishers: 1,
                  },
                  { name: 'unrelated-private-room', numParticipants: 9, numPublishers: 2 },
                ],
              }
            : { code: 'internal', msg: 'PRIVATE' },
        ),
      );
    } else {
      res.statusCode = 404;
      res.end('{}');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    return new Promise((r) => server.close(r));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const env = {
    SUPABASE_URL: origin,
    SUPABASE_PUBLISHABLE_KEY: 'public-key',
    LOGFLARE_QUERY_ENDPOINT: 'admin.events',
    LOGFLARE_QUERY_API_KEY: 'query-secret',
    LIVEKIT_URL: origin,
    LIVEKIT_API_KEY: 'test-key',
    LIVEKIT_API_SECRET: 'test-secret-at-least-32-characters',
  };
  const deps = {
    now: () => clock,
    request: (url, options) =>
      fetch(String(url).startsWith('https://api.logflare.app/') ? `${origin}/logs` : url, options),
  };
  return { state, env, deps, handler: createMonitoringHandler(env, deps) };
}
async function invoke(handler, authorization = 'Bearer fake-user-token', method = 'GET') {
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await handler({ method, headers: { authorization } }, res);
  return res;
}

test('real SDK requests return sanitized logs and only town room aggregates', async (t) => {
  const { handler, state } = await fixture(t);
  const result = await invoke(handler);
  assert.equal(result.code, 200);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.body.logs.logs.length, 2);
  assert.equal(result.body.logs.loginOk, 1);
  assert.equal(result.body.logs.loginFail, 1);
  assert.equal(result.body.logs.micDenied, 1);
  assert.deepEqual(result.body.voice, { status: 'ok', rooms: 1, participants: 4, publishers: 1 });
  assert.doesNotMatch(
    JSON.stringify(result.body),
    /PRIVATE|private@|query-secret|town-performance/,
  );
  assert.equal(
    state.calls.find((c) => c.path.includes('admin_whoami')).auth,
    'Bearer fake-user-token',
  );
  assert.equal(state.calls.find((c) => c.path === '/logs').key, 'query-secret');
  assert.match(state.calls.find((c) => c.path.includes('ListRooms')).auth, /^Bearer /);
  state.admin = false;
  assert.equal((await invoke(handler)).code, 403);
  assert.equal(state.calls.filter((c) => c.path === '/logs').length, 1);
});

test('unauthenticated and non-admin requests never query providers', async (t) => {
  const { handler, state } = await fixture(t);
  assert.equal((await invoke(handler, '')).code, 401);
  assert.equal((await invoke(handler, '', 'POST')).code, 405);
  state.authorized = false;
  assert.equal((await invoke(handler)).code, 401);
  assert.ok(state.calls.every((c) => c.path === '/auth/v1/user'));
});

test('one provider failing does not hide the other or pretend failure is zero', async (t) => {
  const { handler, state, env, deps } = await fixture(t);
  state.logStatus = 403;
  const result = await invoke(handler);
  assert.equal(result.body.logs.status, 'error');
  assert.equal(result.body.voice.status, 'ok');
  state.logStatus = 200;
  state.roomStatus = 503;
  const voiceFailure = await invoke(createMonitoringHandler(env, deps));
  assert.equal(voiceFailure.body.logs.status, 'ok');
  assert.equal(voiceFailure.body.voice.status, 'error');
  assert.equal(voiceFailure.body.voice.rooms, undefined);
});

test('missing provider configuration is explicit and needs no external requests', async (t) => {
  const { env, deps, state } = await fixture(t);
  const result = await invoke(
    createMonitoringHandler(
      { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: 'public-key' },
      deps,
    ),
  );
  assert.equal(result.body.logs.status, 'not_configured');
  assert.equal(result.body.voice.status, 'not_configured');
  assert.equal(state.calls.length, 2);
});

test('log summaries bound time, fields and counts and reject malformed payloads', () => {
  assert.throws(() => summarizeLogs({}, clock));
  assert.throws(() => summarizeLogs([{ event: 'raw message' }], clock));
  const rows = Array.from({ length: 1001 }, () => ({
    at,
    event: 'api_failed',
    code: 'network',
    operation: 'secret',
  }));
  const result = summarizeLogs(rows, clock);
  assert.equal(result.sampled, true);
  assert.equal(result.sampleSize, 1000);
  assert.equal(result.logs.length, 50);
  assert.equal(result.logs[0].operation, null);
  assert.equal(summarizeLogs([], clock).logs.length, 0);
});
