// Public, untrusted operational telemetry: never use these events for billing or audit.
const events = new Set([
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
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeEvent(value, now = Date.now()) {
  if (
    !value ||
    !events.has(value.event) ||
    !uuid.test(value.sessionId || '') ||
    !Number.isFinite(value.at) ||
    Math.abs(now - value.at) > 86400000
  )
    return null;
  const metadata = {
    session_id: value.sessionId,
    occurred_at: new Date(value.at).toISOString(),
    origin: 'browser',
    level:
      value.event.endsWith('failed') ||
      value.event.includes('error') ||
      value.event.includes('rejection')
        ? 'error'
        : 'info',
  };
  if (codes.has(value.code)) metadata.code = value.code;
  if (operations.has(value.operation)) metadata.operation = value.operation;
  for (const key of ['channel', 'stage', 'line', 'column', 'status']) {
    if (Number.isInteger(value[key]) && value[key] >= 0 && value[key] <= 1000000)
      metadata[key] = value[key];
  }
  // No user-supplied messages, stacks, URLs, identity, credentials or nested metadata.
  return { message: value.event, metadata };
}

export function createLogsHandler(env = process.env, request = fetch, now = Date.now) {
  // Best-effort instance-local ceiling; deployment-wide limits belong in Vercel Firewall.
  let windowStart = 0;
  let accepted = 0;
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const end = (status) => res.status(status).end();
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return end(405);
    }
    const allowed = (env.LOG_ALLOWED_ORIGINS || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (!allowed.includes(req.headers.origin)) return end(403);
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return end(415);
    if (!env.LOGFLARE_API_KEY?.trim() || !uuid.test(env.LOGFLARE_SOURCE_ID?.trim() || ''))
      return end(503);
    let body;
    try {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!raw || Buffer.byteLength(raw) > 16384) return end(413);
      body = JSON.parse(raw);
    } catch {
      return end(400);
    }
    if (!Array.isArray(body?.events) || body.events.length < 1 || body.events.length > 20)
      return end(400);
    const batch = body.events.map((value) => sanitizeEvent(value, now()));
    if (batch.some((value) => !value)) return end(400);
    if (now() - windowStart >= 60000) {
      windowStart = now();
      accepted = 0;
    }
    if (accepted + batch.length > 600) {
      res.setHeader('Retry-After', '60');
      return end(429);
    }
    accepted += batch.length;
    for (const event of batch) {
      event.metadata.release = (env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 40);
      event.metadata.environment = env.VERCEL_ENV || 'development';
    }
    try {
      const response = await request(
        `https://api.logflare.app/api/logs?source=${env.LOGFLARE_SOURCE_ID.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': env.LOGFLARE_API_KEY.trim() },
          body: JSON.stringify({ batch }),
          signal: AbortSignal.timeout(4000),
        },
      );
      return end(response.ok ? 204 : 502);
    } catch {
      return end(502);
    }
  };
}
export default createLogsHandler();
