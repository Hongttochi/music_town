import { useEffect, useRef } from 'react';
import type { Avatar } from '../../data/model';
import { ModularPortrait } from '../avatar/ModularPortrait';
import moriImage from '../../assets/npc/school-rabbit.webp';
import './channel-entry.css';

export function ChannelEntryDialog({
  channel,
  avatar,
  ready,
  onComplete,
}: {
  channel: number;
  avatar?: Avatar;
  ready: boolean;
  onComplete: () => void;
}) {
  const started = useRef(Date.now());
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(
      () => complete.current(),
      Math.max(0, 2500 - (Date.now() - started.current)),
    );
    return () => clearTimeout(timer);
  }, [ready]);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="channel-entry"
      aria-labelledby="channel-entry-title"
      aria-busy="true"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="channel-entry-art" aria-hidden="true">
        <span className="channel-entry-note">♪</span>
        {avatar ? (
          <ModularPortrait avatar={avatar} />
        ) : (
          <img className="channel-entry-mori" src={moriImage} alt="" />
        )}
        <span className="channel-entry-ground" />
      </div>
      <h2 id="channel-entry-title">{channel + 1}번 공원에 입장 중…</h2>
      <p role="status">
        {avatar
          ? `${avatar.name || '산책자'}님, 잠시만 기다려 주세요.`
          : '모리가 공원에서 기다리고 있어요.'}
      </p>
      <span className="channel-entry-spinner" aria-hidden="true" />
    </dialog>
  );
}
