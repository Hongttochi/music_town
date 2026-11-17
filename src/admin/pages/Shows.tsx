import { useState } from 'react';
import { reveal } from '../utils/reveal';
import { CountUp } from '../components/ui/CountUp';
import { BarChart } from '../components/charts/BarChart';
import { Tabs } from '../components/ui/Tabs';
import { ErrorCard } from '../components/ui/ErrorCard';
import { useAdminRpc } from '../hooks/useAdminRpc';
import { formatInt, formatDuration } from '../utils/format';
import { type Shows as Data } from '../services/adminRepository';
import { Live } from './Live';

export function Shows() {
  const [tab, setTab] = useState<'live' | 'results'>('results');
  return (
    <>
      <div {...reveal(0)}>
        <Tabs
          items={[
            { id: 'live', label: '진행 중' },
            { id: 'results', label: '최근 7일' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'live' ? <Live /> : <Results />}
    </>
  );
}

function Results() {
  const { data, error, reload } = useAdminRpc<Data>('admin_shows', undefined, 60000);
  if (!data) return <ErrorCard error={error} reload={reload} />;
  const earlyRate = data.finished ? (data.earlyEnds / data.finished) * 100 : 0;
  return (
    <>
      <div className="a-grid g-2-1">
        <div {...reveal(1)}>
          <div className="a-card" style={{ overflowX: 'auto' }}>
            <div className="a-card-head">
              <div>
                <h3>무대에 많이 선 뮤지션</h3>
                <p className="a-cap">최근 7일 무대 시간 순 · 팔로워와 하트는 누적</p>
              </div>
            </div>
            {data.musicians.length ? (
              <table className="a-table">
                <thead>
                  <tr>
                    <th>뮤지션</th>
                    <th>무대 시간</th>
                    <th>팔로워</th>
                    <th>하트</th>
                  </tr>
                </thead>
                <tbody>
                  {data.musicians.map((m) => (
                    <tr key={m.userId} style={{ cursor: 'default' }}>
                      <td>
                        <b>{m.name}</b>
                      </td>
                      <td>{formatDuration(m.stageSeconds)}</td>
                      <td>{formatInt(m.followers)}</td>
                      <td>{formatInt(m.hearts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="a-empty">최근 7일 동안 무대에 선 사람이 없어요</p>
            )}
          </div>
        </div>
        <div {...reveal(2)}>
          <div className="a-card" style={{ height: '100%' }}>
            <p className="a-cap" style={{ marginTop: 0 }}>
              최근 7일 무대 시간 합계
            </p>
            <div className="a-big">
              <CountUp value={data.stageSeconds / 3600} format={(n) => `${n.toFixed(1)}시간`} />
            </div>
            <p className="a-cap">{formatInt(data.performers)}명이 무대에 섰어요</p>
            <div className="a-stat-rows">
              <div>
                공연 수 <b>{formatInt(data.shows)}</b>
              </div>
              <div>
                평균 공연 시간 <b>{data.finished ? formatDuration(data.avgSeconds) : '-'}</b>
              </div>
              <div>
                중간 종료 비율 <b>{data.finished ? `${earlyRate.toFixed(1)}%` : '-'}</b>
              </div>
              <div>
                새 팔로우 <b>{formatInt(data.newFollows)}</b>
              </div>
              <div>
                새 하트 <b>{formatInt(data.newHearts)}</b>
              </div>
            </div>
            <p className="a-cap" style={{ marginTop: 12 }}>
              공연 수·평균·중간 종료는 운영실 적용 이후 공연부터 집계돼요.
            </p>
          </div>
        </div>
      </div>
      {data.musicians.length > 0 && (
        <div {...reveal(3)}>
          <div className="a-card" style={{ marginTop: 16 }}>
            <h3>뮤지션별 무대 시간</h3>
            <p className="a-cap">최근 7일 · 막대에 마우스를 올리면 값이 보여요</p>
            <BarChart
              data={data.musicians.map((m) => ({ label: m.name, v: m.stageSeconds / 60 }))}
              format={(n) => `${Math.round(n)}분`}
            />
          </div>
        </div>
      )}
    </>
  );
}
