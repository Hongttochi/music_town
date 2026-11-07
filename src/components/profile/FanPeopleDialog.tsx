import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/auth';
import type { Participant } from '../../hooks/useTown';
import { DialogPanel, PanelHeading } from '../ui/Panel';
import { Button } from '../ui/Button';
import { ModularPortrait } from '../avatar/ModularPortrait';
import { ProfileSocialLinks } from './ProfileSocialLinks';
import './fan-people.css';

export function FanPeopleDialog({
  userId,
  kind,
  onClose,
}: {
  userId: string;
  kind: 'follow' | 'heart';
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [people, setPeople] = useState<Participant[]>([]);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    async function load() {
      try {
        if (!supabase) throw new Error();
        const { data, error } = await supabase.rpc('profile_fan_people', {
          target: userId,
          fan_kind: kind,
          page_offset: offset,
        });
        if (error) throw error;
        if (!active) return;
        const rows = data as Participant[];
        setPeople((previous) =>
          offset === 0
            ? rows
            : [...previous, ...rows.filter((row) => !previous.some((p) => p.id === row.id))],
        );
        setMore(rows.length === 50);
      } catch {
        if (active) setError('목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId, kind, offset, retry]);
  return (
    <DialogPanel
      ref={dialog}
      className="fan-people-dialog"
      aria-labelledby="fan-people-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div id="fan-people-title">
        <PanelHeading
          title={kind === 'follow' ? '팔로워' : '하트를 보낸 사람들'}
          onClose={onClose}
        />
      </div>
      <div className="fan-people-list" aria-busy={busy}>
        {people.map((person) => (
          <article className="fan-person" key={person.id}>
            <ModularPortrait avatar={person.avatar} lazy />
            <div className="fan-person-details">
              <strong>{person.avatar.name}</strong>
              <small>{person.role === 'musician' ? '뮤지션' : '관람객'}</small>
              {person.bio && <p>{person.bio}</p>}
              <ProfileSocialLinks instagram={person.instagram} soundcloud={person.soundcloud} />
            </div>
          </article>
        ))}
        {busy && <p role="status">불러오는 중…</p>}
        {!busy && !error && people.length === 0 && (
          <p role="status">
            {kind === 'follow' ? '아직 팔로워가 없어요.' : '아직 하트를 보낸 사람이 없어요.'}
          </p>
        )}
        {error && (
          <p role="alert">
            {error}{' '}
            <Button variant="ghost" onClick={() => setRetry((value) => value + 1)}>
              다시 시도
            </Button>
          </p>
        )}
        {!busy && !error && more && (
          <Button variant="ghost" onClick={() => setOffset((value) => value + 50)}>
            더 보기
          </Button>
        )}
      </div>
    </DialogPanel>
  );
}
