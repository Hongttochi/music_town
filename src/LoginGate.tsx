import { ErrorModal } from './components/ui/ErrorModal';
import { Button } from './components/ui/Button';
import { Logo } from './Flaticon';
import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { MessageCircle, ArrowRight, LoaderCircle, Music2 } from 'lucide-react';
import { authConfigured, signIn, supabase } from './auth';
import './login.css';
import { LegalLinks } from './components/LegalLinks';

export type Account = {
  id: string;
  demo: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};
export function LoginGate({ children }: { children: (account: Account) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(authConfigured);
  const [introReady, setIntroReady] = useState(!authConfigured);
  useEffect(() => {
    const timer = window.setTimeout(() => setIntroReady(true), 750);
    return () => window.clearTimeout(timer);
  }, []);
  const [demo, setDemo] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => {
      setPending(null);
      setError('로그인 화면으로 이동하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
    }, 15000);
    const returned = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(null);
    };
    window.addEventListener('pageshow', returned);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', returned);
    };
  }, [pending]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        setChecking(false);
        setPending(null);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (!active) return;
        setSession(data.session);
        setChecking(false);
        if (failure) setError('로그인 정보를 확인하지 못했어요. 다시 시도해 주세요.');
      })
      .catch(() => {
        if (active) {
          setChecking(false);
          setError('로그인 서버에 연결하지 못했어요.');
        }
      });
    const callback = new URL(window.location.href);
    const hashParams = new URLSearchParams(callback.hash.slice(1));
    if (callback.searchParams.has('error') || hashParams.has('error')) {
      setError('로그인이 취소되었거나 권한을 받지 못했어요. 다시 시도해 주세요.');
      setPending(null);
      setChecking(false);
      callback.searchParams.delete('error');
      callback.searchParams.delete('error_description');
      callback.searchParams.delete('error_code');
      for (const key of ['error', 'error_description', 'error_code']) hashParams.delete(key);
      callback.hash = hashParams.toString();
      window.history.replaceState({}, '', callback.pathname + callback.search + callback.hash);
    }
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  async function login(provider: 'google' | 'kakao') {
    setError('');
    setPending(provider);
    try {
      await signIn(provider);
    } catch {
      setError('로그인을 시작하지 못했어요. 연결 설정을 확인하거나 잠시 후 다시 시도해 주세요.');
      setPending(null);
    }
  }
  const signOut = async () => {
    if (supabase && session) {
      const { error: failure } = await supabase.auth.signOut();
      if (failure) throw failure;
    }
    setSession(null);
    setDemo(false);
  };
  const deleteAccount = async () => {
    if (demo || !session || !supabase) throw new Error('로그인 후 이용해 주세요.');
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('다시 로그인한 뒤 탈퇴해 주세요.');
    const response = await fetch('/api/delete-account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: 'delete-my-account' }),
    });
    const result = await response.json();
    if (!response.ok || result.deleted !== true)
      throw new Error(result.error || '계정을 삭제하지 못했어요. 다시 시도해 주세요.');
    for (const suffix of ['avatar', 'profile', 'follow']) {
      try {
        localStorage.removeItem(`mt-${session.user.id}-${suffix}`);
      } catch {
        /* Storage is optional. */
      }
    }
    // The account no longer exists; clear this device's session even if revocation fails.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Account deletion already succeeded; do not report a second deletion failure.
    } finally {
      setSession(null);
      setDemo(false);
    }
  };
  if (checking || (session && !introReady))
    return (
      <main className="login-page login-simple login-arrival">
        <section className="arrival-content" role="status" aria-live="polite" aria-busy="true">
          <div className="login-brand-row">
            <Logo />
          </div>
          <div className="arrival-loader" aria-hidden="true">
            <LoaderCircle className="arrival-spinner" size={54} strokeWidth={1.5} />
            <Music2 className="arrival-note" size={19} strokeWidth={1.6} />
          </div>
          <h1>{session ? '공원으로 들어가는 중이에요' : '잠시만요, 입장을 준비하고 있어요'}</h1>
          <p>곧 새로운 음악을 만나요.</p>
          <div className="arrival-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </section>
      </main>
    );
  if (session || demo)
    return children({ id: session?.user.id ?? 'local-preview', demo, signOut, deleteAccount });
  return (
    <main className="login-page login-simple">
      <section className="login-simple-content" aria-label="MUSIC TOWN 로그인">
        <div className="login-brand-row">
          <Logo />
        </div>
        <p className="login-simple-tagline">산책하다 만나는, 새로운 음악.</p>
        <div className="login-simple-actions">
          <Button
            variant="secondary"
            className="social kakao"
            disabled={!authConfigured || pending !== null}
            onClick={() => login('kakao')}
          >
            <MessageCircle size={16} fill="currentColor" />
            {pending === 'kakao' ? '카카오로 이동 중…' : '카카오로 시작하기'}
          </Button>
          <Button
            variant="secondary"
            className="social google"
            disabled={!authConfigured || pending !== null}
            onClick={() => login('google')}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
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
            {pending === 'google' ? 'Google로 이동 중…' : 'Google로 시작하기'}
          </Button>
          {!authConfigured && <p className="notice">소셜 로그인 준비 중</p>}
          {import.meta.env.DEV && !authConfigured && (
            <Button className="preview-login" onClick={() => setDemo(true)}>
              미리 둘러보기 · 데모 <ArrowRight size={14} />
            </Button>
          )}
        </div>
        <LegalLinks />
      </section>
      {error && (
        <ErrorModal
          title={'\uB85C\uADF8\uC778\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694'}
          message={error}
          onClose={() => {
            setError('');
            setPending(null);
          }}
        />
      )}
    </main>
  );
}
