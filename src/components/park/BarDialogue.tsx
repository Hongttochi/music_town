import { useEffect, useRef, useState } from 'react';
import dogImage from '../../assets/npc/bar-dog.webp';

const dayLines = [
  '아직 문 열 시간이 아니에요. 지금은 저녁 손님을 맞을 준비를 하고 있어요.',
  '저녁 7시에 다시 만나요! 문나잇 바는 아침 6시까지 열려 있어요.',
];
const nightLines = [
  '안녕하세요! 문나잇 바에서 재즈 공연이 열리는 것 같은데요?!',
  '한번 들러보세요! 음악을 듣거나 무대에 올라 직접 공연할 수도 있어요.',
];
export function BarDialogue({ onClose, night = false }: { onClose: () => void; night?: boolean }) {
  const lines = night ? nightLines : dayLines;
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState(0);
  const [letters, setLetters] = useState(0);
  const text = lines[page];
  const complete = letters >= text.length;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLetters(text.length);
      return;
    }
    const timer = window.setInterval(() => setLetters((n) => Math.min(n + 1, text.length)), 32);
    return () => window.clearInterval(timer);
  }, [text]);
  function next() {
    if (!complete) setLetters(text.length);
    else if (page < lines.length - 1) {
      setPage(page + 1);
      setLetters(0);
    } else onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="bar-dialogue"
      aria-labelledby="bar-speaker"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="bar-dialogue-speaker">
        <img src={dogImage} alt="정장을 입은 강아지 루나" />
        <span id="bar-speaker" className="bar-dialogue-name">
          루나 <small>문나잇 바 안내</small>
        </span>
      </div>
      <div className="bar-dialogue-body">
        <p aria-label={text}>
          <span aria-hidden="true">{text.slice(0, letters)}</span>
        </p>
        <button type="button" onClick={next}>
          {page === lines.length - 1 ? '알겠어요' : '다음'} <span aria-hidden="true">▸</span>
        </button>
      </div>
    </dialog>
  );
}
