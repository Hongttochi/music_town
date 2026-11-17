import { useState, type CSSProperties } from 'react';
import { Wine } from 'lucide-react';
import { reveal } from '../utils/reveal';
import { Meter } from '../components/charts/Meter';
import { ErrorCard } from '../components/ui/ErrorCard';
import { useAdminRpc } from '../hooks/useAdminRpc';
import { useServerNow } from '../hooks/useServerNow';
import { type Live as Data } from '../services/adminRepository';
import './live.css';

const BAR_STAGE = 6;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
// A stable color derived from the name fills the avatar circle.
const colorOf = (name: string) =>
  `hsl(${[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 55% 68%)`;

export function Live() {
  const { data, error, reload } = useAdminRpc<Data>('admin_live', undefined, 3000);
  const [picked, setPicked] = useState<number | null>(null);
  const now = useServerNow(data?.now);
  if (!data) return <ErrorCard error={error} reload={reload} />;

  const channel = picked ?? data.channels[0]?.id;
  return (
    <>
      {error && <p className="a-banner">{error.message} 마지막 상태를 보여주고 있어요.</p>}
      <div {...reveal(0)}>
        <div className="a-chips">
          {data.channels.map((c) => (
            <button
              key={c.id}
              className="a-chip"
              aria-pressed={c.id === channel}
              onClick={() => setPicked(c.id)}
            >
              {c.name}
              <span style={{ opacity: 0.7 }}>
                {c.capacity ? `${c.count}/${c.capacity}` : c.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="a-grid g-stages" key={channel}>
        {data.stages.map((s, i) => {
          const p = data.performances.find((x) => x.channel === channel && x.stage === s.id);
          const queue =
            data.queue.find((q) => q.channel === channel && q.stage === s.id)?.count ?? 0;
          const total = p
            ? (new Date(p.endsAt).getTime() - new Date(p.startedAt).getTime()) / 1000
            : 0;
          const left = p ? Math.max(0, Math.round((new Date(p.endsAt).getTime() - now) / 1000)) : 0;
          const live = !!p && left > 0;
          return (
            <div key={s.id} {...reveal(i + 1)}>
              <div className={`a-card a-stage-card ${live ? 'live' : ''}`}>
                <div className="a-card-head" style={{ marginBottom: 0 }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s.id === BAR_STAGE && <Wine size={14} />}
                      {s.name}
                    </h3>
                    <p className="a-cap">무대 {s.id + 1}</p>
                  </div>
                  {live ? (
                    <span className="a-badge b-green">
                      <span className="a-eq">
                        <i />
                        <i />
                        <i />
                      </span>
                      공연 중
                    </span>
                  ) : p ? (
                    <span className="a-badge b-amber">정리 대기</span>
                  ) : (
                    <span className="a-badge b-gray">비어 있음</span>
                  )}
                </div>
                {p ? (
                  <>
                    <div className="a-perf">
                      <span
                        className="a-avatar"
                        style={{ '--c': colorOf(p.name) } as CSSProperties}
                      >
                        {p.name[0]}
                      </span>
                      <div>
                        <b>{p.name}</b>
                        <small>{new Date(p.startedAt).toTimeString().slice(0, 5)} 시작</small>
                      </div>
                    </div>
                    <Meter ratio={total ? 1 - left / total : 1} i={i} hot={left < 120} />
                    <div className="a-progress">
                      <span>{live ? `${fmt(left)} 남음` : '시간 종료'}</span>
                      <span>대기 {queue}</span>
                    </div>
                  </>
                ) : (
                  <div
                    className="a-perf"
                    style={{ color: 'var(--a-muted)', fontSize: 12.5, minHeight: 78 }}
                  >
                    {queue > 0
                      ? `대기 ${queue}명 · 다음 차례 승격 대기`
                      : '공연 신청을 기다리는 중'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
