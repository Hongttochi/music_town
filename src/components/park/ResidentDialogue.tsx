import { useEffect, useRef, useState } from 'react';
import { parkResidents, residentLine, type ResidentTalk } from '../../data/parkResidents';
import './resident-dialogue.css';

export function ResidentDialogue({ talk, onClose }: { talk: ResidentTalk; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const resident = parkResidents.find((r) => r.id === talk.id)!;
  const [line, setLine] = useState(() => residentLine(talk));
  const [page, setPage] = useState(0);
  const [letters, setLetters] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLetters(line.length);
      return;
    }
    const timer = window.setInterval(() => setLetters((n) => Math.min(n + 1, line.length)), 32);
    return () => window.clearInterval(timer);
  }, [line]);
  function next() {
    if (letters < line.length) setLetters(line.length);
    else if (page === 0) {
      setLine((previous) => residentLine(talk, previous));
      setLetters(0);
      setPage(1);
    } else onClose();
  }
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="bar-dialogue resident-conversation"
      aria-labelledby="resident-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="bar-dialogue-speaker">
        <div
          className="resident-portrait"
          style={{
            width: 'extra' in resident ? 52 : 39,
            backgroundImage: `url('/art/${'extra' in resident ? 'park-residents-extra.png' : 'park-residents.png'}')`,
            backgroundSize: '400% auto',
            backgroundPosition: `${(resident.column / 3) * 100}% ${'extra' in resident ? 'top' : 'center'}`,
          }}
          aria-hidden="true"
        />
        <span id="resident-title" className="bar-dialogue-name">
          {resident.name}
          <small>공원 주민</small>
        </span>
      </div>
      <div className="bar-dialogue-body">
        <p aria-label={line}>
          <span aria-hidden="true">{line.slice(0, letters)}</span>
        </p>
        <button type="button" onClick={next} autoFocus>
          {page === 0 ? '다음' : '알겠어요'} <span aria-hidden="true">▸</span>
        </button>
      </div>
    </dialog>
  );
}
