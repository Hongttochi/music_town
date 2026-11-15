// Sample values for the errors & voice page until Logflare and LiveKit are connected.

export const errorCodes = [
  { code: 'network', count: 182, color: '#7d95ff' },
  { code: 'session_expired', count: 74, color: '#9f8cff' },
  { code: 'permission_denied', count: 61, color: '#f4c56a' },
  { code: 'channel_full', count: 38, color: '#37e3b2' },
  { code: 'invalid_token', count: 12, color: '#ff6b88' },
  { code: 'unknown', count: 9, color: '#8b97d6' },
];

export const loginByProvider = [
  { provider: 'Google', ok: 1830, fail: 21 },
  { provider: 'Kakao', ok: 1310, fail: 47 },
];

export const voice = { tokenOk: 1288, tokenFail: 9, rooms: 31, publishers: 22, micDenied: 61 };

const events = [
  'api_failed',
  'voice_failed',
  'login_failed',
  'runtime_error',
  'unhandled_rejection',
];
const ops = [
  'town_action',
  'voice_token',
  'profile_fan_action',
  'oauth_kakao',
  'submit_town_report',
];
export function randomLog(seq: number) {
  const i = Math.floor(Math.random() * 100);
  const code = errorCodes[i % errorCodes.length].code;
  const now = new Date();
  return {
    id: seq,
    time: now.toTimeString().slice(0, 8),
    event: events[i % events.length],
    op: ops[(i >> 1) % ops.length],
    code,
    channel: (i % 5) + 1,
  };
}
