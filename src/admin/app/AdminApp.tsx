import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { allPages, pageGroups } from './adminPages';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { AdminTopbar } from '../components/layout/AdminTopbar';
import { ThemePanel } from '../components/settings/ThemePanel';
import { useAdminRpc } from '../hooks/useAdminRpc';
import { useClickRipple } from '../hooks/useClickRipple';
import { useTheme } from '../hooks/useTheme';
import { demoMode, type Overview } from '../services/adminRepository';
import { readSaved } from '../../utils/storage';
import { reveal } from '../utils/reveal';
import './admin-app.css';

const WIDE_KEY = 'mt-admin-wide';
const fromHash = () => allPages.find((p) => p.key === location.hash.slice(2))?.key ?? 'overview';

export function AdminApp() {
  const [active, setActive] = useState(fromHash);
  const [shown, setShown] = useState(active);
  const [leaving, setLeaving] = useState(false);
  const [glow, setGlow] = useState<{ x: number; y: number; stamp: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [wide, setWide] = useState(() => readSaved(WIDE_KEY, false));
  const [settings, setSettings] = useState(false);
  const [theme, setTheme] = useTheme();
  // The bell count and the reports dot follow the real number of open reports.
  const openReports =
    useAdminRpc<Overview>('admin_overview', undefined, 30000).data?.openReports ?? 0;
  useClickRipple();

  const toggleWide = () =>
    setWide((w) => {
      try {
        localStorage.setItem(WIDE_KEY, JSON.stringify(!w));
      } catch {
        // Storage can be unavailable; the sidebar still toggles for this visit.
      }
      return !w;
    });

  // Blur the current page out, bloom a glow from the click, then swap in the next page.
  const go = (key: string, e?: MouseEvent) => {
    if (key === active) return;
    setActive(key);
    history.replaceState(null, '', `#/${key}`);
    setGlow({
      x: e?.clientX ?? innerWidth / 2,
      y: e?.clientY ?? innerHeight / 2,
      stamp: Date.now(),
    });
    setLeaving(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setShown(key);
      setLeaving(false);
      window.scrollTo({ top: 0 });
    }, 260);
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
      {glow && <div key={glow.stamp} className="a-glow on" style={{ left: glow.x, top: glow.y }} />}
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
            onOpenReports={(e) => go('reports', e)}
          />
          <section className={`a-page ${leaving ? 'is-out' : ''}`} key={shown}>
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
