import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { reveal } from '../utils/reveal';
import { Tabs } from '../components/ui/Tabs';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorCard } from '../components/ui/ErrorCard';
import { Toast } from '../components/ui/Toast';
import { useAdminRpc } from '../hooks/useAdminRpc';
import { formatElapsed, formatClock } from '../utils/format';
import { AdminError, rpc, type Report, type ReportStatus } from '../services/adminRepository';
import './reports.css';

const reasons: Record<string, string> = {
  sexual: '성적 발언·성희롱',
  harassment: '괴롭힘·협박',
  hate: '욕설·혐오 표현',
  privacy: '개인정보 노출·사칭',
  disruption: '공연·이용 방해',
  other: '기타',
};
const statusLabel: Record<ReportStatus, [string, string]> = {
  pending: ['접수', 'b-amber'],
  reviewing: ['검토 중', 'b-blue'],
  resolved: ['조치 완료', 'b-green'],
  dismissed: ['반려', 'b-gray'],
};
type Tone = 'primary' | 'solid' | 'danger';
const actions: Record<string, { title: string; desc: string; label: string; tone: Tone }> = {
  reviewing: {
    title: '검토를 시작할까요?',
    desc: '상태가 ‘검토 중’으로 바뀌고 담당 운영자가 확인 중인 신고로 표시돼요.',
    label: '검토 시작',
    tone: 'primary',
  },
  resolved: {
    title: '조치 완료로 처리할까요?',
    desc: '필요한 조치를 마쳤을 때만 눌러 주세요. 처리한 뒤에는 되돌릴 수 없고, 90일 뒤 자동으로 파기돼요.',
    label: '조치 완료',
    tone: 'solid',
  },
  dismissed: {
    title: '이 신고를 반려할까요?',
    desc: '조치할 사유가 없다고 판단한 경우에만 반려해 주세요. 반려한 뒤에는 되돌릴 수 없고, 90일 뒤 자동으로 파기돼요.',
    label: '반려',
    tone: 'danger',
  },
};
const isOpen = (r: Report) => r.status === 'pending' || r.status === 'reviewing';
const ageMin = (r: Report) => (Date.now() - new Date(r.createdAt).getTime()) / 60000;

