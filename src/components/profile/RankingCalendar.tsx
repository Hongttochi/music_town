import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { rankingWeek } from '../../data/rankingWeeks';
import { Button } from '../ui/Button';

export function RankingCalendar({
  id,
  selectedWeek,
  today,
  onSelect,
  onClose,
}: {
  id: string;
  selectedWeek: string;
  today: string;
  onSelect: (day: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(selectedWeek.slice(0, 7));
  const first = new Date(`${month}-01T00:00:00Z`);
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  const move = (delta: number) => {
    const next = new Date(first);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setMonth(next.toISOString().slice(0, 7));
  };
  return (
    <div
      id={id}
      className="ranking-calendar"
      role="region"
      aria-label="랭킹 주 선택 달력"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="ranking-calendar-heading">
        <Button variant="ghost" size="icon" aria-label="이전 달" onClick={() => move(-1)}>
          <ChevronLeft size={15} />
        </Button>
        <strong aria-live="polite">
          {first.getUTCFullYear()}년 {first.getUTCMonth() + 1}월
        </strong>
        <Button
          variant="ghost"
          size="icon"
          aria-label="다음 달"
          disabled={month >= today.slice(0, 7)}
          onClick={() => move(1)}
        >
          <ChevronRight size={15} />
        </Button>
      </div>
      <div className="ranking-calendar-grid">
        {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
          <span className="ranking-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, index) => {
          const value = new Date(start);
          value.setUTCDate(start.getUTCDate() + index);
          const day = value.toISOString().slice(0, 10);
          return (
            <Button
              key={day}
              variant="ghost"
              className="ranking-calendar-day"
              data-outside={day.slice(0, 7) !== month}
              aria-pressed={rankingWeek(day) === selectedWeek}
              aria-current={day === today ? 'date' : undefined}
              disabled={day > today}
              aria-label={`${value.getUTCFullYear()}년 ${value.getUTCMonth() + 1}월 ${value.getUTCDate()}일이 포함된 주 선택`}
              onClick={() => onSelect(day)}
            >
              {value.getUTCDate()}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
