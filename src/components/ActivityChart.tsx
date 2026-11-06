import { useState } from 'react';
import type { FanStats } from '../useFanStats';
import { Button } from './ui/Button';
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
  const [chosen, setChosen] = useState<string | null>(null);
  const max = Math.max(60, ...(stats?.days.map((day) => day.onlineSeconds) ?? []));
  const selected = stats?.days.find((day) => day.date === chosen) ?? stats?.days.at(-1);
  return (
    <section className="activity-stats" aria-label="접속 및 무대 시간 통계">
      <dl className="fan-counts">
        <div>
          <dt>누적 접속 시간</dt>
          <dd>{stats ? formatActivity(stats.onlineSeconds) : '—'}</dd>
        </div>
        <div>
          <dt>누적 무대 시간</dt>
          <dd>{stats ? formatActivity(stats.stageSeconds) : '—'}</dd>
        </div>
      </dl>
      <h3>최근 7일 활동</h3>
      <div className="activity-legend">
        <span>● 공원 접속</span>
        <span>● 무대 공연</span>
      </div>
      {stats ? (
        <>
          <div
            className="activity-chart"
            aria-label="날짜를 누르면 해당 일의 시간을 확인할 수 있어요"
          >
            {stats.days.map((day) => (
              <Button
                key={day.date}
                variant="plain"
                aria-pressed={selected?.date === day.date}
                aria-label={`${day.date}, 접속 ${formatActivity(day.onlineSeconds)}, 무대 ${formatActivity(day.stageSeconds)}`}
                onClick={() => setChosen(day.date)}
              >
                <span className="activity-bars" aria-hidden="true">
                  <i style={{ height: `${(day.onlineSeconds / max) * 100}%` }} />
                  <i style={{ height: `${(day.stageSeconds / max) * 100}%` }} />
                </span>
                <span>
                  {Number(day.date.slice(5, 7))}/{Number(day.date.slice(8))}
                </span>
              </Button>
            ))}
          </div>
          <p className="activity-detail" aria-live="polite">
            {selected &&
              `${selected.date} · 접속 ${formatActivity(selected.onlineSeconds)} · 무대 ${formatActivity(selected.stageSeconds)}`}
          </p>
          {stats.onlineSeconds === 0 && <small>아직 기록된 활동이 없어요.</small>}
        </>
      ) : (
        <p>통계를 불러오면 그래프가 표시돼요.</p>
      )}
      <small>
        한국 시간 기준 · 공원에 접속한 시간만 집계하며, 무대 시간은 접속 시간에 포함돼요. 기록 시작
        이후의 활동이 표시됩니다.
      </small>
    </section>
  );
}
