import { RefreshCw } from 'lucide-react';
import type { AdminError } from '../../services/adminRepository';

// Shown while a page loads for the first time or when loading failed.
export function ErrorCard({ error, reload }: { error: AdminError | null; reload: () => void }) {
  return (
    <div className="a-card rv">
      {error ? (
        <div className="a-empty">
          <p style={{ margin: '0 0 12px' }}>{error.message}</p>
          <button className="a-btn a-btn-ghost" onClick={reload}>
            <RefreshCw size={14} /> 다시 불러오기
          </button>
        </div>
      ) : (
        <p className="a-empty">불러오는 중…</p>
      )}
    </div>
  );
}
