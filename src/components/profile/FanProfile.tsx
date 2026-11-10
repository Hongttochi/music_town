import { Heart, UserPlus, UserCheck } from 'lucide-react';
import { ModularPortrait } from '../avatar/ModularPortrait';
import { FanPeopleDialog } from './FanPeopleDialog';
import type { ReactNode } from 'react';
import { ActivityChart } from './ActivityChart';
import { useEffect, useState } from 'react';
import { useFanStats } from '../../hooks/useFanStats';
import { Button } from '../ui/Button';
import { supabase } from '../../services/auth';
import type { Participant } from '../../hooks/useTown';
import './fan-profile.css';

export function FanProfile({
  userId,
  own = false,
  demo = false,
  children,
}: {
  userId?: string;
  own?: boolean;
  demo?: boolean;
  children?: (content: ReactNode, actions: ReactNode) => ReactNode;
}) {
  const [peopleKind, setPeopleKind] = useState<'follow' | 'heart' | null>(null);
  const { stats, error, busy, act, refresh } = useFanStats(userId, demo);
  const actions = !own && !demo && userId && (
    <div className="fan-actions">
      <Button
        variant="plain"
        size="sm"
        className="fan-action-icon"
        disabled={!stats || busy}
        aria-pressed={stats?.following ?? false}
        aria-label={stats?.following ? '팔로우 취소' : '팔로우'}
        title={stats?.following ? '팔로우 취소' : '팔로우'}
        onClick={() => void act('follow', !stats?.following)}
      >
        <img src="/icons/profile-followers.png?v=20261110-flat" width={14} height={14} alt="" />
        <span>{stats?.following ? '팔로잉' : '팔로우'}</span>
      </Button>
      <Button
        variant="plain"
        size="sm"
        className="fan-action-icon"
        disabled={!stats || busy}
        aria-pressed={stats?.hearted ?? false}
        aria-label={stats?.hearted ? '하트 취소' : '하트 보내기'}
        title={stats?.hearted ? '하트 취소' : '하트 보내기'}
        onClick={() => void act('heart', !stats?.hearted)}
      >
        <img
          src="/icons/profile-received-heart.png?v=20261110-flat"
          width={14}
          height={14}
          alt=""
        />
        <span>{stats?.hearted ? '보낸 하트' : '하트 보내기'}</span>
      </Button>
    </div>
  );
  const content = (
    <section className="fan-profile" aria-label="팬 활동">
      <dl className="fan-counts">
        <div>
          <dt>팔로워</dt>
          <dd>
            <button
              type="button"
              disabled={demo || !userId}
              aria-label="팔로워 목록 보기"
              onClick={() => setPeopleKind('follow')}
            >
              <img
                src="/icons/profile-followers.png?v=20261110-flat"
                width={20}
                height={20}
                alt=""
              />
              <span>{stats ? stats.followers.toLocaleString('ko-KR') : '—'}</span>
            </button>
          </dd>
        </div>
        <div>
          <dt>누적 하트</dt>
          <dd>
            <button
              type="button"
              disabled={demo || !userId}
              aria-label="하트를 보낸 사람들 보기"
              onClick={() => setPeopleKind('heart')}
            >
              <img
                src="/icons/profile-received-heart.png?v=20261110-flat"
                width={20}
                height={20}
                alt=""
              />
              <span>{stats ? stats.hearts.toLocaleString('ko-KR') : '—'}</span>
            </button>
          </dd>
        </div>
        <div>
          <dt>주간 하트</dt>
          <dd>{stats?.weeklyHearts?.toLocaleString('ko-KR') ?? '—'}</dd>
        </div>
      </dl>
      {!children && actions}
      <ActivityChart stats={stats} />
      {demo && <small>로그인 후 팬 정보를 볼 수 있어요.</small>}
      {error && (
        <p role="status">
          {error}{' '}
          <Button variant="ghost" onClick={() => void refresh()}>
            다시 시도
          </Button>
        </p>
      )}
    </section>
  );
  return (
    <>
      {children ? children(content, actions) : content}
      {peopleKind && userId && (
        <FanPeopleDialog
          key={`${userId}:${peopleKind}`}
          userId={userId}
          kind={peopleKind}
          onClose={() => setPeopleKind(null)}
        />
      )}
    </>
  );
}
export function FollowedProfiles({
  demo,
  onSelect,
}: {
  demo: boolean;
  onSelect: (person: Participant) => void;
}) {
  const [people, setPeople] = useState<Participant[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (demo || !supabase) return;
    void supabase.rpc('my_followed_profiles').then(({ data, error }) => {
      if (!active) return;
      if (error) setError('팔로우 목록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.');
      else setPeople(data as Participant[]);
    });
    return () => {
      active = false;
    };
  }, [demo]);
  if (demo || people?.length === 0)
    return (
      <section className="following-empty">
        <div className="following-empty-art" aria-hidden="true">
          <img src="/icons/profile-followers.png?v=20261110-flat" width={72} height={72} alt="" />
          <img
            className="following-empty-note"
            src="/icons/musical.png"
            width={26}
            height={26}
            alt=""
          />
        </div>
        <h3>{demo ? '좋아하는 목소리를 기억해 두세요' : '아직 팔로우한 사람이 없어요'}</h3>
        <p>
          {demo
            ? '로그인하면 마음에 드는 사람을 팔로우하고 다시 찾아볼 수 있어요.'
            : '마음에 드는 공연을 만났나요?\n프로필에서 팔로우하면 이곳에 모아 볼 수 있어요.'}
        </p>
      </section>
    );
  if (error)
    return (
      <p className="following-status" role="status">
        {error}
      </p>
    );
  if (!people)
    return (
      <p className="following-status" role="status">
        팔로우한 사람들을 불러오고 있어요…
      </p>
    );

  return (
    <div className="followed-profiles">
      {people.map((person) => (
        <FollowedPerson key={person.id} person={person} onSelect={onSelect} />
      ))}
    </div>
  );
}

