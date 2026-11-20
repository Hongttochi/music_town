import { useCallback, useEffect, useState } from 'react';
import { allPages, pageGroups } from './adminPages';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { AdminTopbar } from '../components/layout/AdminTopbar';
import { ThemePanel } from '../components/settings/ThemePanel';
import { useAdminRpc } from '../hooks/useAdminRpc';
import { useTheme } from '../hooks/useTheme';
import { demoMode, type Overview } from '../services/adminRepository';
import { readSaved } from '../../utils/storage';
import { reveal } from '../utils/reveal';

const WIDE_KEY = 'mt-admin-wide';
const fromHash = () => allPages.find((p) => p.key === location.hash.slice(2))?.key ?? 'overview';

export function AdminApp() {
  const [active, setActive] = useState(fromHash);
  const [shown, setShown] = useState(active);
  const [wide, setWide] = useState(() => readSaved(WIDE_KEY, false));
  const [settings, setSettings] = useState(false);
  const [theme, setTheme] = useTheme();
  // The bell count and the reports dot follow the real number of open reports.
  const openReports =
    useAdminRpc<Overview>('admin_overview', undefined, 30000).data?.openReports ?? 0;

  const toggleWide = () =>
    setWide((w) => {
      try {
        localStorage.setItem(WIDE_KEY, JSON.stringify(!w));
      } catch {
        // Storage can be unavailable; the sidebar still toggles for this visit.
      }
      return !w;
    });

  // Navigate immediately without a staged animation.
  const go = (key: string) => {
    if (key === active) return;
    setActive(key);
    history.replaceState(null, '', `#/${key}`);
    setShown(key);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const onHash = () => go(fromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  });

  const closeSettings = useCallback(() => setSettings(false), []);
  const page = allPages.find((p) => p.key === shown)!;
  const Page = page.Page;
  return (
    <div className="a-stage">
      <div className={`a-frame ${wide ? 'wide' : ''}`}>
        <AdminSidebar
          groups={pageGroups}
          active={active}
          wide={wide}
          openReports={openReports}
          onNavigate={go}
          onToggleWide={toggleWide}
          onOpenSettings={() => setSettings(true)}
        />
        <main className="a-main">
          <AdminTopbar
            page={page}
            openReports={openReports}
            onOpenSettings={() => setSettings(true)}
            onOpenReports={() => go('reports')}
          />
          <section className="a-page" key={shown}>
            <div className="a-head">
              <div>
                <h1 className="a-title">{page.title}</h1>
                <p {...reveal(1)} className="a-subtitle rv">
                  {page.sub}
                </p>
              </div>
            </div>
            <Page />
            {demoMode && (
              <p className="a-demo-note">
                Supabase 설정이 없어 데모 데이터를 보여주고 있어요 · 실제 데이터는 로그인한
                관리자에게만 보여요
              </p>
            )}
          </section>
        </main>
      </div>
      <ThemePanel open={settings} onClose={closeSettings} theme={theme} setTheme={setTheme} />
    </div>
  );
}
