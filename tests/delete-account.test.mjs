import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeleteAccountHandler } from '../api/delete-account.mjs';
const env = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'public-key',
  SUPABASE_SECRET_KEY: 'server-secret',
};
function fixture({
  authError = false,
  deleteError = false,
  networkError = false,
  config = env,
} = {}) {
  const calls = [];
  const handler = createDeleteAccountHandler(config, (_url, key, options) => {
    calls.push({ key, options });
    return {
      auth: {
        getUser: async (token) => {
          calls.push({ token });
          if (networkError) throw new Error('network');
          return authError
            ? { error: new Error('expired') }
            : { data: { user: { id: 'verified-owner' } } };
        },
        admin: {
          deleteUser: async (id, soft) => {
            calls.push({ deletedId: id, soft });
            return { error: deleteError ? new Error('foreign key failure') : null };
          },
        },
      },
    };
  });
  const invoke = async (overrides = {}) => {
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
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { confirmation: 'delete-my-account' },
        ...overrides,
      },
      res,
    );
    return res;
  };
  return { invoke, calls };
}
test('deletes only the authenticated account, ignoring a forged target ID', async () => {
  const { invoke, calls } = fixture();
  const res = await invoke({ body: { confirmation: 'delete-my-account', userId: 'someone-else' } });
  assert.equal(res.code, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(res.body, { deleted: true });
  assert.deepEqual(calls.at(-1), { deletedId: 'verified-owner', soft: false });
  assert.equal(calls[0].key, 'public-key');
  assert.equal(calls[2].key, 'server-secret');
  assert.equal(calls[2].options.auth.persistSession, false);
});
test('invalid methods, missing bearer, malformed JSON, and missing confirmation never delete', async () => {
  for (const [input, status] of [
    [{ method: 'GET' }, 405],
    [{ headers: {} }, 401],
    [{ body: '{' }, 400],
    [{ body: {} }, 400],
  ]) {
    const { invoke, calls } = fixture();
    assert.equal((await invoke(input)).code, status);
    assert.equal(calls.length, 0);
  }
});
test('expired sessions never construct an admin client', async () => {
  const { invoke, calls } = fixture({ authError: true });
  assert.equal((await invoke()).code, 401);
  assert.equal(
    calls.some((call) => call.key === 'server-secret'),
    false,
  );
});
test('missing secret fails closed', async () => {
  const { invoke, calls } = fixture({ config: { ...env, SUPABASE_SECRET_KEY: '' } });
  assert.equal((await invoke()).code, 503);
  assert.equal(calls.length, 0);
});
test('deletion and network failures do not report success or leak server errors', async () => {
  for (const options of [{ deleteError: true }, { networkError: true }]) {
    const { invoke } = fixture(options);
    const res = await invoke();
    assert.equal(res.code, 502);
    assert.equal(res.body.deleted, undefined);
    assert.ok(!JSON.stringify(res.body).includes('foreign key'));
  }
});
