import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Flaticon } from '../Flaticon';
import { notices } from '../notices';
import { Button } from './ui/Button';
import { DialogPanel } from './ui/Panel';
import './notice-board.css';

export function NoticeBoardDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <DialogPanel
      ref={dialog}
      className="notice-board-dialog"
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <header className="notice-board-heading">
        <Flaticon name="blackboard" size={38} />
        <div>
          <span>MUSIC TOWN · 공지사항</span>
          <h2 id={title}>마을 게시판</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="notice-board-close"
          aria-label="닫기"
          data-sound="cancel"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </Button>
      </header>
      <div className="notice-board-papers" aria-label="공지사항">
        {notices.map((notice) => (
          <article className="notice-paper" key={notice.id}>
            <span className="notice-pin" aria-hidden="true" />
            <span className="notice-label">{notice.label}</span>
            <h3>{notice.title}</h3>
            {notice.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <footer>MUSIC TOWN</footer>
          </article>
        ))}
      </div>
      <p className="notice-board-footnote">오늘도 좋은 음악과 함께, 즐거운 산책 되세요.</p>
    </DialogPanel>
  );
}
