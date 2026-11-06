import { createClient } from '@supabase/supabase-js';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import {
  CONSENT_TEXT,
  CONSENT_DOCUMENTS,
  CONSENT_VERSION,
  ageOnKoreanDate,
  validateGuardianResult,
} from '../server/admission-policy.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const cookieName = '__Host-mt-admission';
const clean = (value) => (typeof value === 'string' ? value.trim() : '');
const rpcError = (error) => {
  if (error) throw error;
};
export function createAdmissionHandler(env = process.env, deps = {}) {
  const makeClient = deps.makeClient || createClient;
  const request = deps.fetch || fetch;
  const now = deps.now || (() => new Date());
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const fail = (status, error) => res.status(status).json({ error });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return fail(405, 'POST 요청이 필요합니다.');
    }
    const origin = clean(env.APP_ORIGIN).replace(/\/$/, '');
    if (!origin || env.GUARDIAN_CONSENT_ENABLED !== 'true')
      return fail(503, '가입 확인 서비스를 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    // A fixed origin prevents CSRF and attacker-controlled verification callbacks.
    if (req.headers.origin !== origin) return fail(403, '허용되지 않은 요청입니다.');
    const url = clean(env.SUPABASE_URL) || clean(env.VITE_SUPABASE_URL);
    const secret = clean(env.SUPABASE_SECRET_KEY) || clean(env.SUPABASE_SERVICE_ROLE_KEY);
    const salt = clean(env.ADMISSION_HASH_SECRET);
    const storeId = clean(env.PORTONE_STORE_ID),
      channelKey = clean(env.PORTONE_CHANNEL_KEY),
      providerSecret = clean(env.PORTONE_API_SECRET);
    if (!url || !secret || salt.length < 32)
      return fail(503, '가입 확인 서비스 설정을 확인해 주세요.');
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return fail(400, '잘못된 요청입니다.');
    }
    if (!body || !['status', 'start', 'beginGuardian', 'confirmGuardian'].includes(body.action))
      return fail(400, '잘못된 요청입니다.');
    if (body.action !== 'status' && body.version !== CONSENT_VERSION)
      return fail(409, '동의 내용이 변경되었습니다. 새로고침한 뒤 다시 확인해 주세요.');
    try {
      const client = makeClient(url, secret, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const cookie = clean(req.headers.cookie)
        .split(';')
        .map((v) => v.trim())
        .find((v) => v.startsWith(cookieName + '='))
        ?.slice(cookieName.length + 1);
      const tokenHash = cookie && /^[a-f0-9]{64}$/.test(cookie) ? hash(cookie) : null;
      let user = null;
      if (req.headers.authorization) {
        if (!/^Bearer \S+$/.test(req.headers.authorization))
          return fail(401, '다시 로그인해 주세요.');
        const auth = await client.auth.getUser(req.headers.authorization.slice(7));
        if (auth.error || !auth.data?.user?.id) return fail(401, '다시 로그인해 주세요.');
        user = auth.data.user;
      }
      const admission = user
        ? await client
            .from('member_admissions')
            .select('age_group,consent_version,revoked_at,approved_at')
            .eq('user_id', user.id)
            .maybeSingle()
        : { data: null };
      rpcError(admission.error);
      let record = null;
      if (tokenHash) {
        const found = await client
          .from('service_admission_requests')
          .select('*')
          .eq('token_hash', tokenHash)
          .maybeSingle();
        rpcError(found.error);
        if (
          found.data &&
          Date.parse(found.data.expires_at) > now().getTime() &&
          found.data.consent_version === CONSENT_VERSION
        )
          record = found.data;
      }
      if (body.action === 'status') {
        if (
          user &&
          admission.data &&
          admission.data.approved_at &&
          admission.data.revoked_at === null &&
          admission.data.consent_version === CONSENT_VERSION
        )
          return res.status(200).json({ admitted: true, approved: true, version: CONSENT_VERSION });
        if (record && ['approved', 'claimed'].includes(record.status) && user) {
          const claimed = await client.rpc('claim_service_admission', {
            p_user_id: user.id,
            p_token_hash: tokenHash,
            p_version: CONSENT_VERSION,
          });
          rpcError(claimed.error);
          if (!claimed.data)
            return fail(403, '이 동의 기록을 해당 계정에 연결할 수 없습니다. 다시 확인해 주세요.');
          return res.status(200).json({ admitted: true, approved: true, version: CONSENT_VERSION });
        }
        return res.status(200).json({
          admitted: false,
          approved: !!record && record.status === 'approved',
          ageGroup: record?.age_group || null,
          pending: record?.status === 'pending',
          version: CONSENT_VERSION,
        });
      }
      if (body.action === 'start') {
        const age = ageOnKoreanDate(body.birthDate, now());
        if (age === null || body.acceptedTerms !== true)
          return fail(400, '생년월일과 필수 동의를 확인해 주세요.');
        const ageGroup = age < 14 ? 'under14' : '14plus';
        if (
          ageGroup === '14plus' &&
          (admission.data?.age_group === 'under14' || record?.age_group === 'under14')
        )
          return fail(403, '이용 연령 변경은 보호자 확인 또는 담당자 문의가 필요합니다.');
        if (ageGroup === 'under14' && (!storeId || !channelKey || !providerSecret))
          return fail(503, '보호자 본인확인을 준비 중입니다. 현재 가입을 진행할 수 없습니다.');
        const token = randomBytes(32).toString('hex');
        const id = randomUUID();
        const rateKey = createHmac('sha256', salt)
          .update(
            clean(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']) ||
              'unknown',
          )
          .digest('hex');
        const result = await client.rpc('reserve_service_admission', {
          p_id: id,
          p_token_hash: hash(token),
          p_age_group: ageGroup,
          p_version: CONSENT_VERSION,
          p_text_hash: hash(CONSENT_TEXT + JSON.stringify(CONSENT_DOCUMENTS)),
          p_verification_id: ageGroup === 'under14' ? 'mt-guardian-' + id : null,
          p_rate_key: rateKey,
          p_user_id: user?.id || null,
        });
        if (result.error?.message?.includes('RATE_LIMITED'))
          return fail(429, '확인 요청이 많습니다. 한 시간 뒤 다시 시도해 주세요.');
        rpcError(result.error);
        res.setHeader(
          'Set-Cookie',
          `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
        );
        return res
          .status(200)
          .json({ approved: ageGroup === '14plus', ageGroup, version: CONSENT_VERSION });
      }
      if (
        body.action === 'confirmGuardian' &&
        record?.age_group === 'under14' &&
        ['approved', 'claimed'].includes(record.status) &&
        record.guardian_identity_hash &&
        record.guardian_verified_at
      )
        return res.status(200).json({ approved: true, version: CONSENT_VERSION });
      if (!record || record.age_group !== 'under14' || record.status !== 'pending')
        return fail(409, '동의 요청이 만료되었거나 이미 처리되었습니다. 다시 시작해 주세요.');
      if (body.action === 'beginGuardian') {
        if (
          body.acceptedPrivacy !== true ||
          body.acceptedTerms !== true ||
          body.isLegalGuardian !== true ||
          !['parent', 'legal_guardian'].includes(body.relationship)
        )
          return fail(400, '법정대리인 확인과 필수 동의를 모두 확인해 주세요.');
        if (!storeId || !channelKey || !providerSecret)
          return fail(503, '보호자 본인확인 설정을 확인해 주세요.');
        // The consent statement is recorded before authentication, and cannot be supplied as text by a client.
        const indicatedAt = record.indicated_at || now().toISOString();
        const updated = await client
          .from('service_admission_requests')
          .update({ indicated_at: indicatedAt, relationship: body.relationship })
          .eq('id', record.id)
          .eq('status', 'pending')
          .gt('expires_at', now().toISOString())
          .select('id')
          .maybeSingle();
        rpcError(updated.error);
        if (!updated.data) return fail(409, '동의 요청 상태가 변경되었습니다.');
        return res.status(200).json({
          storeId,
          channelKey,
          identityVerificationId: record.verification_id,
          redirectUrl: origin + '/?guardianCallback=1',
          consentText: CONSENT_TEXT,
          version: CONSENT_VERSION,
        });
      }
      if (!record.indicated_at || !record.relationship)
        return fail(403, '먼저 보호자 동의 내용을 확인해 주세요.');
      const response = await request(
        'https://api.portone.io/identity-verifications/' +
          encodeURIComponent(record.verification_id) +
          '?storeId=' +
          encodeURIComponent(storeId),
        {
          headers: { Authorization: 'PortOne ' + providerSecret },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok)
        return fail(502, '본인확인 결과를 조회하지 못했습니다. 다시 확인해 주세요.');
      const verified = await response.json();
      if (!validateGuardianResult(verified, record, channelKey, now()))
        return fail(
          403,
          '성인 보호자의 본인확인이 완료되지 않았습니다. 보호자 명의로 다시 진행해 주세요.',
        );
      const identityHash = createHmac('sha256', salt)
        .update(verified.verifiedCustomer.phoneNumber)
        .digest('hex');
      const updated = await client
        .from('service_admission_requests')
        .update({
          status: 'approved',
          approved_at: now().toISOString(),
          guardian_name: verified.verifiedCustomer.name,
          guardian_identity_hash: identityHash,
          guardian_verified_at: verified.verifiedAt,
        })
        .eq('id', record.id)
        .eq('status', 'pending')
        .eq('consent_version', CONSENT_VERSION)
        .gt('expires_at', now().toISOString())
        .select('id')
        .maybeSingle();
      rpcError(updated.error);
      if (!updated.data) {
        const fresh = await client
          .from('service_admission_requests')
          .select('*')
          .eq('token_hash', tokenHash)
          .maybeSingle();
        rpcError(fresh.error);
        if (
          fresh.data?.status === 'approved' &&
          fresh.data.consent_version === CONSENT_VERSION &&
          fresh.data.guardian_identity_hash &&
          Date.parse(fresh.data.expires_at) > now().getTime()
        )
          return res.status(200).json({ approved: true, version: CONSENT_VERSION });
        return fail(409, '이미 처리된 동의 요청입니다. 상태를 다시 확인해 주세요.');
      }
      return res.status(200).json({ approved: true, version: CONSENT_VERSION });
    } catch {
      return fail(502, '동의 확인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };
}
export default createAdmissionHandler();
