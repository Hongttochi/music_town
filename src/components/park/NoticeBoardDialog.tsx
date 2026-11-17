import { ModularPortrait } from '../avatar/ModularPortrait';
import { defaultAvatar } from '../../data/model';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Logo } from '../ui/Flaticon';
import { notices as fallback, type Notice } from '../../data/notices';
import { supabase } from '../../services/auth';
import { Button } from '../ui/Button';
import { DialogPanel } from '../ui/Panel';
import './notice-board.css';

export function NoticeBoardDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  // Read notices published from the admin console; fall back to the bundled notices if the RPC is missing or fails.
  const [notices, setNotices] = useState<Notice[]>(fallback);
  useEffect(() => {
    let alive = true;
    supabase
      ?.rpc('town_notice_board')
      .then(({ data, error }) => {
        if (!alive || error || !Array.isArray(data)) return;
        setNotices(
          data.map((n: { id: string; label: string; title: string; body: string }) => ({
            id: n.id,
            label: n.label,
            title: n.title,
            paragraphs: n.body
              .split(/\n\s*\n/)
              .map((p) => p.trim())
              .filter(Boolean),
          })),
        );
      })
      .then(undefined, () => undefined);
    return () => {
      alive = false;
    };
  }, []);
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
        <div className="notice-board-sign">
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
        {!notices.length && <p className="notice-board-footnote">아직 올라온 소식이 없어요.</p>}
        {notices.map((notice) => (
          <article className="notice-paper" key={notice.id}>
            <span className="notice-pin" aria-hidden="true" />
            <span className="notice-label">{notice.label}</span>
            <h3>{notice.title}</h3>
            {notice.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <footer>
              <div className="notice-friends" aria-hidden="true">
                <ModularPortrait avatar={{ ...defaultAvatar, instrument: 'guitar' }} />
                <ModularPortrait
                  avatar={{
                    ...defaultAvatar,
                    hair: 6,
                    hairColor: '#d87593',
                    earwear: 'headset',
                    shirt: '#96b7a1',
                  }}
                />
              </div>
              <Logo />
            </footer>
          </article>
        ))}
      </div>
      <p className="notice-board-footnote">오늘도 좋은 음악과 함께, 즐거운 산책 되세요.</p>
    </DialogPanel>
  );
}
