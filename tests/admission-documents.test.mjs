import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CONSENT_VERSION, CONSENT_DOCUMENTS } from '../server/admission-policy.mjs';
test('consent evidence identifies immutable document snapshots and the DB enforcement version', async () => {
  for (const { url, sha256 } of Object.values(CONSENT_DOCUMENTS)) {
    assert.ok(url.startsWith('/consent/' + CONSENT_VERSION + '/'));
    const content = await readFile(new URL('../public' + url, import.meta.url));
    assert.equal(createHash('sha256').update(content).digest('hex'), sha256);
  }
  const migration = await readFile(
    new URL('../supabase/migrations/202611060001_guardian_consent.sql', import.meta.url),
    'utf8',
  );
  assert.ok(migration.includes("a.consent_version='" + CONSENT_VERSION + "'"));
});
