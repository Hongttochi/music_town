import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FanStats } from '../../hooks/useFanStats';
import { Button } from '../ui/Button';
export function formatActivity(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
    : minutes
      ? `${minutes}분`
      : seconds > 0
        ? '1분 미만'
        : '0분';
}
export function ActivityChart({ stats }: { stats: FanStats | null }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const [chosen, setChosen] = useState<string | null>(null);
  const [metric, setMetric] = useState<'onlineSeconds' | 'stageSeconds'>('onlineSeconds');
  const days = stats?.days ?? [];
  const selected = days.find((day) => day.date === chosen) ?? days.at(-1);
  const max = Math.max(60, ...days.map((day) => day[metric]));
  const points = days.map((day, index) => ({
    x: (index + 0.5) * (332 / Math.max(1, days.length)),
    y: 100 - (Math.max(0, day[metric]) / max) * 72,
    day,
  }));
  return (
    <section className="activity-stats" data-expanded={expanded} data-metric={metric}>
      <Button
        className="activity-toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>활동 기록</span>
        <span className="activity-summary-time">
          {stats
            ? `접속 ${formatActivity(stats.onlineSeconds)} · 무대 ${formatActivity(stats.stageSeconds)}`
            : '—'}
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </Button>
      <div className="activity-reveal" id={contentId} aria-hidden={!expanded} inert={!expanded}>
        <div className="activity-reveal-inner">
          <div className="activity-expanded">
            <div className="activity-chart-heading">
              <span>최근 7일</span>
              <div className="activity-metrics" role="group" aria-label="그래프 항목">
                <Button
                  variant="plain"
                  aria-pressed={metric === 'onlineSeconds'}
                  onClick={() => setMetric('onlineSeconds')}
                >
                  접속
                </Button>
                <Button
                  variant="plain"
                  aria-pressed={metric === 'stageSeconds'}
                  onClick={() => setMetric('stageSeconds')}
                >
                  무대
                </Button>
              </div>
            </div>
            {stats && days.length ? (
              <>
                <p className="activity-detail" aria-live="polite">
                  <span key={selected?.date}>{selected?.date.replaceAll('-', '.')}</span>
                  <strong key={`${selected?.date}-${metric}`}>
                    <small>{metric === 'onlineSeconds' ? '접속' : '무대'} 시간</small>
                    {selected ? formatActivity(selected[metric]) : '—'}
                  </strong>
                </p>
                <p className="activity-scale-note">
                  최근 7일 최장 {metric === 'onlineSeconds' ? '접속' : '무대'} ·{' '}
                  {formatActivity(Math.max(0, ...days.map((day) => day[metric])))}
                </p>
                <svg
                  className="activity-plot"
                  viewBox="0 20 332 92"
                  role="img"
                  aria-label={`최근 7일 ${metric === 'onlineSeconds' ? '접속' : '무대'} 시간. 날짜별 값은 아래 버튼에서 확인할 수 있어요.`}
                >
                  <path d="M24 28H308 M24 64H308 M24 100H308" className="activity-grid" />
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                    className="activity-line"
                  />
                  {points.map((p) => (
                    <circle
                      key={p.day.date}
                      cx={p.x}
                      cy={p.y}
                      r={p.day.date === selected?.date ? 3 : 2}
                      className={
                        p.day.date === selected?.date
                          ? 'activity-point is-selected'
                          : 'activity-point'
                      }
                    />
                  ))}
                </svg>
                <div
                  className="activity-dates"
                  role="group"
                  aria-label="날짜별 활동"
                  style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                >
                  {days.map((day) => (
                    <Button
                      key={day.date}
                      variant="plain"
                      aria-pressed={selected?.date === day.date}
                      aria-label={`${day.date}, 접속 ${formatActivity(day.onlineSeconds)}, 무대 ${formatActivity(day.stageSeconds)}`}
                      onClick={() => setChosen(day.date)}
                    >
                      {Number(day.date.slice(5, 7))}/{Number(day.date.slice(8))}
                    </Button>
                  ))}
                </div>
                {!days.some((day) => day[metric] > 0) && (
                  <p className="activity-empty">최근 7일 기록이 없어요.</p>
                )}
              </>
            ) : (
              <p className="activity-empty">아직 표시할 기록이 없어요.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
