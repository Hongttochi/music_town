type EventName =
  | 'runtime_error'
  | 'unhandled_rejection'
  | 'login_success'
  | 'login_failed'
  | 'api_failed'
  | 'voice_failed'
  | 'channel_enter'
  | 'channel_leave'
  | 'performance_start'
  | 'performance_end';
type Details = {
  code?: string;
  operation?: string;
  channel?: number;
  stage?: number;
  line?: number;
  column?: number;
  status?: number;
};
const enabled = import.meta.env.VITE_LOGGING_ENABLED === 'true';
let sessionId = '';
let queue: object[] = [];
let sending = false;
let started = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let windowStart = 0;
let sent = 0;
const recent = new Map<string, number>();

// Classify locally. Never send the original error, stack, URL or message.
export function errorCode(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : '';
  if (/invalid.*token|token.*invalid/i.test(message)) return 'invalid_token';
  if (/SESSION_EXPIRED/.test(message)) return 'session_expired';
  if (/CHANNEL_FULL/.test(message)) return 'channel_full';
  if (
    /permission|notallowed/i.test(message) ||
    (error instanceof DOMException && error.name === 'NotAllowedError')
  )
    return 'permission_denied';
  if (/network|fetch|connection/i.test(message)) return 'network';
  if (error instanceof TypeError) return 'type_error';
  if (error instanceof RangeError) return 'range_error';
  return 'unknown';
}

export function logEvent(event: EventName, details: Details = {}) {
  if (!enabled) return;
  try {
    const now = Date.now();
    if (now - windowStart >= 60000) {
      windowStart = now;
      sent = 0;
      recent.clear();
    }
    const key = JSON.stringify([event, details]);
    if (sent >= 40 || queue.length >= 20 || now - (recent.get(key) || 0) < 5000) return;
    if (!sessionId) sessionId = crypto.randomUUID();
    recent.set(key, now);
    sent++;
    queue.push({ ...details, event, sessionId, at: now });
    timer ??= setTimeout(() => {
      timer = undefined;
      void flushLogs();
    }, 1500);
  } catch {
    /* Logging must never interrupt the app. */
  }
}

export async function flushLogs() {
  if (sending || !queue.length) return;
  sending = true;
  const batch = queue;
  queue = [];
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* Best effort: no retry storm or recursive error reporting. */
  } finally {
    sending = false;
    if (queue.length && !timer)
      timer = setTimeout(() => {
        timer = undefined;
        void flushLogs();
      }, 1500);
  }
}

export function startTelemetry() {
  if (!enabled || started) return;
  started = true;
  window.addEventListener('error', (event) =>
    logEvent('runtime_error', {
      code: errorCode(event.error),
      line: event.lineno,
      column: event.colno,
    }),
  );
  window.addEventListener('unhandledrejection', (event) =>
    logEvent('unhandled_rejection', { code: errorCode(event.reason) }),
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void flushLogs();
  });
  window.addEventListener('pagehide', () => {
    void flushLogs();
  });
}
