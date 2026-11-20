import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function authModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const calls = [];
  const oauth = [];
  const env = {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
  };
  const js = ts.transpileModule(source.replaceAll('import.meta.env', 'testEnv'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    testEnv: env,
    URL,
    window: { location: { origin: 'https://town.example' } },
    require: () => ({
      createClient: (...args) => {
        calls.push(args);
        return {
          auth: {
            signInWithOAuth: async (args) => {
              oauth.push(args);
              return { error: null };
            },
          },
        };
      },
    }),
  });
  return { exports, calls, oauth };
}

test('admin and town use independent session and OAuth callback namespaces', async () => {
  const admin = await authModule('../src/admin/services/adminAuth.ts');
  const town = await authModule('../src/services/auth.ts');
  const adminOptions = admin.calls[0][2].auth;
  const townOptions = town.calls[0][2].auth;
  assert.ok(adminOptions.storageKey.startsWith('music-town-admin-'));
  assert.notEqual(adminOptions.storageKey, townOptions.storageKey);
  assert.equal(adminOptions.flowType, 'pkce');
  await admin.exports.signIn('google');
  await town.exports.signIn('google');
  assert.equal(admin.oauth[0].options.redirectTo, 'https://town.example/admin/');
  assert.equal(town.oauth[0].options.redirectTo, 'https://town.example/');
});

test('all logout paths terminate only the current session', async () => {
  for (const path of [
    '../src/admin/components/auth/AdminGate.tsx',
    '../src/admin/components/layout/AdminSidebar.tsx',
    '../src/admin/components/layout/AdminTopbar.tsx',
    '../src/pages/LoginPage.tsx',
  ]) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    const calls = source.match(/\.auth\.signOut\([^)]*\)/g);
    assert.ok(calls?.length, path);
    for (const call of calls) assert.match(call, /scope: 'local'/, path);
    if (path.includes('/admin/')) {
      assert.doesNotMatch(source, /from ['"].*\/services\/auth['"]/);
      assert.match(source, /services\/adminAuth/);
    }
  }
  const repository = await readFile(
    new URL('../src/admin/services/adminRepository.ts', import.meta.url),
    'utf8',
  );
  assert.match(repository, /from '\.\/adminAuth'/);
});
