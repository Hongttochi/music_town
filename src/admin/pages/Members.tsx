import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { reveal } from '../utils/reveal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorCard } from '../components/ui/ErrorCard';
import { Toast } from '../components/ui/Toast';
import { useAdminRpc } from '../hooks/useAdminRpc';
import {
  AdminError,
  rpc,
  type AdminRole,
  type Member,
  type Whoami,
} from '../services/adminRepository';
import './members.css';

const roleLabel: Record<AdminRole, [string, string]> = {
  master: ['마스터', 'b-amber'],
  admin: ['관리자', 'b-blue'],
};
const providerLabel: Record<string, string> = { google: 'Google', kakao: 'Kakao' };
const formatDay = (iso: string | null) => (iso ? iso.slice(0, 10).replaceAll('-', '.') : '-');

export function Members() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  // Wait for a short pause in typing before asking the server.
  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);
  const { data, error, reload } = useAdminRpc<Member[]>('admin_members_list', { search });
  const me = useAdminRpc<Whoami>('admin_whoami').data;
  const isMaster = me?.role === 'master';
  const [list, setList] = useState<Member[]>([]);
  useEffect(() => {
    if (data) setList(data);
  }, [data]);
  const [ask, setAsk] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; stamp: number } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);
  const cancel = useCallback(() => setAsk(null), []);

  if (!data && !list.length) return <ErrorCard error={error} reload={reload} />;

  const granting = ask?.role !== 'admin';
  const confirm = async () => {
    if (!ask || busy) return;
    setBusy(true);
    try {
      const next = await rpc<{ id: string; role: AdminRole | null }>('admin_set_admin', {
        target_user: ask.id,
        make_admin: granting,
      });
      setList((l) => l.map((m) => (m.id === next.id ? { ...m, role: next.role } : m)));
      setToast({
        text: granting
          ? `${ask.name}님을 관리자로 지정했어요.`
          : `${ask.name}님의 관리자 권한을 해제했어요.`,
        stamp: Date.now(),
      });
    } catch (e) {
      setToast({
        text: e instanceof AdminError ? e.message : '바꾸지 못했어요.',
        stamp: Date.now(),
      });
      void reload();
    } finally {
      setAsk(null);
      setBusy(false);
    }
  };
  const admins = list.filter((m) => m.role).length;

  return (
    <>
      {error && <p className="a-banner">{error.message}</p>}
      {me && !isMaster && (
        <p className="a-banner">관리자 지정과 해제는 마스터 관리자만 할 수 있어요.</p>
      )}
      <div {...reveal(0)} className="a-members-bar rv">
        <label className="a-members-search">
          <Search size={15} />
          <input
            value={query}
            placeholder="캐릭터 이름으로 찾기"
            aria-label="회원 검색"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="a-cap">
          {search ? `검색 결과 ${list.length}명` : `최근 가입 ${list.length}명`} · 관리자 {admins}명
        </p>
      </div>
      <div {...reveal(1)}>
        <div className="a-card" style={{ overflowX: 'auto' }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>로그인</th>
                <th>가입일</th>
                <th>최근 방문</th>
                <th>권한</th>
                <th aria-label="관리" />
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>
                    <b>{m.name}</b>
                    {m.id === me?.userId && <span className="a-members-me">나</span>}
                  </td>
                  <td>{m.provider ? (providerLabel[m.provider] ?? m.provider) : '-'}</td>
                  <td>{formatDay(m.joinedAt)}</td>
                  <td>{formatDay(m.lastVisit)}</td>
                  <td>
                    {m.role ? (
                      <span className={`a-badge ${roleLabel[m.role][1]}`}>
                        {roleLabel[m.role][0]}
                      </span>
                    ) : (
                      <span className="a-members-none">일반</span>
                    )}
                  </td>
                  <td className="a-members-action">
                    {isMaster && m.id !== me?.userId && m.role !== 'master' && (
                      <button
                        className={`a-btn ${m.role === 'admin' ? 'a-btn-ghost' : 'a-btn-primary'}`}
                        onClick={() => setAsk(m)}
                      >
                        {m.role === 'admin' ? '관리자 해제' : '관리자로 지정'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>
                    {search ? '찾는 회원이 없어요' : '아직 가입한 회원이 없어요'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="a-cap a-members-note">
          마스터 관리자는 서버 환경 변수 ADMIN_EMAILS로만 정해지고, 여기서 바꿀 수 없어요.
        </p>
      </div>

      {toast && <Toast text={toast.text} stamp={toast.stamp} />}
      <ConfirmDialog
        open={ask !== null}
        title={granting ? '관리자로 지정할까요?' : '관리자 권한을 해제할까요?'}
        confirmLabel={busy ? '처리 중…' : granting ? '관리자로 지정' : '권한 해제'}
        tone={granting ? 'primary' : 'danger'}
        onConfirm={() => void confirm()}
        onCancel={cancel}
      >
        <p>
          {granting
            ? '운영실의 모든 화면을 보고 신고와 공지를 처리할 수 있게 돼요.'
            : '바로 운영실에 들어올 수 없게 돼요.'}
        </p>
        {ask && (
          <dl>
            <dt>이름</dt>
            <dd>{ask.name}</dd>
            <dt>로그인</dt>
            <dd>{ask.provider ? (providerLabel[ask.provider] ?? ask.provider) : '-'}</dd>
            <dt>가입일</dt>
            <dd>{formatDay(ask.joinedAt)}</dd>
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}
