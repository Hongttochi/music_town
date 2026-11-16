import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminRoleHandler } from '../api/admin-role.mjs';

const env = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'public-key',
  ADMIN_EMAILS: ' Admin@Example.com , owner@example.com ',
};
const verified = { id: 'account', email: 'admin@example.com', email_confirmed_at: '2026-11-01' };

async function invoke({
  user = verified,
  config = env,
  authError = false,
  throws = false,
  request = {},
} = {}) {
  const tokens = [];
  const handler = createAdminRoleHandler(config, (_url, key, options) => {
    assert.equal(key, 'public-key');
    assert.equal(options.auth.persistSession, false);
    return {
      auth: {
        getUser: async (token) => {
          tokens.push(token);
          if (throws) throw new Error('private upstream error');
          return { data: { user }, error: authError ? new Error('expired') : null };
        },
      },
    };
  });
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
  await handler(
    { method: 'GET', headers: { authorization: 'Bearer verified-token' }, ...request },
    res,
  );
  return { ...res, tokens };
}

test('verified allowlisted email grants access without exposing the list', async () => {
  const result = await invoke();
  assert.equal(result.code, 200);
  assert.deepEqual(result.body, { isAdmin: true });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.deepEqual(result.tokens, ['verified-token']);
});

test('email matching is exact and ignores forged request or metadata roles', async () => {
  for (const email of ['stranger@example.com', 'admin@example.com.evil', undefined]) {
    const result = await invoke({
      user: {
        ...verified,
        email,
        app_metadata: { app_role: 'admin' },
        user_metadata: { email: verified.email },
      },
      request: { query: { email: verified.email }, body: { email: verified.email, isAdmin: true } },
    });
    assert.deepEqual(result.body, { isAdmin: false });
  }
});

test('empty configuration and unverified emails never grant access', async () => {
  assert.deepEqual((await invoke({ config: { ...env, ADMIN_EMAILS: '' } })).body, {
    isAdmin: false,
  });
  assert.deepEqual((await invoke({ user: { ...verified, email_confirmed_at: null } })).body, {
    isAdmin: false,
  });
});

test('invalid tokens and requests fail closed', async () => {
  for (const [request, expected] of [
    [{ method: 'POST' }, 405],
    [{ headers: {} }, 401],
    [{ headers: { authorization: 'Bearer ' } }, 401],
  ]) {
    const result = await invoke({ request });
    assert.equal(result.code, expected);
    assert.equal(result.tokens.length, 0);
  }
  assert.equal((await invoke({ authError: true })).code, 401);
  assert.equal((await invoke({ user: null })).code, 401);
  assert.equal((await invoke({ config: { ADMIN_EMAILS: env.ADMIN_EMAILS } })).code, 503);
  const failure = await invoke({ throws: true });
  assert.equal(failure.code, 502);
  assert.doesNotMatch(JSON.stringify(failure.body), /private upstream/);
});
