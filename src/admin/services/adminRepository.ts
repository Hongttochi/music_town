import { authConfigured, supabase } from './adminAuth';
import { errorCode, logEvent } from '../../services/telemetry';
import { demoResponse } from '../data/demoResponses';

// Without Supabase settings (e.g. local development) the console runs on demo data of the same shape.
export const demoMode = !authConfigured;

export type Channel = { id: number; name: string; capacity: number; count: number };
export type Overview = {
  now: string;
  online: number;
  stale: number;
  performing: number;
  queued: number;
  openReports: number;
  todayVisitors: number;
  todayShows: number;
  todaySignups: number;
  channels: Channel[];
  days: { day: string; visitors: number; onlineSeconds: number; stageSeconds: number }[];
};
export type Live = {
  now: string;
  channels: Channel[];
  stages: { id: number; name: string }[];
  performances: {
    channel: number;
    stage: number;
    userId: string;
    name: string;
    startedAt: string;
    endsAt: string;
  }[];
  queue: { channel: number; stage: number; count: number }[];
};
export type Shows = {
  stageSeconds: number;
  performers: number;
  newFollows: number;
  newHearts: number;
  shows: number;
  avgSeconds: number;
  earlyEnds: number;
  finished: number;
  musicians: {
    userId: string;
    name: string;
    stageSeconds: number;
    followers: number;
    hearts: number;
  }[];
};
export type FunnelStep = { label: string; value: number; last: number };
export type Funnel = { days: number; provider: string | null; steps: FunnelStep[] };
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type Report = {
  id: string;
  createdAt: string;
  reason: string;
  details: string;
  status: ReportStatus;
  channel: number | null;
  targetId: string | null;
  target: string;
  reporter: string;
  targetTotal: number;
  retentionUntil: string | null;
};
export type NoticeStatus = 'draft' | 'published' | 'hidden';
export type Notice = {
  id: string;
  label: string;
  title: string;
  body: string;
  status: NoticeStatus;
  updatedAt: string;
};

export type Embed = { id: string; title: string; url: string };
export type AdminRole = 'master' | 'admin';
export type Whoami = { userId: string; admin: boolean; role: AdminRole | null };
export type Member = {
  id: string;
  name: string;
  provider: string | null;
  joinedAt: string;
  lastVisit: string | null;
  role: AdminRole | null;
};

const messages: Record<string, string> = {
  ADMIN_REQUIRED: '관리자 권한이 없어요.',
  AUTH_REQUIRED: '로그인이 필요해요.',
  REPORT_CHANGED: '다른 운영자가 먼저 상태를 바꿨어요. 목록을 새로 불러왔어요.',
  REPORT_NOT_FOUND: '신고를 찾을 수 없어요.',
  INVALID_TRANSITION: '지금 상태에서는 그렇게 바꿀 수 없어요.',
  BLANK_DRAFT_EXISTS: '아직 비어 있는 공지가 있어요. 그 공지부터 써 주세요.',
  NOTICE_NOT_FOUND: '공지를 찾을 수 없어요. 이미 삭제됐을 수 있어요.',
  INVALID_RANGE: '기간이 올바르지 않아요.',
  MASTER_REQUIRED: '관리자 지정은 마스터 관리자만 할 수 있어요.',
  MASTER_LOCKED: '마스터 관리자는 서버 설정(ADMIN_EMAILS)에서만 바꿀 수 있어요.',
  SELF_CHANGE: '내 권한은 직접 바꿀 수 없어요.',
  MEMBER_NOT_FOUND: '회원을 찾을 수 없어요. 탈퇴했을 수 있어요.',
};
export class AdminError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function toError(raw: { message?: string; code?: string } | null): AdminError {
  const text = raw?.message ?? '';
  const code = Object.keys(messages).find((k) => text.includes(k));
  if (code) return new AdminError(code, messages[code]);
  // A missing function means the migration has not been applied yet.
  if (raw?.code === 'PGRST202' || /could not find the function/i.test(text))
    return new AdminError(
      'NOT_MIGRATED',
      'DB에 운영실 함수가 없어요. 202611150003_admin_console.sql을 적용해 주세요.',
    );
  if (/check constraint/i.test(text)) return new AdminError('INVALID', '입력값을 확인해 주세요.');
  return new AdminError('NETWORK', '데이터를 불러오지 못했어요. 연결을 확인해 주세요.');
}

export async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (demoMode) {
    try {
      return (await demoResponse(name, args)) as T;
    } catch (e) {
      throw toError({ message: (e as Error).message });
    }
  }
  const { data, error } = await supabase!.rpc(name, args);
  if (error) {
    logEvent('api_failed', { operation: name, code: errorCode(error) });
    throw toError(error);
  }
  return data as T;
}

// Lets the server mirror a master admin (ADMIN_EMAILS) into the database before console calls.
// Failures are ignored: the database role check stays the source of truth.
export async function syncAdminRole() {
  if (demoMode || !supabase) return;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  await fetch('/api/admin-role', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => undefined);
}
