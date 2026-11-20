import { useRef } from 'react';
import { LogOut, PanelLeft, Settings } from 'lucide-react';
import type { PageDef } from '../../app/adminPages';
import { useSlidingPill } from '../../hooks/useSlidingPill';
import { demoMode } from '../../services/adminRepository';
import { supabase } from '../../../services/auth';
import './admin-sidebar.css';

type Props = {
  groups: PageDef[][];
  active: string;
  wide: boolean;
  openReports: number;
  onNavigate: (key: string) => void;
  onToggleWide: () => void;
  onOpenSettings: () => void;
};

export function AdminSidebar({
  groups,
  active,
  wide,
  openReports,
  onNavigate,
  onToggleWide,
  onOpenSettings,
}: Props) {
  const nav = useRef<HTMLElement>(null);
  const pill = useSlidingPill(nav, active);
  return (
    <aside className="a-side">
      <div className="a-brand-row">
        <div className="a-brand-logo">
          <img src={wide ? '/art/busking-town-logo.png' : '/favicon-v3.png'} alt="MusicTown" />
        </div>
      </div>
      <button
        className="a-nav-btn"
        aria-label={wide ? '사이드바 접기' : '사이드바 펼치기'}
        aria-expanded={wide}
        onClick={onToggleWide}
      >
        <PanelLeft size={18} style={{ flex: 'none' }} />
        <span className="a-label">사이드바 접기</span>
        <span className="a-tip">사이드바 펼치기</span>
      </button>
      <nav className="a-nav" ref={nav}>
        <div className="a-pill" ref={pill} />
        {groups.map((group, gi) => (
          <div key={gi} style={{ display: 'contents' }}>
            {gi > 0 && <div className="a-sep" />}
            {group.map((p) => (
              <button
                key={p.key}
                data-key={p.key}
                className="a-nav-btn"
                aria-current={p.key === active ? 'page' : undefined}
                aria-label={p.label}
                onClick={() => onNavigate(p.key)}
              >
                <span style={{ display: 'flex', flex: 'none' }}>
                  <p.icon size={18} />
                </span>
                <span className="a-label">{p.label}</span>
                {p.key === 'reports' && openReports > 0 && <span className="a-dot" />}
                <span className="a-tip">{p.label}</span>
              </button>
            ))}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="a-sep" />
        <button
          className="a-nav-btn"
          aria-label="화면 설정"
          aria-haspopup="dialog"
          onClick={onOpenSettings}
        >
          <Settings size={18} style={{ flex: 'none' }} />
          <span className="a-label">화면 설정</span>
          <span className="a-tip">화면 설정</span>
        </button>
        {!demoMode && (
          <button
            className="a-nav-btn"
            aria-label="로그아웃"
            onClick={() => void supabase?.auth.signOut()}
          >
            <LogOut size={18} style={{ flex: 'none' }} />
            <span className="a-label">로그아웃</span>
            <span className="a-tip">로그아웃</span>
          </button>
        )}
      </nav>
      <div className="a-me-row">
        <div className="a-me">운영</div>
        <span className="a-label">
          운영자
          <small>{demoMode ? '데모 데이터' : '관리자 계정'}</small>
        </span>
      </div>
    </aside>
  );
}
