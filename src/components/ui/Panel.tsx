import '../../styles/modal-typography.css';
import { forwardRef, type DialogHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

type DialogPanelProps = DialogHTMLAttributes<HTMLDialogElement> & { 'data-panel'?: string | null };
export const DialogPanel = forwardRef<HTMLDialogElement, DialogPanelProps>(function DialogPanel(
  { className = '', children, ...props },
  ref,
) {
  const profile = ['account', 'participant', 'profile'].includes(props['data-panel'] ?? '');
  return (
    <dialog
      ref={ref}
      className={`town-panel ${profile ? 'profile-dialog' : ''} ${className}`}
      {...props}
    >
      {profile ? <div className="profile-sheet">{children}</div> : children}
    </dialog>
  );
});

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`town-surface ${className}`} {...props} />;
}

export function PanelHeading({
  title,
  icon,
  onClose,
}: {
  title: string;
  icon?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <header className="panel-heading">
      <h2 className="modal-title">
        {icon}
        {title}
      </h2>
      {onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
          <X size={16} />
        </Button>
      )}
    </header>
  );
}
