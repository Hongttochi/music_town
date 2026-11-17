import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './confirm-dialog.css';

type Props = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'solid' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
};

// Asks once more before an action that is hard to undo. Escape or an outside click cancels.
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onCancel]);

  return createPortal(
    <div className={`a-modal-wrap ${open ? 'open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="a-scrim open" onClick={onCancel} />
      <div
        className="a-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="a-confirm-title"
      >
        <h2 id="a-confirm-title">{title}</h2>
        <div className="a-modal-body">{children}</div>
        <div className="a-modal-foot">
          <button className="a-btn a-btn-ghost" onClick={onCancel}>
            취소
          </button>
          <button ref={confirmRef} className={`a-btn a-btn-${tone}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
