import { forwardRef, type DialogHTMLAttributes, type HTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export const DialogPanel = forwardRef<HTMLDialogElement, DialogHTMLAttributes<HTMLDialogElement>>(
  function DialogPanel({ className = '', ...props }, ref) {
    return <dialog ref={ref} className={`town-panel ${className}`} {...props} />;
  },
);

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`town-surface ${className}`} {...props} />;
}

export function PanelHeading({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <header className="panel-heading">
      <h2 className="modal-title">{title}</h2>
      {onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
          <X size={16} />
        </Button>
      )}
    </header>
  );
}
