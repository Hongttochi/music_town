import { useCallback, useEffect, useRef, useState } from 'react';
import { Meter } from '../components/charts/Meter';
import { demoMode } from '../services/adminRepository';
import { loadMonitoring, type Monitoring } from '../services/monitoring';
import { formatClock } from '../utils/format';
import './errors.css';

export function Errors() {
  const [data, setData] = useState<Monitoring | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    if (demoMode || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const next = await loadMonitoring(
        AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
      );
      if (!controller.signal.aborted) {
        setData(next);
        setError(null);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : '모니터링 조회에 실패했어요.');
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    if (paused) setLoading(false);
    if (!paused) void reload();
    const id = paused
      ? undefined
      : setInterval(() => {
          if (document.visibilityState === 'visible') void reload();
        }, 30000);
    return () => {
      clearInterval(id);
      request.current?.abort();
      request.current = null;
    };
  }, [paused, reload]);
  const logs = data?.logs.status === 'ok' ? data.logs : null;
  const voice = data?.voice.status === 'ok' ? data.voice : null;
  const logMessage =
    error && !data
      ? 'ERROR_LOAD'
      : demoMode
        ? 'DEMO_LOGS'
        : data?.logs.status === 'not_configured'
          ? 'SETUP_LOGS'
          : data?.logs.status === 'error'
            ? 'ERROR_LOGS'
            : 'LOADING';
  const voiceMessage =
    error && !data
      ? 'ERROR_LOAD'
      : demoMode
        ? 'DEMO_VOICE'
        : data?.voice.status === 'not_configured'
          ? 'SETUP_VOICE'
          : data?.voice.status === 'error'
            ? 'ERROR_VOICE'
            : 'LOADING';
  const total = logs?.errorCodes.reduce((n, c) => n + c.count, 0) ?? 0;
  return (
    <>
      <div className="a-monitor-toolbar">
        <p className="a-cap">
          {data ? `마지막 확인 ${formatClock(data.checkedAt)} · 30초마다 갱신` : '30초마다 갱신'}
        </p>
        <div className="a-actions">
          <button
            className="a-btn a-btn-ghost"
            disabled={demoMode}
            onClick={() => setPaused(!paused)}
          >
            {paused ? '다시 받기' : '일시 정지'}
          </button>
          <button
            className="a-btn a-btn-ghost"
            disabled={demoMode || loading}
            onClick={() => void reload()}
          >
            {loading ? '불러오는 중…' : '새로고침'}
          </button>
        </div>
      </div>
      {demoMode && (
        <p className="a-banner">
          데모에서는 외부 모니터링을 조회하지 않아요. 실제 운영실에 로그인하면 연결 상태를 확인할 수
          있어요.
        </p>
      )}
      {error && (
        <p className="a-banner" role="alert">
          {error} {data ? '마지막으로 불러온 값을 표시하고 있어요.' : ''}
        </p>
      )}
      <div className="a-grid g-2-1 a-errors-layout">
        <div className="a-errors-column">
          <div>
            <div className="a-card">
              <div className="a-card-head">
                <div>
                  <h3>최근 오류 이벤트</h3>
                  <p className="a-cap">
                    Logflare · 최근 24시간 중 최대 50건 · 원본 메시지는 표시하지 않아요
                  </p>
                </div>
              </div>
              {!logs ? (
                <p className="a-empty">{messages[logMessage]}</p>
              ) : (
                <div className="a-log">
                  {!logs.logs.length && <p className="a-empty">수집된 오류가 없어요.</p>}
                  {logs.logs.map((l, i) => (
                    <div className="a-log-row" key={`${l.at}-${i}`}>
                      <span>{formatClock(l.at)}</span>
                      <code>{l.event}</code>
                      <span>
                        {l.operation ?? '-'}
                        {l.channel !== null ? ` / ${l.channel}` : ''}
                      </span>
                      <span className="a-badge b-blue">{l.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="a-card">
              <h3>오류 코드</h3>
              {!logs ? (
                <p className="a-empty">{messages[logMessage]}</p>
              ) : (
                <>
                  <p className="a-cap">
                    최근 24시간 수집 이벤트 {logs.sampleSize}건 중 오류 {total}건
                    {logs.sampled ? ' · 최근 1,000건 표본으로 전체 수치와 다를 수 있어요' : ''}
                  </p>
                  {!logs.errorCodes.length && <p className="a-empty">수집된 오류가 없어요.</p>}
                  {logs.errorCodes.map((c, i) => (
                    <div className="a-chan a-error-meter" key={c.code}>
                      <span>{c.code}</span>
                      <Meter ratio={c.count / Math.max(1, logs.errorCodes[0].count)} i={i} />
                      <span>{c.count}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="a-errors-column">
          <div>
            <div className="a-card">
              <h3>로그인·마이크 이벤트</h3>
              <p className="a-cap">조회된 브라우저 이벤트 기준 · 전송 누락이 있을 수 있어요</p>
              {!logs ? (
                <p className="a-empty">{messages[logMessage]}</p>
              ) : (
                <div className="a-stat-rows">
                  <div>
                    로그인 성공 <b>{logs.loginOk}</b>
                  </div>
                  <div>
                    로그인 실패 <b>{logs.loginFail}</b>
                  </div>
                  <div>
                    음성 권한 거부 <b>{logs.micDenied}</b>
                  </div>
                </div>
              )}
              <p className="a-cap a-monitor-note">제공자별 로그인 실패율은 아직 집계하지 않아요.</p>
            </div>
          </div>
          <div>
            <div className="a-card">
              <h3>음성 (LiveKit)</h3>
              <p className="a-cap">마을 공연 방의 현재 연결 현황</p>
              {!voice ? (
                <p className="a-empty">{messages[voiceMessage]}</p>
              ) : (
                <>
                  <span className="a-badge b-green">조회 연결 정상</span>
                  <div className="a-stat-rows">
                    <div>
                      열린 방 <b>{voice.rooms}</b>
                    </div>
                    <div>
                      연결된 참여자 <b>{voice.participants}</b>
                    </div>
                    <div>
                      미디어 발행 참여자 <b>{voice.publishers}</b>
                    </div>
                  </div>
                </>
              )}
              <p className="a-cap a-monitor-note">
                토큰 발급 성공률은 아직 집계하지 않아요. 방 조회 성공은 실제 음질을 보장하지 않아요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
const messages: Record<string, string> = {
  ERROR_LOAD: '데이터를 확인하지 못했어요. 새로고침으로 다시 시도해 주세요.',
  LOADING: '모니터링 데이터를 기다리고 있어요.',
  DEMO_LOGS: '실제 로그인 후 오류 기록을 확인할 수 있어요.',
  DEMO_VOICE: '실제 로그인 후 음성 연결을 확인할 수 있어요.',
  SETUP_LOGS: 'Logflare 조회 연결이 아직 설정되지 않았어요.',
  SETUP_VOICE: 'LiveKit 연결이 아직 설정되지 않았어요.',
  ERROR_LOGS: 'Logflare 조회에 실패했어요. 조회 권한과 연결 설정을 확인해 주세요.',
  ERROR_VOICE: 'LiveKit 조회에 실패했어요. 잠시 후 다시 확인해 주세요.',
};
