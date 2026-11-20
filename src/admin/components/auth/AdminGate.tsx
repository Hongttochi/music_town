import { useEffect, useState, type ReactNode } from 'react';
import { Copy, LogOut } from 'lucide-react';
import { signIn, supabase } from '../../services/adminAuth';
import {
  AdminError,
  demoMode,
  rpc,
  syncAdminRole,
  type Whoami,
} from '../../services/adminRepository';
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
    if (!demoMode) return;
    const exit = () => setState({ kind: 'signedOut' });
    window.addEventListener('admin-demo-exit', exit);
    return () => window.removeEventListener('admin-demo-exit', exit);
  }, []);

  useEffect(() => {
    if (demoMode || !supabase) return;
    const check = async (signedIn: boolean) => {
      if (!signedIn) return setState({ kind: 'signedOut' });
      try {
        await syncAdminRole();
        const me = await rpc<Whoami>('admin_whoami');
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
    // A master's database grant lasts two hours; refresh it while the console stays open.
    const refresh = setInterval(() => void syncAdminRole(), 30 * 60 * 1000);
    return () => {
      data.subscription.unsubscribe();
      clearInterval(refresh);
    };
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
  const logout = () => void supabase?.auth.signOut({ scope: 'local' });

  return (
    <div className="a-stage a-gate">
      <div className="a-gate-card">
        <div className="a-gate-brand">
          <img src="/art/busking-town-logo.png" alt="MUSIC TOWN" />
        </div>
        <h1>운영실 로그인</h1>
        {state.kind === 'loading' && <p>로그인 상태를 확인하고 있어요…</p>}
        {state.kind === 'signedOut' && (
          <>
            <p>관리자로 지정된 계정으로 로그인해 주세요.</p>
            <div className="a-gate-actions a-gate-social">
              <button
                className="a-btn a-gate-google"
                disabled={busy || demoMode}
                onClick={() => login('google')}
              >
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.43h11a9.4 9.4 0 0 1-4.08 6.17v5h6.6c3.86-3.55 6.09-8.78 6.09-14.68Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44c5.51 0 10.13-1.83 13.51-4.86l-6.6-5c-1.83 1.23-4.18 1.96-6.91 1.96-5.32 0-9.83-3.59-11.44-8.42H5.74v5.16A20 20 0 0 0 24 44Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.56 27.68a12 12 0 0 1 0-7.36v-5.16H5.74a20 20 0 0 0 0 17.68Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 11.9c3 0 5.69 1.03 7.81 3.05l5.86-5.86A19.6 19.6 0 0 0 24 4 20 20 0 0 0 5.74 15.16l6.82 5.16C14.17 15.49 18.68 11.9 24 11.9Z"
                  />
                </svg>
                Google로 로그인
              </button>
              <button
                className="a-btn a-gate-kakao"
                disabled={busy || demoMode}
                onClick={() => login('kakao')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 3C6.48 3 2 6.47 2 10.75c0 2.75 1.85 5.16 4.63 6.54l-1.18 4.06a.3.3 0 0 0 .46.33l4.73-3.21c.45.05.9.08 1.36.08 5.52 0 10-3.49 10-7.8S17.52 3 12 3Z"
                  />
                </svg>
                카카오로 로그인
              </button>
            </div>
            {demoMode && (
              <div className="a-gate-demo">
                <p>미리보기에서는 소셜 로그인을 사용할 수 없어요.</p>
                <button className="a-gate-preview" onClick={() => setState({ kind: 'ok' })}>
                  데모 둘러보기 <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </>
        )}
        {state.kind === 'denied' && (
          <>
            <p>
              이 계정에는 관리자 권한이 없어요. 마스터 관리자에게 회원 관리에서 관리자로 지정해
              달라고 요청해 주세요.
            </p>
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
