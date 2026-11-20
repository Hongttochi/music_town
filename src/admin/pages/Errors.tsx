import { useEffect, useState } from 'react';
import { reveal } from '../utils/reveal';
import { CountUp } from '../components/ui/CountUp';
import { Meter } from '../components/charts/Meter';
import { errorCodes, loginByProvider, randomLog, voice } from '../data/demoErrors';
import './errors.css';

export function Errors() {
  const [logs, setLogs] = useState(() => Array.from({ length: 6 }, (_, i) => randomLog(i)));
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    let seq = 100;
    const id = setInterval(() => setLogs((l) => [randomLog(seq++), ...l].slice(0, 8)), 2200);
    return () => clearInterval(id);
  }, [paused]);
  const total = errorCodes.reduce((a, c) => a + c.count, 0);

  return (
    <>
      <p className="a-banner">
        아직 실제 데이터와 연결되지 않은 화면이에요. 오류 기록(Logflare)과 음성(LiveKit) 연결은 다음
        단계에서 붙일 예정이라 지금은 예시 값이에요.
      </p>
      <div className="a-grid g-2-1 a-errors-layout">
        <div className="a-errors-column">
          <div {...reveal(0)}>
            <div className="a-card">
              <div className="a-card-head">
                <div>
                  <h3>실시간 이벤트</h3>
                  <p className="a-cap">
                    Logflare로 들어오는 오류 이벤트 · 원본 메시지 없이 분류 코드만 저장
                  </p>
                </div>
                <button className="a-btn a-btn-ghost" onClick={() => setPaused((p) => !p)}>
                  {paused ? '다시 받기' : '일시 정지'}
                </button>
              </div>
              <div className="a-log">
                {logs.map((l) => (
                  <div className="a-log-row" key={l.id}>
                    <span>{l.time}</span>
                    <code>{l.event}</code>
                    <span>
                      {l.op} · {l.channel}채널
                    </span>
                    <span
                      className={`a-badge ${l.code === 'invalid_token' ? 'b-red' : l.code === 'permission_denied' ? 'b-amber' : 'b-blue'}`}
                    >
                      {l.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...reveal(1)}>
            <div className="a-card">
              <h3>오류 코드 (24시간)</h3>
              <p className="a-cap">총 {total}건</p>
              <div style={{ marginTop: 10 }}>
                {errorCodes.map((c, i) => (
                  <div
                    className="a-chan"
                    key={c.code}
                    style={{ gridTemplateColumns: '130px 1fr 44px' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <i style={{ width: 7, height: 7, borderRadius: 4, background: c.color }} />
                      {c.code}
                    </span>
                    <Meter ratio={c.count / errorCodes[0].count} i={i} />
                    <span>{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="a-errors-column">
          <div {...reveal(2)}>
            <div className="a-card">
              <h3>로그인 실패율</h3>
              <p className="a-cap">OAuth 설정이 깨지면 여기서 먼저 튀어요</p>
              {loginByProvider.map((p, i) => {
                const rate = (p.fail / (p.ok + p.fail)) * 100;
                return (
                  <div key={p.provider} style={{ marginTop: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                        marginBottom: 7,
                      }}
                    >
                      <span>{p.provider}</span>
                      <b>
                        <CountUp value={rate} format={(n) => n.toFixed(2) + '%'} />
                      </b>
                    </div>
                    <Meter ratio={rate / 5} i={i} hot={rate > 2.5} />
                  </div>
                );
              })}
            </div>
          </div>
          <div {...reveal(3)}>
            <div className="a-card">
              <h3>음성 (LiveKit)</h3>
              <p className="a-cap">토큰 발급과 열린 방</p>
              <div className="a-big" style={{ marginTop: 10 }}>
                <CountUp
                  value={(voice.tokenOk / (voice.tokenOk + voice.tokenFail)) * 100}
                  format={(n) => n.toFixed(1) + '%'}
                />
              </div>
              <p className="a-cap">토큰 발급 성공률</p>
              <div className="a-stat-rows">
                <div>
                  열린 방 <b>{voice.rooms}</b>
                </div>
                <div>
                  송출 중 공연자 <b>{voice.publishers}</b>
                </div>
                <div>
                  토큰 발급 실패 <b>{voice.tokenFail}</b>
                </div>
                <div>
                  마이크 권한 거부 <b style={{ color: 'var(--a-amber)' }}>{voice.micDenied}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
