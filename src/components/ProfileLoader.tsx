import { useEffect, useState, type ReactNode } from 'react';
import type { Account } from '../LoginGate';
import { loadProfile, type SavedProfile } from '../profileRepository';
import { Button } from './ui/Button';
import { ErrorModal } from './ui/ErrorModal';
import { Logo } from '../Flaticon';
import { LoaderCircle, Music2 } from 'lucide-react';

export function ProfileLoader({
  account,
  children,
}: {
  account: Account;
  children: (data: SavedProfile | null) => ReactNode;
}) {
  const [data, setData] = useState<SavedProfile | null>(null);
  const [loading, setLoading] = useState(!account.demo);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (account.demo) return;
    let active = true;
    setLoading(true);
    setError('');
    setDismissed(false);
    loadProfile(account.id)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [account.id, account.demo, attempt]);
  if (loading || error)
    return (
      <main className="login-page login-simple login-arrival profile-loading-page">
        <section className="arrival-content" role="status" aria-live="polite" aria-busy={loading}>
          <div className="login-brand-row">
            <Logo />
          </div>
          {loading ? (
            <>
              <div className="arrival-loader" aria-hidden="true">
                <LoaderCircle className="arrival-spinner" size={54} strokeWidth={1.5} />
                <Music2 className="arrival-note" size={19} strokeWidth={1.6} />
              </div>
              <h1>나의 프로필을 불러오고 있어요</h1>
              <p>나의 모습과 이야기를 준비하고 있어요.</p>
              <div className="arrival-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </>
          ) : (
            <Button style={{ marginTop: 24 }} onClick={() => setAttempt(attempt + 1)}>
              프로필 다시 불러오기
            </Button>
          )}
        </section>
        {error && !dismissed && (
          <ErrorModal
            title="프로필을 불러오지 못했어요"
            message={error}
            onClose={() => setDismissed(true)}
            onRetry={() => setAttempt(attempt + 1)}
          />
        )}
      </main>
    );
  return children(data);
}
