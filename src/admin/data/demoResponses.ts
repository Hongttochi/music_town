// Demo responses used without Supabase settings. Same shapes and rules as the real RPCs
// in supabase/migrations/202611150003_admin_console.sql.
import { notices as seed } from '../../data/notices';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const channels = [
  { id: 1, name: '1채널', capacity: 40, count: 18 },
  { id: 2, name: '2채널', capacity: 40, count: 24 },
  { id: 3, name: '3채널', capacity: 40, count: 12 },
  { id: 4, name: '4채널', capacity: 40, count: 37 },
  { id: 5, name: '5채널', capacity: 40, count: 9 },
];
const stages = [
  '느티나무 아래',
  '분수 옆 작은 무대',
  '꽃길 모퉁이',
  '연못가 쉼터',
  '잔디 언덕',
  '다리 건너 강바람 무대',
  '문나잇 바 무대',
].map((name, id) => ({ id, name }));
const performers = ['서우', '윤슬', '오후네시', '달무리', '버들', '해밀', '라온', '노을빛'];
const started = Date.now();
const performances = channels.flatMap((c) =>
  stages
    .filter((s) => (s.id + c.id) % 3 !== 0)
    .map((s, i) => ({
      channel: c.id,
      stage: s.id,
      userId: `demo-${c.id}-${s.id}`,
      name: performers[(c.id + s.id) % performers.length],
      startedAt: new Date(started - (i + 2) * 97000).toISOString(),
      endsAt: new Date(started + ((c.id * 131 + s.id * 211) % 840) * 1000 + 60000).toISOString(),
    })),
);

type Status = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
const reports = [
  [
    'R-1042',
    14,
    'disruption',
    '산책자',
    '윤슬',
    1,
    '공연 중에 무대 앞에서 계속 응원봉을 연타하고 방해합니다.',
    'pending',
  ],
  ['R-1041', 28, 'hate', '밤산책', '산책자', 4, '다른 이용자에게 욕설을 반복했습니다.', 'pending'],
  [
    'R-1040',
    45,
    'privacy',
    '서우_공식',
    '서우',
    2,
    '제 이름과 프로필 사진을 그대로 따라 한 계정이 있어요.',
    'reviewing',
  ],
  [
    'R-1039',
    66,
    'harassment',
    '고양이발',
    '오후네시',
    4,
    '공연이 끝날 때마다 따라다니면서 말을 겁니다.',
    'pending',
  ],
  [
    'R-1038',
    99,
    'other',
    '산책자',
    '달무리',
    1,
    '바 무대 대기열에 들어왔다 나가기를 반복합니다.',
    'pending',
  ],
  ['R-1037', 196, 'sexual', '익명곰', '산책자', 3, '부적절한 자기소개 문구.', 'resolved'],
  ['R-1036', 264, 'disruption', '무대막기', '윤슬', 2, '무대 앞을 가로막고 서 있음.', 'dismissed'],
].map(([id, m, reason, target, reporter, channel, details, status]) => ({
  id: id as string,
  createdAt: minutesAgo(m as number),
  reason: reason as string,
  details: details as string,
  status: status as Status,
  channel: channel as number,
  targetId: `t-${target}`,
  target: target as string,
  reporter: reporter as string,
  targetTotal: 0,
  retentionUntil:
    status === 'resolved' || status === 'dismissed'
      ? new Date(Date.now() + (90 * 1440 - (m as number)) * 60000).toISOString()
      : null,
}));
for (const r of reports) r.targetTotal = reports.filter((x) => x.target === r.target).length;

type DemoMember = {
  id: string;
  name: string;
  provider: string;
  joinedAt: string;
  lastVisit: string | null;
  role: 'master' | 'admin' | null;
};
const dayAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const members: DemoMember[] = (
  [
    ['demo', '운영', 'google', 120, 0, 'master'],
    ['m-1', '해밀', 'kakao', 90, 0, 'admin'],
    ['m-2', '서우', 'google', 64, 0, null],
    ['m-3', '윤슬', 'kakao', 41, 1, null],
    ['m-4', '오후네시', 'google', 22, 3, null],
    ['m-5', '달무리', 'kakao', 9, 9, null],
    ['m-6', '버들', 'google', 2, null, null],
  ] as const
).map(([id, name, provider, joined, visit, role]) => ({
  id,
  name,
  provider,
  joinedAt: minutesAgo(joined * 1440),
  lastVisit: visit === null ? null : dayAgo(visit),
  role,
}));

type Notice = {
  id: string;
  label: string;
  title: string;
  body: string;
  status: 'draft' | 'published' | 'hidden';
  updatedAt: string;
};
let notices: Notice[] = seed.map((n) => ({
  id: n.id,
  label: n.label,
  title: n.title,
  body: n.paragraphs.join('\n\n'),
  status: 'published',
  updatedAt: minutesAgo(60 * 24),
}));

const fail = (code: string) => Promise.reject({ message: code });
const wait = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));

export async function demoResponse(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  try {
    return await run(name, args);
  } catch (e) {
    // Throw in the same shape as a real RPC error.
    throw new Error((e as { message?: string }).message ?? String(e));
  }
}

