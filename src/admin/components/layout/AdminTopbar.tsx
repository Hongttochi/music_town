import { useState } from 'react';
import { Bell, ChevronRight, LogOut, Menu, Sun } from 'lucide-react';
import { supabase } from '../../services/adminAuth';
import type { PageDef } from '../../app/adminPages';
import { demoMode } from '../../services/adminRepository';
import './admin-topbar.css';

type Props = {
  page: PageDef;
  openReports: number;
  onOpenSettings: () => void;
  onOpenReports: () => void;
  onToggleMenu: () => void;
  menuOpen: boolean;
};

export function AdminTopbar({
  page,
  openReports,
  onOpenSettings,
  onOpenReports,
  onToggleMenu,
  menuOpen,
}: Props) {
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const logout = async () => {
    if (demoMode) {
      window.dispatchEvent(new Event('admin-demo-exit'));
      return;
    }
    if (!supabase || signingOut) return;
    setSigningOut(true);
    setLogoutError(false);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch {
      setLogoutError(true);
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <header className="a-top">
      <button
        className="a-icon-btn a-mobile-menu"
        aria-label="운영실 메뉴"
        aria-expanded={menuOpen}
        aria-controls="admin-navigation"
        onClick={onToggleMenu}
      >
        <Menu size={20} />
      </button>
      <div className="a-crumbs" key={page.key}>
        {page.group}
        <ChevronRight size={13} />
        <b>{page.label}</b>
      </div>
      <div className="a-top-right">
        {logoutError && (
          <span role="alert" className="a-logout-error">
            로그아웃하지 못했어요. 다시 시도해 주세요.
          </span>
        )}
        <span className={`a-live ${demoMode ? 'demo' : ''}`}>
          <i />
          {demoMode ? '데모' : 'Live'}
        </span>
        <button className="a-icon-btn" aria-label="화면 설정" onClick={onOpenSettings}>
          <Sun size={16} />
        </button>
        <button className="a-icon-btn" aria-label="알림" onClick={onOpenReports}>
          <Bell size={16} />
          {openReports > 0 && <em>{openReports > 99 ? '99+' : openReports}</em>}
        </button>
        <button
          className="a-btn a-btn-ghost a-top-logout"
          disabled={signingOut}
          onClick={() => void logout()}
        >
          <LogOut size={16} aria-hidden="true" />
          {demoMode ? '데모 나가기' : signingOut ? '로그아웃 중…' : '로그아웃'}
        </button>
      </div>
    </header>
  );
}
