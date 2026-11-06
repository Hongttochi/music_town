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

// Daytime is 06:00–18:59 in Korea; the park is dark outside those hours.
export function isParkNight(now = Date.now()) {
  const hour = new Date(now + 9 * 60 * 60 * 1000).getUTCHours();
  return hour < 6 || hour >= 19;
}
