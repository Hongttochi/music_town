import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import './delete-account.css';

export function DeleteAccountDialog({
  onClose,
  onDelete,
  demo,
}: {
  onClose: () => void;
  onDelete: () => Promise<void>;
  demo: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const title = useId();
  const description = useId();
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="town-panel delete-account-dialog"
      aria-labelledby={title}
      aria-describedby={description}
      onCancel={(event) => {
        event.preventDefault();
        if (!pendingRef.current) onClose();
      }}
    >
      <div className="delete-account-heading">
        <div className="delete-account-art" aria-hidden="true">
          <img src="/art/mori-farewell.png" width={104} height={120} alt="" />
        </div>
        <h2 id={title}>탈퇴하시겠어요?</h2>
      </div>
      <p id={description} className="delete-account-description">
        {demo
          ? '체험 모드에서는 삭제할 계정이 없어요.'
          : '계정이 삭제되고 로그아웃돼요. 삭제한 계정은 복구할 수 없어요.'}
      </p>
      {error && (
        <p className="delete-account-error" role="alert">
          {error}
        </p>
      )}
      <div className="delete-account-actions">
        <Button variant="secondary" autoFocus disabled={pending} onClick={onClose}>
          취소
        </Button>
        <Button
          variant="secondary"
          className="delete-account-confirm"
          disabled={pending || demo}
          data-sound="ok"
          onClick={async () => {
            if (pendingRef.current) return;
            pendingRef.current = true;
            setPending(true);
            setError('');
            try {
              await onDelete();
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : '탈퇴하지 못했어요. 다시 시도해 주세요.',
              );
              pendingRef.current = false;
              setPending(false);
            }
          }}
        >
          {pending ? '탈퇴 처리 중…' : '탈퇴하기'}
        </Button>
      </div>
    </dialog>
  );
}
