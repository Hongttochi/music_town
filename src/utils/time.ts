export function koreanHour() {
  return (
    Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
    ) % 24
  );
}

// Temporary night preview, automatically expires at 2026-11-08 15:30 KST.
const NIGHT_PREVIEW_START = Date.parse('2026-11-08T05:51:00Z');
const NIGHT_PREVIEW_END = Date.parse('2026-11-08T06:30:00Z');

// Daytime is 06:00–18:59 in Korea; the park is dark outside those hours.
export function isParkNight(now = Date.now()) {
  if (now >= NIGHT_PREVIEW_START && now < NIGHT_PREVIEW_END) return true;
  const hour = new Date(now + 9 * 60 * 60 * 1000).getUTCHours();
  return hour < 6 || hour >= 19;
}
