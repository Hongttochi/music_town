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
