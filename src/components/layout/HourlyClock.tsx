import { useEffect, useState } from 'react';

/** Local display only; Korean time, shown on entry and at each hour boundary. */
export function HourlyClock({ active }: { active: boolean }) {
  const [announcement, setAnnouncement] = useState<Date | null>(null);
  useEffect(() => {
    if (!active) {
      setAnnouncement(null);
      return;
    }
    let hourTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    const announce = () => {
      const now = new Date();
      setAnnouncement(now);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setAnnouncement(null), 8000);
      const nextHour = 3600000 - (now.getTime() % 3600000);
      hourTimer = setTimeout(announce, nextHour);
    };
    announce();
    return () => {
      clearTimeout(hourTimer);
      clearTimeout(hideTimer);
    };
  }, [active]);
  if (!announcement) return null;
  return (
    <div className="hourly-clock" key={announcement.getTime()} role="status" aria-live="polite">
      <span>
        {announcement.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Seoul',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}
      </span>
      <small>
        {announcement.toLocaleDateString('ko-KR', {
          timeZone: 'Asia/Seoul',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      </small>
    </div>
  );
}
