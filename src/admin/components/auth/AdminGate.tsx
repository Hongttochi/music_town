import { useEffect, useState, type ReactNode } from 'react';
import { Copy, LogIn, LogOut, Music } from 'lucide-react';
import { signIn, supabase } from '../../../services/auth';
import { AdminError, demoMode, rpc } from '../../services/adminRepository';
import './admin-gate.css';

type State =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'denied'; userId: string }
  | { kind: 'error'; message: string }
  | { kind: 'ok' };

// Shows the console only to signed-in admins. Without Supabase settings it opens in demo mode.
export function AdminGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(demoMode ? { kind: 'ok' } : { kind: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (demoMode || !supabase) return;
    const check = async (signedIn: boolean) => {
      if (!signedIn) return setState({ kind: 'signedOut' });
      try {
        const me = await rpc<{ userId: string; admin: boolean }>('admin_whoami');
        setState(me.admin ? { kind: 'ok' } : { kind: 'denied', userId: me.userId });
      } catch (e) {
        setState({
          kind: 'error',
          message: e instanceof AdminError ? e.message : '확인하지 못했어요.',
        });
      }
    };
    void supabase.auth.getSession().then(({ data }) => check(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void check(!!session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (state.kind === 'ok') return <>{children}</>;

  const login = async (provider: 'google' | 'kakao') => {
    setBusy(true);
    try {
      await signIn(provider, '/admin/');
    } catch {
      setBusy(false);
      setState({ kind: 'error', message: '로그인을 시작하지 못했어요.' });
    }
  };
  const logout = () => void supabase?.auth.signOut();

  return (
    <div className="a-stage a-gate">
      <div className="a-gate-card">
        <div className="a-logo">
          <Music size={20} color="#fff" />
        </div>
        <h1>MUSIC TOWN 운영실</h1>
        {state.kind === 'loading' && <p>로그인 상태를 확인하고 있어요…</p>}
        {state.kind === 'signedOut' && (
          <>
            <p>관리자로 지정된 계정으로 로그인해 주세요.</p>
            <div className="a-gate-actions">
              <button
                className="a-btn a-btn-primary"
                disabled={busy}
                onClick={() => login('google')}
              >
                <LogIn size={15} /> Google로 로그인
              </button>
              <button className="a-btn a-btn-ghost" disabled={busy} onClick={() => login('kakao')}>
                <LogIn size={15} /> Kakao로 로그인
              </button>
            </div>
          </>
        )}
        {state.kind === 'denied' && (
          <>
            <p>이 계정에는 관리자 권한이 없어요. 운영자가 아래 ID를 관리자 명단에 추가해야 해요.</p>
            <code className="a-gate-id">{state.userId}</code>
            <div className="a-gate-actions">
              <button
                className="a-btn a-btn-ghost"
                onClick={() => void navigator.clipboard?.writeText(state.userId)}
              >
                <Copy size={14} /> ID 복사
              </button>
              <button className="a-btn a-btn-ghost" onClick={logout}>
                <LogOut size={14} /> 로그아웃
              </button>
            </div>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <p>{state.message}</p>
            <div className="a-gate-actions">
              <button className="a-btn a-btn-primary" onClick={() => location.reload()}>
                다시 시도
              </button>
              <button className="a-btn a-btn-ghost" onClick={logout}>
                <LogOut size={14} /> 로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