function FollowedPerson({
  person,
  onSelect,
}: {
  person: Participant;
  onSelect: (person: Participant) => void;
}) {
  const { stats, busy, error, act } = useFanStats(person.id);
  const following = stats?.following ?? true;
  return (
    <article className="following-person">
      <div className="following-person-row">
        <Button
          className="following-profile-link"
          onClick={() => onSelect(person)}
          aria-label={`${person.avatar.name} 프로필 보기`}
        >
          <span className="following-avatar" aria-hidden="true">
            <ModularPortrait avatar={person.avatar} lazy />
          </span>
          <span className="following-person-name">{person.avatar.name}</span>
        </Button>
        <div className="following-actions">
          <Button
            disabled={!stats || busy}
            aria-pressed={following}
            aria-label={`${person.avatar.name} ${following ? '친구 추가 취소' : '친구 추가'}`}
            onClick={() => void act('follow', !following)}
          >
            {following ? (
              <UserCheck size={16} aria-hidden="true" />
            ) : (
              <UserPlus size={16} aria-hidden="true" />
            )}
            <span>{following ? '추가됨' : '친구 추가'}</span>
          </Button>
          <Button
            disabled={!stats || busy}
            aria-pressed={stats?.hearted ?? false}
            className="following-heart"
            aria-label={`${person.avatar.name} ${stats?.hearted ? '하트 취소' : '하트 보내기'}`}
            onClick={() => void act('heart', !stats?.hearted)}
          >
            <Heart size={16} fill={stats?.hearted ? 'currentColor' : 'none'} aria-hidden="true" />
            <span>{stats?.hearted ? '보낸 하트' : '하트 보내기'}</span>
          </Button>
        </div>
      </div>
      {error && (
        <p className="following-action-error" role="status">
          {error}
        </p>
      )}
    </article>
  );
}
