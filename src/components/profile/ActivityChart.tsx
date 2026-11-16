import { useId, useState } from 'react';
import './activity-chart.css';
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
  const peak = Math.max(0, ...days.map((day) => day[metric]));
  const step = peak <= 3600 ? 900 : 3600;
  const ceiling = Math.max(step, Math.ceil(peak / step) * step);
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
                <div className="activity-selection" aria-live="polite">
                  <span className="activity-selected-date">
                    {selected?.date.replaceAll('-', '.')}
                  </span>
                  <div>
                    <strong className="activity-selected-value">
                      {selected ? formatActivity(selected[metric]) : '—'}
                    </strong>
                    <span className="activity-selected-metric">
                      {metric === 'onlineSeconds' ? '접속 시간' : '무대 시간'}
                    </span>
                  </div>
                </div>
                <div className="activity-chart-body">
                  <div className="activity-axis" aria-hidden="true">
                    <span>{formatActivity(ceiling).replace('시간 0분', '시간')}</span>
                    <span>{formatActivity(ceiling / 2).replace('시간 0분', '시간')}</span>
                    <span>0</span>
                  </div>
                  <div
                    className="activity-columns"
                    role="group"
                    aria-label="날짜별 활동"
                    style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                  >
                    {days.map((day) => (
                      <button
                        type="button"
                        className="activity-day"
                        key={day.date}
                        aria-pressed={selected?.date === day.date}
                        aria-label={`${day.date}, 접속 ${formatActivity(day.onlineSeconds)}, 무대 ${formatActivity(day.stageSeconds)}`}
                        onClick={() => setChosen(day.date)}
                      >
                        <span className="activity-bar-track" aria-hidden="true">
                          <span
                            className="activity-column-bar"
                            data-empty={day[metric] <= 0}
                            style={{ height: `${(Math.max(0, day[metric]) / ceiling) * 100}%` }}
                          />
                        </span>
                        <span className="activity-day-label">{Number(day.date.slice(8))}</span>
                        <span className="activity-weekday" aria-hidden="true">
                          {
                            ['일', '월', '화', '수', '목', '금', '토'][
                              new Date(`${day.date}T00:00:00Z`).getUTCDay()
                            ]
                          }
                        </span>
                      </button>
                    ))}
                  </div>
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
