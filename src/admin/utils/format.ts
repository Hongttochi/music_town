const pad = (n: number) => String(n).padStart(2, '0');

export const formatInt = (n: number) => Math.round(n).toLocaleString('ko-KR');

export function formatCompact(n: number, digits = 1) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : digits).replace(/\.0$/, '') + 'k';
  return formatInt(n);
}

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}시간 ${m}분`;
  if (m) return `${m}분 ${pad(s % 60)}초`;
  return `${s}초`;
}

export function formatElapsed(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return '방금';
  if (m < 60) return `${m}분`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}시간 ${m % 60}분`;
  return `${Math.floor(m / 1440)}일`;
}

// Time only for today, month/day otherwise.
export function formatClock(iso: string) {
  const d = new Date(iso);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return new Date().toDateString() === d.toDateString()
    ? hm
    : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}
