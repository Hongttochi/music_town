import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAdmissionHandler } from '../api/admission.mjs';
import {
  ageOnKoreanDate,
  validateGuardianResult,
  CONSENT_VERSION,
} from '../server/admission-policy.mjs';
const current = new Date('2026-11-06T03:00:00Z');
const origin = 'https://music.example';
const env = {
  GUARDIAN_CONSENT_ENABLED: 'true',
  APP_ORIGIN: origin,
  SUPABASE_URL: 'https://db.example',
  SUPABASE_SECRET_KEY: 'server-secret',
  ADMISSION_HASH_SECRET: 'a'.repeat(40),
  PORTONE_STORE_ID: 'store',
  PORTONE_CHANNEL_KEY: 'channel',
  PORTONE_API_SECRET: 'provider-secret',
};
const digest = (v) => createHash('sha256').update(v).digest('hex');
function setup() {
  const records = [],
    members = [],
    calls = [];
  let providerCalls = 0;
  let verified;
  const db = {
    auth: {
      getUser: async (token) =>
        token === 'valid' ? { data: { user: { id: 'owner' } } } : { error: new Error('invalid') },
    },
    from(table) {
      const filters = [];
      let patch;
      const rows = table === 'member_admissions' ? members : records;
      return {
        select() {
          return this;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return this;
        },
        gt(k, v) {
          filters.push((r) => r[k] > v);
          return this;
        },
        update(v) {
          patch = v;
          return this;
        },
        async maybeSingle() {
          const r = rows.find((r) => filters.every((f) => f(r)));
          if (r && patch) Object.assign(r, patch);
          return { data: r ? { ...r } : null };
        },
      };
    },
    async rpc(name, p) {
      calls.push({ name, p });
      if (name === 'reserve_service_admission') {
        records.push({
          id: p.p_id,
          token_hash: p.p_token_hash,
          age_group: p.p_age_group,
          status: p.p_age_group === '14plus' ? 'approved' : 'pending',
          consent_version: p.p_version,
          consent_text_hash: p.p_text_hash,
          verification_id: p.p_verification_id,
          expires_at: new Date(current.getTime() + 3600000).toISOString(),
          created_at: current.toISOString(),
          user_id: p.p_user_id,
        });
        return { data: null };
      }
      return { data: true };
    },
  };
  const handler = createAdmissionHandler(env, {
    makeClient: () => db,
    now: () => current,
    fetch: async (url, options) => {
      providerCalls++;
      assert.ok(url.startsWith('https://api.portone.io/identity-verifications/mt-guardian-'));
      assert.equal(options.headers.Authorization, 'PortOne provider-secret');
      return { ok: true, json: async () => verified };
    },
  });
  const call = async (body, options = {}) => {
    const req = {
      method: 'POST',
      headers: { origin, ...options.headers },
      body: { version: CONSENT_VERSION, ...body },
    };
    const res = {
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      status(n) {
        this.statusCode = n;
        return this;
      },
      json(v) {
        this.body = v;
        return this;
      },
    };
    await handler(req, res);
    return res;
  };
  return {
    records,
    members,
    calls,
    call,
    setVerified(v) {
      verified = v;
    },
    get providerCalls() {
      return providerCalls;
    },
  };
}
const permission = {
  isLegalGuardian: true,
  acceptedPrivacy: true,
  acceptedTerms: true,
  relationship: 'parent',
};
async function child(s) {
  const start = await s.call({ action: 'start', birthDate: '2015-01-01', acceptedTerms: true });
  assert.equal(start.statusCode, 200);
  return start.headers['Set-Cookie'].split(';')[0];
}
function result(r) {
  return {
    status: 'VERIFIED',
    id: r.verification_id,
    channel: { key: 'channel', type: 'LIVE' },
    verifiedAt: current.toISOString(),
    verifiedCustomer: {
      name: 'Guardian',
      phoneNumber: '01012345678',
      birthDate: '1985-03-04',
      ci: 'must-not-be-saved',
    },
  };
}

