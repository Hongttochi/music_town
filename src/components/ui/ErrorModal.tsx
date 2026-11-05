import { useEffect, useId, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import './error-modal.css';

export function ErrorModal({
  title = '연결을 확인해 주세요',
  message,
  onClose,
  onRetry,
}: {
  title?: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="error-modal"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onCancel={onClose}
    >
      <AlertCircle className="error-modal-icon" size={26} aria-hidden="true" />
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-message`}>{message}</p>
      <div className="error-modal-actions">
        <Button type="button" variant={onRetry ? 'secondary' : 'primary'} onClick={onClose}>
          확인
        </Button>
        {onRetry && (
          <Button type="button" variant="primary" autoFocus onClick={onRetry}>
            다시 시도
          </Button>
        )}
      </div>
    </dialog>
  );
}
