import { createClient } from '@supabase/supabase-js';
import { RoomServiceClient } from 'livekit-server-sdk';

const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const eventNames = new Set([
  'runtime_error',
  'unhandled_rejection',
  'login_success',
  'login_failed',
  'api_failed',
  'voice_failed',
  'channel_enter',
  'channel_leave',
  'performance_start',
  'performance_end',
]);
const errorNames = new Set([
  'runtime_error',
  'unhandled_rejection',
  'login_failed',
  'api_failed',
  'voice_failed',
]);
const codes = new Set([
  'unknown',
  'type_error',
  'range_error',
  'network',
  'invalid_token',
  'permission_denied',
  'session_expired',
  'channel_full',
  'disconnected',
]);
const operations = new Set([
  'login',
  'snapshot',
  'enter',
  'heartbeat',
  'join',
  'cancel',
  'finish',
  'leave',
  'voice_token',
  'voice_connect',
]);
const unavailable = (status, reason) => ({ status, reason });

// Fixed, bounded output. Never forward raw logs, session IDs, room names or identities.
export function summarizeLogs(rows, now) {
  if (!Array.isArray(rows)) throw new Error('Invalid log response');
  const from = now - 86400000;
  const events = rows
    .slice(0, 1000)
    .flatMap((r) => {
      const at = Date.parse(r?.at);
      if (!eventNames.has(r?.event) || !Number.isFinite(at) || at < from || at > now) return [];
      return [
        {
          at: new Date(at).toISOString(),
          event: r.event,
          code: codes.has(r.code) ? r.code : 'unknown',
          operation: operations.has(r.operation) ? r.operation : null,
          channel:
            Number.isInteger(r.channel) && r.channel >= 0 && r.channel <= 1000000
              ? r.channel
              : null,
        },
      ];
    })
    .sort((a, b) => b.at.localeCompare(a.at));
  if (rows.length && !events.length) throw new Error('No valid event rows');
  const errors = events.filter((e) => errorNames.has(e.event));
  const counts = new Map();
  for (const e of errors) counts.set(e.code, (counts.get(e.code) || 0) + 1);
  return {
    status: 'ok',
    from: new Date(from).toISOString(),
    sampled: rows.length >= 1000,
    sampleSize: events.length,
    logs: errors.slice(0, 50),
    errorCodes: [...counts]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count),
    loginOk: events.filter((e) => e.event === 'login_success').length,
    loginFail: events.filter((e) => e.event === 'login_failed').length,
    micDenied: errors.filter((e) => e.event === 'voice_failed' && e.code === 'permission_denied')
      .length,
  };
}

export function createMonitoringHandler(env = process.env, deps = {}) {
  const makeClient = deps.makeClient || createClient;
  const request = deps.request || fetch;
  const makeRooms = deps.makeRooms || ((...args) => new RoomServiceClient(...args));
  const now = deps.now || Date.now;
  let cache;
  let pending;

  async function logflare() {
    const endpoint = clean(env.LOGFLARE_QUERY_ENDPOINT);
    const key = clean(env.LOGFLARE_QUERY_API_KEY);
    if (!endpoint || !key) return unavailable('not_configured', 'query_settings_missing');
    if (!/^[a-zA-Z0-9_.-]+$/.test(endpoint)) return unavailable('error', 'invalid_settings');
    try {
      const response = await request(
        `https://api.logflare.app/api/endpoints/query/${encodeURIComponent(endpoint)}`,
        {
          headers: { 'X-API-KEY': key },
          signal: AbortSignal.timeout(5000),
          redirect: 'error',
        },
      );
      if (!response.ok) return unavailable('error', 'query_failed');
      return summarizeLogs((await response.json()).result, now());
    } catch {
      return unavailable('error', 'query_failed');
    }
  }

  async function livekit() {
    const url = clean(env.LIVEKIT_URL);
    const key = clean(env.LIVEKIT_API_KEY);
    const secret = clean(env.LIVEKIT_API_SECRET);
    if (!url || !key || !secret) return unavailable('not_configured', 'voice_settings_missing');
    try {
      const host = new URL(url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'));
      if (!['https:', 'http:'].includes(host.protocol)) throw new Error('Invalid host');
      const rooms = await makeRooms(host.origin, key, secret, {
        requestTimeout: 5,
        failover: false,
      }).listRooms();
      const town = rooms.filter((r) => /^town-performance-[a-f0-9]{32}$/.test(r.name));
      const sum = (key) =>
        town.reduce((n, r) => {
          if (!Number.isSafeInteger(r[key]) || r[key] < 0) throw new Error('Invalid room count');
          return n + r[key];
        }, 0);
      return {
        status: 'ok',
        rooms: town.length,
        participants: sum('numParticipants'),
        publishers: sum('numPublishers'),
      };
    } catch {
      return unavailable('error', 'rooms_query_failed');
    }
  }

  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status, error) => res.status(status).json({ error });
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return fail(405, 'GET 요청이 필요해요.');
    }
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization))
      return fail(401, '운영실 로그인이 필요해요.');
    const url = clean(env.SUPABASE_URL) || clean(env.VITE_SUPABASE_URL);
    const key = clean(env.SUPABASE_PUBLISHABLE_KEY) || clean(env.VITE_SUPABASE_PUBLISHABLE_KEY);
    if (!url || !key) return fail(503, '관리자 인증 설정이 필요해요.');
    try {
      const client = makeClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
          headers: { Authorization: authorization },
          fetch: (input, init) => request(input, { ...init, signal: AbortSignal.timeout(5000) }),
        },
      });
      const user = await client.auth.getUser(authorization.slice(7));
      if (user.error || !user.data?.user?.id) return fail(401, '다시 로그인해 주세요.');
      const role = await client.rpc('admin_whoami');
      if (role.error) return fail(502, '관리자 권한을 확인하지 못했어요.');
      if (!role.data?.admin) return fail(403, '관리자 권한이 필요해요.');
      // Recheck authorization on every request, including cached reads.
      if (!cache || now() - cache.time >= 15000) {
        pending ||= Promise.all([logflare(), livekit()])
          .then(([logs, voice]) => {
            cache = {
              time: now(),
              data: { checkedAt: new Date(now()).toISOString(), logs, voice },
            };
          })
          .finally(() => {
            pending = undefined;
          });
        await pending;
      }
      return res.status(200).json(cache.data);
    } catch {
      return fail(502, '모니터링 정보를 불러오지 못했어요.');
    }
  };
}

export default createMonitoringHandler();
