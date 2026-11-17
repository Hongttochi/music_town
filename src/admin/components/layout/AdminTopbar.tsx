import { Bell, ChevronRight, Sun } from 'lucide-react';
import type { PageDef } from '../../app/adminPages';
import { demoMode } from '../../services/adminRepository';
import './admin-topbar.css';

type Props = {
  page: PageDef;
  openReports: number;
  onOpenSettings: () => void;
  onOpenReports: () => void;
};

export function AdminTopbar({ page, openReports, onOpenSettings, onOpenReports }: Props) {
  return (
    <header className="a-top">
      <div className="a-crumbs" key={page.key}>
        {page.group}
        <ChevronRight size={13} />
        <b>{page.label}</b>
      </div>
      <div className="a-top-right">
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
      </div>
    </header>
  );
}