function run(name: string, a: Record<string, unknown>): Promise<unknown> {
  const jitter = (n: number, s: number) => Math.max(0, Math.round(n + (Math.random() - 0.4) * s));
  switch (name) {
    case 'admin_whoami':
      return wait({ userId: 'demo', admin: true, role: 'master' });
    case 'admin_overview': {
      const ch = channels.map((c) => ({ ...c, count: jitter(c.count, 4) }));
      const visitors = [312, 280, 355, 401, 390, 512, 640, 420, 388, 451, 470, 530, 690, 812];
      return wait({
        now: new Date().toISOString(),
        online: ch.reduce((s, c) => s + c.count, 0),
        stale: jitter(3, 2),
        performing: performances.length,
        queued: 24,
        openReports: reports.filter((r) => r.status === 'pending' || r.status === 'reviewing')
          .length,
        todayVisitors: 812,
        todayShows: 46,
        todaySignups: 31,
        channels: ch,
        days: visitors.map((v, i) => ({
          day: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10),
          visitors: v,
          onlineSeconds: v * 1500,
          stageSeconds: v * 120,
        })),
      });
    }
    case 'admin_live':
      return wait({
        now: new Date().toISOString(),
        channels,
        stages,
        performances,
        queue: performances
          .filter((p) => (p.stage + p.channel) % 2 === 0)
          .map((p) => ({
            channel: p.channel,
            stage: p.stage,
            count: ((p.stage + p.channel) % 3) + 1,
          })),
      });
    case 'admin_shows':
      return wait({
        stageSeconds: 212 * 820,
        performers: 38,
        newFollows: 1010,
        newHearts: 2380,
        shows: 212,
        avgSeconds: 820,
        earlyEnds: 17,
        finished: 190,
        musicians: [4980, 3420, 2310, 1890, 1240, 860, 720, 540].map((s, i) => ({
          userId: `m${i}`,
          name: ['달무리', '노을빛', '오후네시', '해밀', '서우', '윤슬', '라온', '버들'][i],
          stageSeconds: s,
          followers: Math.round(s / 18),
          hearts: Math.round(s / 7),
        })),
      });
    case 'admin_funnel': {
      const days = Number(a.days ?? 30);
      const scale =
        (a.provider === 'google' ? 0.58 : a.provider === 'kakao' ? 0.42 : 1) * (days / 30);
      const base = [4820, 3910, 3350, 410, 174];
      const last = [4410, 3440, 2980, 352, 141];
      const labels = ['가입', '프로필 완성', '공원 방문', '첫 무대', '팔로워 생김'];
      return wait({
        days,
        provider: a.provider ?? null,
        steps: labels.map((label, i) => ({
          label,
          value: Math.round(base[i] * scale * (a.provider === 'kakao' && i ? 0.9 : 1)),
          last: Math.round(last[i] * scale),
        })),
      });
    }
    case 'admin_reports':
      return wait(reports);
    case 'admin_set_report_status': {
      const r = reports.find((x) => x.id === a.report_id);
      if (!r) return fail('REPORT_NOT_FOUND');
      if (r.status !== a.expected_status) return fail('REPORT_CHANGED');
      const next = a.next_status as Status;
      const ok =
        (r.status === 'pending' && next === 'reviewing') ||
        (r.status === 'reviewing' && (next === 'resolved' || next === 'dismissed'));
      if (!ok) return fail('INVALID_TRANSITION');
      r.status = next;
      if (next !== 'reviewing')
        r.retentionUntil = new Date(Date.now() + 90 * 86400000).toISOString();
      return wait({ id: r.id, status: next });
    }
    case 'admin_members_list': {
      const q = String(a.search ?? '').trim();
      const rank = (r: string | null) => (r === 'master' ? 0 : r === 'admin' ? 1 : 2);
      return wait(
        members
          .filter((m) => !q || m.name.includes(q))
          .sort((x, y) => rank(x.role) - rank(y.role) || y.joinedAt.localeCompare(x.joinedAt)),
      );
    }
    case 'admin_set_admin': {
      const m = members.find((x) => x.id === a.target_user);
      if (!m) return fail('MEMBER_NOT_FOUND');
      if (m.id === 'demo') return fail('SELF_CHANGE');
      if (m.role === 'master') return fail('MASTER_LOCKED');
      m.role = a.make_admin ? 'admin' : null;
      return wait({ id: m.id, role: m.role });
    }
    // The real dashboard link stays out of the public repo; set it in .env.local to see it locally.
    case 'admin_embeds': {
      const url = import.meta.env.VITE_DEMO_AMPLITUDE_EMBED as string | undefined;
      return wait(url ? [{ id: 'demo-embed', title: '활성 사용자 & 머문 시간', url }] : []);
    }
    case 'admin_notices':
      return wait(notices);
    case 'admin_save_notice': {
      const next = a.next_status as Notice['status'];
      const fields = {
        label: String(a.notice_label ?? ''),
        title: String(a.notice_title ?? ''),
        body: String(a.notice_body ?? ''),
      };
      if (next === 'published' && (!fields.title.trim() || !fields.body.trim()))
        return fail('check constraint');
      if (!a.notice_id) {
        if (notices.some((n) => n.status === 'draft' && !n.title.trim() && !n.body.trim()))
          return fail('BLANK_DRAFT_EXISTS');
        const n: Notice = {
          id: `n-${Date.now()}`,
          ...fields,
          status: next,
          updatedAt: new Date().toISOString(),
        };
        notices = [n, ...notices];
        return wait(n);
      }
      const n = notices.find((x) => x.id === a.notice_id);
      if (!n) return fail('NOTICE_NOT_FOUND');
      Object.assign(n, fields, { status: next, updatedAt: new Date().toISOString() });
      return wait(n);
    }
    case 'admin_delete_notice':
      if (!notices.some((n) => n.id === a.notice_id)) return fail('NOTICE_NOT_FOUND');
      notices = notices.filter((n) => n.id !== a.notice_id);
      return wait(null);
    default:
      return fail(`unknown rpc ${name}`);
  }
}
