import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { reveal } from '../utils/reveal';
import { formatInt } from '../utils/format';
import { CountUp } from '../components/ui/CountUp';
import { Sparkline } from '../components/charts/Sparkline';
import { BarChart } from '../components/charts/BarChart';
import { Meter } from '../components/charts/Meter';
import { ErrorCard } from '../components/ui/ErrorCard';
import { useAdminRpc } from '../hooks/useAdminRpc';
import { type Overview as Data } from '../services/adminRepository';
import './overview.css';

// Noon in Korea is the same calendar day in UTC, so the weekday is safe to read.
const weekend = (day: string) => [0, 6].includes(new Date(`${day}T12:00:00+09:00`).getUTCDay());

export function Overview() {
  const { data, error, reload } = useAdminRpc<Data>('admin_overview', undefined, 10000);
  if (!data) return <ErrorCard error={error} reload={reload} />;

  const days = data.days;
  const today = days.at(-1)?.visitors ?? data.todayVisitors;
  const yesterday = days.at(-2)?.visitors ?? 0;
  const delta = yesterday ? ((today - yesterday) / yesterday) * 100 : null;
  const total = data.channels.reduce((a, c) => a + c.count, 0);
  const kpis = [
    { label: '지금 접속', value: data.online, note: '45초 안에 신호가 온 이용자' },
    { label: '오늘 방문', value: data.todayVisitors, delta, spark: days.map((d) => d.visitors) },
    { label: '오늘 공연', value: data.todayShows, note: '운영실 적용 이후부터 기록' },
    { label: '처리할 신고', value: data.openReports, note: '접수 + 검토 중' },
    { label: '오늘 가입', value: data.todaySignups, note: '한국 시간 기준' },
  ];

  return (
    <>
      {error && <p className="a-banner">{error.message} 마지막으로 불러온 값을 보여주고 있어요.</p>}
      <div className="a-grid g-kpi">
        {kpis.map((k, i) => (
          <div key={k.label} {...reveal(i)}>
            <div className="a-card a-kpi">
              <p>{k.label}</p>
              <strong>
                <CountUp value={k.value} format={formatInt} />
              </strong>
              {k.delta != null ? (
                <span className={`a-delta ${k.delta >= 0 ? 'up' : 'down'}`}>
                  {k.delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(k.delta).toFixed(1)}% 어제 대비
                </span>
              ) : (
                <span className="a-cap" style={{ fontSize: 11.5 }}>
                  {k.note}
                </span>
              )}
              {k.spark && <Sparkline data={k.spark} />}
            </div>
          </div>
        ))}
      </div>

      <div className="a-grid g-2-1 a-overview-charts" style={{ marginTop: 28 }}>
        <div {...reveal(5)}>
          <div className="a-card">
            <div className="a-card-head">
              <div>
                <h3>최근 14일 방문자</h3>
                <p className="a-cap">하루에 한 번이라도 공원에 들어온 사람 수 · 보라색은 주말</p>
              </div>
            </div>
            <BarChart
              data={days.map((d) => ({
                label: d.day.slice(5).replace('-', '/'),
                v: d.visitors,
                night: weekend(d.day),
              }))}
              format={formatInt}
              showEvery={2}
            />
          </div>
        </div>
        <div {...reveal(6)}>
          <div className="a-card">
            <div className="a-card-head">
              <div>
                <h3>채널 혼잡도</h3>
                <p className="a-cap">정원 대비 지금 접속 · 90% 이상은 붉게 표시</p>
              </div>
              <span className="a-badge b-green">{formatInt(total)}명</span>
            </div>
            {data.channels.map((c, i) => (
              <div className="a-chan" key={c.id}>
                <span>{c.name}</span>
                <Meter
                  ratio={c.capacity ? c.count / c.capacity : 0}
                  i={i}
                  hot={!!c.capacity && c.count / c.capacity >= 0.9}
                />
                <span>{c.capacity ? `${c.count}/${c.capacity}` : c.count}</span>
              </div>
            ))}
            {!data.channels.length && <p className="a-empty">채널 정보가 없어요</p>}
            <div className="a-stat-rows" style={{ marginTop: 12 }}>
              <div>
                정리 대기 세션 (45초 이상 무응답) <b>{formatInt(data.stale)}</b>
              </div>
              <div>
                진행 중 공연 <b>{formatInt(data.performing)}</b>
              </div>
              <div>
                무대 대기열 <b>{formatInt(data.queued)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
