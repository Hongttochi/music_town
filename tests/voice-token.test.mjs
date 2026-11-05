import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { TokenVerifier } from 'livekit-server-sdk';
import { createVoiceHandler, voiceGrant } from '../api/voice-token.mjs';

const performer = 'performer';
const listener = 'listener';
const client = '11111111-1111-4111-8111-111111111111';
const snapshot = () => ({
  channel: 1,
  participants: [
    { id: performer, role: 'musician' },
    { id: listener, role: 'listener' },
  ],
  performances: [
    {
      channel_id: 1,
      stage_id: 2,
      user_id: performer,
      ends_at: new Date(Date.now() + 120000).toISOString(),
    },
  ],
});

test('room grants reject outsiders, wrong channels, expired slots, and non-musician publishers', () => {
  const state = snapshot();
  assert.equal(voiceGrant(state, 'outsider', 1, 2), null);
  assert.equal(voiceGrant(state, listener, 2, 2), null);
  assert.equal(voiceGrant(state, listener, 1, 3), null);
  assert.equal(voiceGrant(state, listener, 1, 2, Date.now() + 180000), null);
  state.participants[0].role = 'listener';
  assert.equal(voiceGrant(state, performer, 1, 2), null);
});

test('each performance gets an isolated room; listeners cannot publish', () => {
  const state = snapshot();
  const first = voiceGrant(state, performer, 1, 2);
  const audience = voiceGrant(state, listener, 1, 2);
  assert.equal(first.canPublish, true);
  assert.equal(audience.canPublish, false);
  assert.equal(first.room, audience.room);
  state.performances[0].ends_at = new Date(Date.now() + 240000).toISOString();
  assert.notEqual(voiceGrant(state, performer, 1, 2).room, first.room);
});

test('HTTP endpoint validates identity and issues signed least-privilege tokens', async (t) => {
  const calls = [];
  const state = snapshot();
  const mock = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    calls.push({
      path: req.url,
      body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null,
    });
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization === 'Bearer invalid') {
      res.writeHead(401);
      res.end('{}');
      return;
    }
    if (req.url === '/auth/v1/user') {
      res.end(
        JSON.stringify({
          id: req.headers.authorization === 'Bearer performer-token' ? performer : listener,
        }),
      );
    } else if (req.url === '/rest/v1/rpc/town_action') {
      res.end(JSON.stringify(state));
    } else {
      res.writeHead(404);
      res.end('{}');
    }
  });
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    mock.closeAllConnections();
    mock.close();
  });
  const env = {
    LIVEKIT_URL: 'wss://test.invalid',
    LIVEKIT_API_KEY: 'test-api-key',
    LIVEKIT_API_SECRET: 'test-secret-at-least-thirty-two-characters',
    VITE_SUPABASE_URL: `http://127.0.0.1:${mock.address().port}`,
    VITE_SUPABASE_PUBLISHABLE_KEY: 'test-public-key',
  };
  const handler = createVoiceHandler(env);
  const invoke = async (
    authorization,
    body = { channel: 1, stage: 2, client },
    method = 'POST',
    selectedHandler = handler,
  ) => {
    const response = {
      headers: {},
      code: 0,
      body: null,
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status(code) {
        this.code = code;
        return this;
      },
      json(value) {
        this.body = value;
        return this;
      },
    };
    await selectedHandler({ method, headers: { authorization }, body }, response);
    return response;
  };
  const verifier = new TokenVerifier(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  await t.test(
    'listener receives subscribe-only token even with forged publisher fields',
    async () => {
      const result = await invoke('Bearer listener-token', {
        channel: 1,
        stage: 2,
        client,
        canPublish: true,
        userId: performer,
      });
      assert.equal(result.code, 200);
      assert.equal(result.headers['Cache-Control'], 'no-store');
      const claims = await verifier.verify(result.body.token);
      assert.equal(claims.sub, listener);
      assert.equal(claims.video.canPublish, false);
      assert.equal(claims.video.canSubscribe, true);
      assert.equal(claims.video.canPublishData, false);
      assert.ok(claims.exp <= Math.floor(Date.now() / 1000) + 61);
      const rpc = calls.find((call) => call.path.includes('/rpc/'));
      assert.equal(rpc.body.action, 'snapshot');
      assert.equal(rpc.body.client, client);
    },
  );
  await t.test('performer token permits microphone only and no self-subscription', async () => {
    const result = await invoke('Bearer performer-token');
    const claims = await verifier.verify(result.body.token);
    assert.equal(claims.sub, performer);
    assert.equal(claims.video.canPublish, true);
    assert.deepEqual(claims.video.canPublishSources, ['microphone']);
    assert.equal(claims.video.canSubscribe, false);
  });
  await t.test('missing or invalid login is rejected', async () => {
    assert.equal((await invoke(undefined)).code, 401);
    assert.equal((await invoke('Bearer invalid')).code, 401);
  });
  await t.test(
    'pasted environment whitespace does not change token signing credentials',
    async () => {
      const paddedEnv = Object.fromEntries(
        Object.entries(env).map(([key, value]) => [key, ` \t${value}\r\n`]),
      );
      const result = await invoke(
        'Bearer performer-token',
        undefined,
        'POST',
        createVoiceHandler(paddedEnv),
      );
      assert.equal(result.code, 200);
      assert.equal(result.body.url, env.LIVEKIT_URL);
      const claims = await verifier.verify(result.body.token);
      assert.equal(claims.iss, env.LIVEKIT_API_KEY);
      assert.equal(claims.sub, performer);
    },
  );
  await t.test('malformed input and wrong method are rejected', async () => {
    assert.equal((await invoke('Bearer listener-token', '{')).code, 400);
    assert.equal(
      (await invoke('Bearer listener-token', { channel: 1, stage: 2, client: 'bad' })).code,
      400,
    );
    assert.equal((await invoke('Bearer listener-token', undefined, 'GET')).code, 405);
  });
  await t.test('cross-channel access is rejected', async () => {
    assert.equal(
      (await invoke('Bearer listener-token', { channel: 3, stage: 2, client })).code,
      403,
    );
  });
  await t.test('missing credentials fail closed with setup status', async () => {
    const result = await invoke('Bearer listener-token', undefined, 'POST', createVoiceHandler({}));
    assert.equal(result.code, 503);
    assert.equal(result.body.token, undefined);
  });
  await t.test('upstream network failure issues no token', async () => {
    const result = await invoke(
      'Bearer listener-token',
      undefined,
      'POST',
      createVoiceHandler({ ...env, VITE_SUPABASE_URL: 'http://127.0.0.1:1' }),
    );
    assert.equal(result.code, 502);
    assert.equal(result.body.token, undefined);
  });
});
