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

// Temporary preview: dawn at 00:45 KST on Nov 7, then rejoin the regular cycle at 06:00.
export function isParkNight(now = Date.now()) {
  if (
    now >= Date.parse('2026-11-07T00:45:00+09:00') &&
    now < Date.parse('2026-11-07T06:00:00+09:00')
  )
    return false;
  const hour = new Date(now + 9 * 60 * 60 * 1000).getUTCHours();
  return hour < 6 || hour >= 19;
}
