import type { ComponentType, ReactNode } from 'react';
import {
  Filter,
  Flag,
  LayoutGrid,
  Megaphone,
  Mic,
  Radio,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { Overview } from '../pages/Overview';
import { Live } from '../pages/Live';
import { Shows } from '../pages/Shows';
import { Funnels } from '../pages/Funnels';
import { Reports } from '../pages/Reports';
import { Errors } from '../pages/Errors';
import { Notices } from '../pages/Notices';
import { Members } from '../pages/Members';

export type PageDef = {
  key: string;
  label: string;
  group: string;
  icon: ComponentType<{ size?: number }>;
  title: string;
  sub: ReactNode;
  Page: ComponentType;
};

// Sidebar order; groups are separated by a divider.
export const pageGroups: PageDef[][] = [
  [
    {
      key: 'overview',
      label: '개요',
      group: '운영',
      icon: LayoutGrid,
      title: '오늘의 공원',
      sub: <>지금 공원 상황과 최근 방문 흐름 · 10초마다 갱신</>,
      Page: Overview,
    },
  ],
  [
    {
      key: 'live',
      label: '실시간 현황',
      group: '공원',
      icon: Radio,
      title: '실시간 현황',
      sub: <>채널별 무대와 대기열 · 3초마다 갱신</>,
      Page: Live,
    },
    {
      key: 'shows',
      label: '공연',
      group: '공원',
      icon: Mic,
      title: '공연',
      sub: <>진행 중인 공연과 최근 7일 무대 기록</>,
      Page: Shows,
    },
    {
      key: 'notices',
      label: '공지',
      group: '공원',
      icon: Megaphone,
      title: '공지',
      sub: <>공원 게시판에 올라가는 소식을 쓰고 관리해요</>,
      Page: Notices,
    },
    {
      key: 'funnels',
      label: '퍼널',
      group: '분석',
      icon: Filter,
      title: '퍼널',
      sub: <>가입한 사람이 공원 방문, 첫 무대, 팔로워까지 가는 흐름</>,
      Page: Funnels,
    },
  ],
  [
    {
      key: 'reports',
      label: '신고 처리',
      group: '안전',
      icon: Flag,
      title: '신고 처리',
      sub: <>이용자 신고를 검토하고 처리해요 · 30초마다 갱신</>,
      Page: Reports,
    },
    {
      key: 'errors',
      label: '오류·음성',
      group: '안전',
      icon: TriangleAlert,
      title: '오류와 음성',
      sub: <>앱 오류 기록과 음성 연결 상태</>,
      Page: Errors,
    },
  ],
  [
    {
      key: 'members',
      label: '회원 관리',
      group: '관리',
      icon: Users,
      title: '회원 관리',
      sub: <>회원을 찾고 관리자 권한을 지정해요 · 지정은 마스터 관리자만</>,
      Page: Members,
    },
  ],
];
export const allPages = pageGroups.flat();