export function Reports() {
  const { data, error, reload } = useAdminRpc<Report[]>('admin_reports', undefined, 30000);
  const [list, setList] = useState<Report[]>([]);
  useEffect(() => {
    if (data) setList(data);
  }, [data]);
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [selId, setSelId] = useState<string | null>(null);
  const [ask, setAsk] = useState<ReportStatus | null>(null);
  const [lastAsk, setLastAsk] = useState<ReportStatus>('reviewing');
  // Remember the status at open time so the text does not change while the dialog fades out.
  const [from, setFrom] = useState<ReportStatus>('pending');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; stamp: number } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);
  const detailRef = useRef<HTMLDivElement>(null);
  const detailOpen = list.some((r) => r.id === selId);
  useEffect(() => {
    if (!detailOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    detailRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [detailOpen]);
  const closeDetail = () => {
    if (!ask && !busy) setSelId(null);
  };
  const cancel = useCallback(() => setAsk(null), []);

  if (!data) return <ErrorCard error={error} reload={reload} />;

  const open = list.filter(isOpen);
  const closed = list.filter((r) => !isOpen(r));
  const rows = tab === 'open' ? open : closed;
  const sel = list.find((r) => r.id === selId);

  const setStatus = (status: ReportStatus) => {
    if (!sel || busy) return;
    setLastAsk(status);
    setFrom(sel.status);
    setAsk(status);
  };
  const confirm = async () => {
    if (!ask || !sel || busy) return;
    setBusy(true);
    try {
      await rpc('admin_set_report_status', {
        report_id: sel.id,
        next_status: ask,
        expected_status: sel.status,
      });
      setList((l) => l.map((r) => (r.id === sel.id ? { ...r, status: ask } : r)));
      setSelId(sel.id);
      setAsk(null);
    } catch (e) {
      setAsk(null);
      setToast({
        text: e instanceof AdminError ? e.message : '바꾸지 못했어요.',
        stamp: Date.now(),
      });
      void reload();
    } finally {
      setBusy(false);
    }
  };
  const a = actions[lastAsk];

  return (
    <>
      {error && <p className="a-banner">{error.message}</p>}
      <div {...reveal(0)} inert={detailOpen}>
        <Tabs
          items={[
            { id: 'open', label: '처리할 신고', count: open.length },
            { id: 'closed', label: '처리 완료', count: closed.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="a-reports-list" inert={detailOpen}>
        <div {...reveal(1)}>
          <div className="a-card" style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th>번호</th>
                  <th>사유</th>
                  <th>대상</th>
                  <th>채널</th>
                  <th>경과</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === sel?.id ? 'sel' : ''}
                    onClick={() => setSelId(r.id)}
                    tabIndex={0}
                    aria-label={`신고 ${r.id} 상세 보기`}
                    aria-haspopup="dialog"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelId(r.id);
                      }
                    }}
                  >
                    <td>{r.id.length > 10 ? r.id.slice(0, 8) : r.id}</td>
                    <td>
                      <b>{reasons[r.reason] ?? r.reason}</b>
                    </td>
                    <td>{r.target}</td>
                    <td>{r.channel != null ? `${r.channel}채널` : '-'}</td>
                    <td
                      style={{
                        color: isOpen(r) && ageMin(r) > 60 ? 'var(--a-red)' : undefined,
                      }}
                    >
                      {formatElapsed(r.createdAt)}
                    </td>
                    <td>
                      <span className={`a-badge ${statusLabel[r.status][1]}`}>
                        {statusLabel[r.status][0]}
                      </span>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>
                      {tab === 'open' ? '처리할 신고가 없어요' : '처리한 신고가 없어요'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div {...reveal(2)}>
          <div className="a-card" style={{ marginTop: 0 }}>
            <div className="a-stat-rows a-report-stats" style={{ marginTop: 0 }}>
              <div>
                처리할 신고 <b>{open.length}건</b>
              </div>
              <div>
                1시간 넘게 대기{' '}
                <b style={{ color: 'var(--a-red)' }}>
                  {open.filter((r) => ageMin(r) > 60).length}건
                </b>
              </div>
              <div>
                7일 안에 자동 파기{' '}
                <b>
                  {
                    closed.filter(
                      (r) =>
                        r.retentionUntil &&
                        new Date(r.retentionUntil).getTime() - Date.now() < 7 * 86400000,
                    ).length
                  }
                  건
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {sel &&
        createPortal(
          <div className="a-report-overlay" onClick={closeDetail}>
            <div
              ref={detailRef}
              className="a-report-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="신고 상세"
              tabIndex={-1}
              inert={ask !== null}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeDetail();
                if (e.key === 'Tab') {
                  const buttons = Array.from(
                    e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
                  );
                  const first = buttons[0];
                  const last = buttons[buttons.length - 1];
                  if (
                    e.shiftKey &&
                    (document.activeElement === first || document.activeElement === e.currentTarget)
                  ) {
                    e.preventDefault();
                    last?.focus();
                  } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                  }
                }
              }}
            >
              <button
                className="a-btn a-btn-ghost a-report-close"
                aria-label="닫기"
                disabled={busy}
                onClick={closeDetail}
              >
                <X size={18} />
              </button>
              <div className="a-card a-detail" key={sel.id}>
                <div className="a-card-head">
                  <div>
                    <h3>신고 {sel.id.length > 10 ? sel.id.slice(0, 8) : sel.id}</h3>
                    <p className="a-cap">{formatClock(sel.createdAt)} 접수</p>
                  </div>
                  <span className={`a-badge ${statusLabel[sel.status][1]}`}>
                    {statusLabel[sel.status][0]}
                  </span>
                </div>
                <p>{sel.details}</p>
                <dl>
                  <dt>사유</dt>
                  <dd>{reasons[sel.reason] ?? sel.reason}</dd>
                  <dt>대상</dt>
                  <dd>
                    {sel.target}{' '}
                    {sel.targetTotal > 1 && (
                      <span className="a-badge b-red">누적 {sel.targetTotal}건</span>
                    )}
                  </dd>
                  <dt>신고자</dt>
                  <dd>{sel.reporter}</dd>
                  <dt>채널</dt>
                  <dd>{sel.channel != null ? `${sel.channel}채널` : '-'}</dd>
                </dl>
                <div className="a-actions" style={{ flexWrap: 'wrap' }}>
                  {sel.status === 'pending' && (
                    <button className="a-btn a-btn-primary" onClick={() => setStatus('reviewing')}>
                      검토 시작
                    </button>
                  )}
                  {sel.status === 'reviewing' && (
                    <>
                      <button className="a-btn a-btn-solid" onClick={() => setStatus('resolved')}>
                        <Check size={15} /> 조치 완료
                      </button>
                      <button className="a-btn a-btn-ghost" onClick={() => setStatus('dismissed')}>
                        <X size={15} /> 반려
                      </button>
                    </>
                  )}
                  {(sel.status === 'resolved' || sel.status === 'dismissed') && (
                    <p className="a-cap">처리가 끝난 신고는 바꿀 수 없어요.</p>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {toast && <Toast text={toast.text} stamp={toast.stamp} />}
      <ConfirmDialog
        open={ask !== null}
        title={a.title}
        confirmLabel={busy ? '처리 중…' : a.label}
        tone={a.tone}
        onConfirm={() => void confirm()}
        onCancel={cancel}
      >
        <p>{a.desc}</p>
        {sel && (
          <dl>
            <dt>신고 번호</dt>
            <dd>{sel.id.length > 10 ? sel.id.slice(0, 8) : sel.id}</dd>
            <dt>대상</dt>
            <dd>{sel.target}</dd>
            <dt>사유</dt>
            <dd>{reasons[sel.reason] ?? sel.reason}</dd>
            <dt>상태</dt>
            <dd>
              {statusLabel[from][0]} → {statusLabel[lastAsk][0]}
            </dd>
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}
