import './legal-links.css';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../auth';
import {
  CONSENT_TEXT,
  CONSENT_VERSION,
  CONSENT_DOCUMENTS,
} from '../../server/admission-policy.mjs';
import { Button } from './ui/Button';
import { Logo } from '../Flaticon';
import './admission-gate.css';

type Status = { admitted: boolean; approved: boolean; pending?: boolean; ageGroup?: string | null };
async function admission(action: string, values: Record<string, unknown> = {}) {
  const session = supabase ? await supabase.auth.getSession() : null;
  const token = session?.data.session?.access_token;
  const response = await fetch('/api/admission', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, version: CONSENT_VERSION, ...values }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '동의 확인 서비스에 연결하지 못했습니다.');
  return result;
}

export function AdmissionGate({ children }: { children: ReactNode }) {
  return import.meta.env.VITE_GUARDIAN_CONSENT_ENABLED === 'true' ? (
    <EnabledAdmissionGate>{children}</EnabledAdmissionGate>
  ) : (
    children
  );
}

export function EnabledAdmissionGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [terms, setTerms] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [guardianTerms, setGuardianTerms] = useState(false);
  const [relationship, setRelationship] = useState('parent');
  const refresh = async () => setStatus(await admission('status'));
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const callback = new URL(window.location.href);
        if (callback.searchParams.get('guardianCallback') === '1') {
          const failed = callback.searchParams.has('code');
          for (const key of [
            'guardianCallback',
            'identityVerificationId',
            'code',
            'message',
            'pgCode',
            'pgMessage',
          ])
            callback.searchParams.delete(key);
          window.history.replaceState({}, '', callback.pathname + callback.search + callback.hash);
          if (failed) {
            if (active) setError('보호자 본인확인이 완료되지 않았습니다. 다시 진행해 주세요.');
          } else await admission('confirmGuardian');
        }
        const next = await admission('status');
        if (active) setStatus(next);
      } catch (failure) {
        if (active) {
          setError((failure as Error).message);
          setStatus({ admitted: false, approved: false });
        }
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const check = () => {
      void admission('status')
        .then((next) => {
          if (active) setStatus(next);
        })
        .catch(() => {
          if (active) {
            setStatus({ admitted: false, approved: false });
            setError('이용 동의를 다시 확인해 주세요.');
          }
        });
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      window.setTimeout(() => {
        if (active) check();
      }, 0);
    });
    const timer = window.setInterval(check, 60_000);
    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearInterval(timer);
    };
  }, []);
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (status?.admitted || status?.approved) return children;
  const needsGuardian = status?.pending && status.ageGroup === 'under14';
  return (
    <main className="login-page login-simple admission-page">
      <section className="admission-content" aria-busy={busy || !status}>
        <Logo />
        {!status ? (
          <p role="status">이용 동의 정보를 확인하고 있습니다.</p>
        ) : needsGuardian ? (
          <>
            <h1>보호자와 함께 확인해 주세요</h1>
            <p>
              만 14세 미만 이용자는 부모님 또는 법정대리인의 동의와 본인확인이 필요합니다.
              보호자에게 이 화면을 보여 주세요.
            </p>
            <div
              className="guardian-disclosure"
              role="region"
              aria-label="법정대리인 동의 내용"
              tabIndex={0}
            >
              <h2>법정대리인 동의</h2>
              <p>{CONSENT_TEXT}</p>
              <small>동의 문서 버전: {CONSENT_VERSION}</small>
            </div>
            <label className="guardian-relationship">
              아동과의 관계
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                disabled={busy}
              >
                <option value="parent">부모</option>
                <option value="legal_guardian">그 밖의 법정대리인</option>
              </select>
            </label>
            <label className="admission-check">
              <input
                type="checkbox"
                checked={guardian}
                onChange={(e) => setGuardian(e.target.checked)}
                disabled={busy}
              />
              본인은 이 아동의 법정대리인이며, 아동의 서비스 이용을 위한 동의 절차를 직접
              진행합니다.
            </label>
            <label className="admission-check">
              <input
                type="checkbox"
                checked={privacy}
                onChange={(e) => setPrivacy(e.target.checked)}
                disabled={busy}
              />
              [필수] 위 개인정보 수집·이용 및 공개 범위에 동의합니다.
            </label>
            <label className="admission-check">
              <input
                type="checkbox"
                checked={guardianTerms}
                onChange={(e) => setGuardianTerms(e.target.checked)}
                disabled={busy}
              />
              [필수] 아동의 이용약관 동의와 서비스 이용을 승인합니다.
            </label>
            <Button
              variant="primary"
              disabled={busy || !guardian || !privacy || !guardianTerms}
              onClick={() =>
                void run(async () => {
                  const config = await admission('beginGuardian', {
                    isLegalGuardian: guardian,
                    acceptedPrivacy: privacy,
                    acceptedTerms: guardianTerms,
                    relationship,
                  });
                  const PortOne = await import('@portone/browser-sdk/v2');
                  const result = await PortOne.requestIdentityVerification({
                    storeId: config.storeId,
                    channelKey: config.channelKey,
                    identityVerificationId: config.identityVerificationId,
                    redirectUrl: config.redirectUrl,
                    forceRedirect: true,
                  });
                  if (result?.code)
                    throw new Error('보호자 본인확인이 완료되지 않았습니다. 다시 시도해 주세요.');
                  // The browser result is only a prompt to query the provider from our server.
                  await admission('confirmGuardian');
                  await refresh();
                })
              }
            >
              {busy ? '본인확인 연결 중…' : '보호자 명의로 본인확인'}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void run(refresh)}>
              동의 상태 다시 확인
            </Button>
          </>
        ) : (
          <>
            <h1>이용 연령을 확인해 주세요</h1>
            <p>
              만 14세 미만 이용자의 보호자 동의 여부를 확인하기 위해 사용합니다. 입력한 생년월일
              원문은 서비스 DB에 저장하지 않습니다.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await admission('start', { birthDate, acceptedTerms: terms });
                  await refresh();
                });
              }}
            >
              <label className="admission-birth">
                생년월일
                <input
                  type="date"
                  required
                  min="1900-01-01"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="admission-check">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  disabled={busy}
                />
                [필수] 이용약관과 개인정보 처리 안내를 확인했습니다. 만 14세 미만은 보호자가 동의
                절차를 진행합니다.
              </label>
              <Button type="submit" variant="primary" disabled={busy || !birthDate || !terms}>
                {busy ? '확인 중…' : '다음'}
              </Button>
            </form>
            <Button variant="secondary" disabled={busy} onClick={() => void run(refresh)}>
              다시 확인
            </Button>
          </>
        )}
        {error && (
          <p className="admission-error" role="alert">
            {error}
          </p>
        )}
        <nav className="legal-links" aria-label="동의 문서">
          <a href={CONSENT_DOCUMENTS.terms.url} target="_blank" rel="noopener noreferrer">
            이용약관
          </a>
          <a href={CONSENT_DOCUMENTS.privacy.url} target="_blank" rel="noopener noreferrer">
            개인정보 처리 안내
          </a>
        </nav>
      </section>
    </main>
  );
}
