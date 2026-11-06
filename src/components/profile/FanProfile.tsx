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
}: {
  userId?: string;
  own?: boolean;
  demo?: boolean;
}) {
  const { stats, error, busy, act, refresh } = useFanStats(userId, demo);
  return (
    <section className="fan-profile" aria-label="팬 활동">
      <dl className="fan-counts">
        <div>
          <dt>팔로워</dt>
          <dd>
            <img src="/icons/profile-followers.png" width={26} height={26} alt="" />
            <span>{stats ? stats.followers.toLocaleString('ko-KR') : '—'}</span>
          </dd>
        </div>
        <div>
          <dt>받은 하트</dt>
          <dd>
            <img src="/icons/profile-received-heart.png" width={26} height={26} alt="" />
            <span>{stats ? stats.hearts.toLocaleString('ko-KR') : '—'}</span>
          </dd>
        </div>
      </dl>
      {!own && !demo && userId && (
        <div className="fan-actions">
          <Button
            variant="plain"
            size="icon"
            className="fan-action-icon"
            disabled={!stats || busy}
            aria-pressed={stats?.following ?? false}
            aria-label={stats?.following ? '팔로우 취소' : '팔로우'}
            title={stats?.following ? '팔로우 취소' : '팔로우'}
            onClick={() => void act('follow', !stats?.following)}
          >
            <img src="/icons/profile-followers.png" width={28} height={28} alt="" />
          </Button>
          <Button
            variant="plain"
            size="icon"
            className="fan-action-icon"
            disabled={!stats || busy}
            aria-pressed={stats?.hearted ?? false}
            aria-label={stats?.hearted ? '하트 취소' : '하트 보내기'}
            title={stats?.hearted ? '하트 취소' : '하트 보내기'}
            onClick={() => void act('heart', !stats?.hearted)}
          >
            <img src="/icons/profile-received-heart.png" width={28} height={28} alt="" />
          </Button>
        </div>
      )}
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
          <img src="/icons/profile-followers.png" width={72} height={72} alt="" />
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
        <div className="following-empty-guide">
          <span>공연 만나기</span>
          <span aria-hidden="true">→</span>
          <span>프로필 열기</span>
          <span aria-hidden="true">→</span>
          <span>팔로우</span>
        </div>
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
        <Button key={person.id} variant="choice" onClick={() => onSelect(person)}>
          <span className="following-person-name">
            <img src="/icons/profile-followers.png" width={32} height={32} alt="" />
            {person.avatar.name}
          </span>
          <small>
            프로필 보기 <span aria-hidden="true">↗</span>
          </small>
        </Button>
      ))}
    </div>
  );
}
