import { ExternalLink } from 'lucide-react';
import { reveal } from '../utils/reveal';
import { ErrorCard } from '../components/ui/ErrorCard';
import { useAdminRpc } from '../hooks/useAdminRpc';
import type { Embed } from '../services/adminRepository';
import './amplitude.css';

// Shows the Amplitude dashboards saved in public.admin_embeds (added once in the SQL Editor).
export function Amplitude() {
  const { data, error, reload } = useAdminRpc<Embed[]>('admin_embeds');
  if (!data) return <ErrorCard error={error} reload={reload} />;

  return (
    <>
      {error && <p className="a-banner">{error.message}</p>}
      {data.map((e, i) => (
        <div key={e.id} {...reveal(i)} className="a-card a-amp-chart">
          <div className="a-amp-head">
            <p className="a-list-title a-ellipsis">{e.title}</p>
            <a
              className="a-btn a-btn-ghost"
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} /> 새 창에서 열기
            </a>
          </div>
          <iframe
            title={e.title}
            src={e.url}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      ))}
      {!data.length && (
        <div {...reveal(0)} className="a-card">
          <p className="a-list-title">연결된 통계 대시보드가 없어요</p>
          <p className="a-cap">
            Supabase SQL Editor에서 public.admin_embeds에 Amplitude 임베드 링크를 넣으면 여기에
            보여요.
          </p>
        </div>
      )}
    </>
  );
}
