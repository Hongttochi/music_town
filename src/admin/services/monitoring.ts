import { supabase } from './adminAuth';

type Unavailable = { status: 'not_configured' | 'error'; reason: string };
export type Monitoring = {
  checkedAt: string;
  logs:
    | Unavailable
    | {
        status: 'ok';
        from: string;
        sampled: boolean;
        sampleSize: number;
        logs: {
          at: string;
          event: string;
          code: string;
          operation: string | null;
          channel: number | null;
        }[];
        errorCodes: { code: string; count: number }[];
        loginOk: number;
        loginFail: number;
        micDenied: number;
      };
  voice: Unavailable | { status: 'ok'; rooms: number; participants: number; publishers: number };
};

export async function loadMonitoring(signal: AbortSignal): Promise<Monitoring> {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error('운영실에 다시 로그인해 주세요.');
  const response = await fetch('/api/admin-monitoring', {
    headers: { Authorization: `Bearer ${token}` },
    signal,
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('운영실에 다시 로그인해 주세요.');
    if (response.status === 403) throw new Error('관리자 권한이 필요해요.');
    throw new Error('모니터링 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return response.json();
}