test('age calculation uses Korea date, exact birthdays, leap days and rejects invalid/future dates', () => {
  assert.equal(ageOnKoreanDate('2012-11-06', current), 14);
  assert.equal(ageOnKoreanDate('2012-11-07', current), 13);
  assert.equal(ageOnKoreanDate('2012-11-07', new Date('2026-11-06T15:00:00Z')), 14);
  for (const v of ['2012-02-30', '2028-01-01', '2012-2-3', '', null])
    assert.equal(ageOnKoreanDate(v, current), null);
  assert.equal(ageOnKoreanDate('2012-02-29', current), 14);
});
test('under14 stays pending; a cookie contains an opaque secret and no birth date is stored', async () => {
  const s = setup(),
    cookie = await child(s);
  assert.match(cookie, /^__Host-mt-admission=[a-f0-9]{64}$/);
  assert.equal(s.records[0].status, 'pending');
  assert.ok(!JSON.stringify(s.records).includes('2015-01-01'));
  const status = await s.call({ action: 'status' }, { headers: { cookie } });
  assert.equal(status.body.approved, false);
  assert.equal(s.providerCalls, 0);
  const forged = await s.call(
    { action: 'confirmGuardian', verified: true, identityVerificationId: 'attacker' },
    { headers: { cookie } },
  );
  assert.equal(forged.statusCode, 403);
  assert.equal(s.providerCalls, 0);
});
test('only server-fetched adult LIVE results approve, and DOB/CI/phone raw values are not saved or returned', async () => {
  const s = setup(),
    cookie = await child(s);
  const started = await s.call({ action: 'beginGuardian', ...permission }, { headers: { cookie } });
  assert.equal(started.statusCode, 200);
  assert.equal(started.body.redirectUrl, origin + '/?guardianCallback=1');
  s.setVerified(result(s.records[0]));
  const response = await s.call(
    { action: 'confirmGuardian', verified: false },
    { headers: { cookie } },
  );
  assert.equal(response.statusCode, 200);
  assert.equal(s.records[0].status, 'approved');
  assert.equal(s.providerCalls, 1);
  const stored = JSON.stringify(s.records);
  for (const value of ['1985-03-04', '01012345678', 'must-not-be-saved'])
    assert.ok(!stored.includes(value));
  assert.equal(s.records[0].guardian_name, 'Guardian');
  assert.equal(s.records[0].guardian_identity_hash.length, 64);
  const again = await s.call({ action: 'confirmGuardian' }, { headers: { cookie } });
  assert.equal(again.statusCode, 200);
  assert.equal(s.providerCalls, 1);
  const claimed = await s.call(
    { action: 'status', userId: 'forged' },
    { headers: { cookie, authorization: 'Bearer valid' } },
  );
  assert.equal(claimed.body.admitted, true);
  assert.equal(s.calls.at(-1).p.p_user_id, 'owner');
});
test('minor, sandbox, wrong channel/transaction, stale and future provider results all fail closed', async () => {
  const s = setup(),
    cookie = await child(s);
  await s.call({ action: 'beginGuardian', ...permission }, { headers: { cookie } });
  const good = result(s.records[0]);
  const bad = [
    { ...good, status: 'READY' },
    { ...good, id: 'other' },
    { ...good, channel: { key: 'channel', type: 'TEST' } },
    { ...good, channel: { key: 'other', type: 'LIVE' } },
    { ...good, verifiedCustomer: { ...good.verifiedCustomer, birthDate: '2011-01-01' } },
    { ...good, verifiedAt: '2020-01-01T00:00:00Z' },
    { ...good, verifiedAt: '2040-01-01T00:00:00Z' },
    {
      ...good,
      verifiedCustomer: { name: '', phoneNumber: '01012345678', birthDate: '1980-01-01' },
    },
  ];
  for (const v of bad) {
    assert.equal(validateGuardianResult(v, s.records[0], 'channel', current), false);
    s.setVerified(v);
    const r = await s.call({ action: 'confirmGuardian' }, { headers: { cookie } });
    assert.equal(r.statusCode, 403);
    assert.equal(s.records[0].status, 'pending');
  }
});
test('missing consent, cross origin, wrong cookie, expired request and invalid auth cannot approve', async () => {
  const s = setup(),
    cookie = await child(s);
  assert.equal(
    (
      await s.call(
        { action: 'beginGuardian', ...permission, acceptedPrivacy: false },
        { headers: { cookie } },
      )
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await s.call(
        { action: 'beginGuardian', ...permission },
        { headers: { cookie, origin: 'https://attacker.example' } },
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await s.call(
        { action: 'beginGuardian', ...permission },
        { headers: { cookie: cookie.replace(/[a-f0-9]{64}$/, '0'.repeat(64)) } },
      )
    ).statusCode,
    409,
  );
  assert.equal(
    (await s.call({ action: 'status' }, { headers: { authorization: 'Bearer forged' } }))
      .statusCode,
    401,
  );
  s.records[0].expires_at = '2020-01-01T00:00:00Z';
  assert.equal(
    (await s.call({ action: 'confirmGuardian' }, { headers: { cookie } })).statusCode,
    409,
  );
  assert.equal(s.providerCalls, 0);
});
test('claimed cookies never authorize an unauthenticated new account; known minors cannot redeclare adult', async () => {
  const s = setup(),
    cookie = await child(s);
  s.records[0].status = 'claimed';
  const status = await s.call({ action: 'status' }, { headers: { cookie } });
  assert.equal(status.body.approved, false);
  s.members.push({
    user_id: 'owner',
    age_group: 'under14',
    consent_version: CONSENT_VERSION,
    revoked_at: null,
    approved_at: null,
  });
  assert.equal(
    (
      await s.call(
        { action: 'start', birthDate: '1990-01-01', acceptedTerms: true },
        { headers: { authorization: 'Bearer valid' } },
      )
    ).statusCode,
    403,
  );
});
test('deployment disabled or missing provider configuration does not approve a child', async () => {
  for (const config of [
    { ...env, GUARDIAN_CONSENT_ENABLED: 'false' },
    { ...env, PORTONE_API_SECRET: '' },
  ]) {
    const s = setup();
    const handler = createAdmissionHandler(config, {
      makeClient: () => ({ auth: { getUser: async () => ({ data: {} }) } }),
    });
    const res = {
      setHeader() {},
      status(n) {
        this.statusCode = n;
        return this;
      },
      json(v) {
        this.body = v;
        return this;
      },
    };
    await handler(
      {
        method: 'POST',
        headers: { origin },
        body: {
          action: 'start',
          birthDate: '2015-01-01',
          acceptedTerms: true,
          version: CONSENT_VERSION,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 503);
  }
});

test('outdated client consent cannot silently accept a new document version', async () => {
  const s = setup();
  const response = await s.call({
    action: 'start',
    birthDate: '2000-01-01',
    acceptedTerms: true,
    version: 'old-version',
  });
  assert.equal(response.statusCode, 409);
  assert.equal(s.records.length, 0);
});
