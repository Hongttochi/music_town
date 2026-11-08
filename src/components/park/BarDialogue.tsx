import { useEffect, useRef, useState } from 'react';
import dogImage from '../../assets/npc/bar-dog.webp';

const lines = [
  '아직 문 열 시간이 아니에요. 지금은 저녁 손님을 맞을 준비를 하고 있어요.',
  '저녁 7시에 다시 만나요! 달빛 바는 아침 6시까지 열려 있어요.',
];
export function BarDialogue({ onClose }: { onClose: () => void }) {
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
      <span id="bar-speaker" className="bar-dialogue-name">
        루나 <small>달빛 바 안내</small>
      </span>
      <img src={dogImage} alt="정장을 입은 강아지 루나" />
      <div className="bar-dialogue-body">
        <p aria-label={text}>
          <span aria-hidden="true">{text.slice(0, letters)}</span>
        </p>
        <button type="button" onClick={next}>
          {!complete ? '대사 보기' : page === lines.length - 1 ? '알겠어요' : '다음'}{' '}
          <span aria-hidden="true">▸</span>
        </button>
      </div>
    </dialog>
  );
}
