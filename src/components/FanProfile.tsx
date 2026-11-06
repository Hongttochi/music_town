import { ActivityChart } from './ActivityChart';
import { useEffect, useState } from 'react';
import { useFanStats } from '../useFanStats';
import { Button } from './ui/Button';
import { supabase } from '../auth';
import type { Participant } from '../useTown';
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
          <dd>{stats ? stats.followers.toLocaleString('ko-KR') : '—'}</dd>
        </div>
        <div>
          <dt>받은 하트</dt>
          <dd>{stats ? stats.hearts.toLocaleString('ko-KR') : '—'}</dd>
        </div>
      </dl>
      {!own && !demo && userId && (
        <div className="fan-actions">
          <Button
            variant="secondary"
            disabled={!stats || busy}
            aria-pressed={stats?.following ?? false}
            onClick={() => void act('follow', !stats?.following)}
          >
            {stats?.following ? '팔로잉' : '팔로우'}
          </Button>
          <Button
            variant="secondary"
            disabled={!stats || busy}
            aria-pressed={stats?.hearted ?? false}
            title="하트는 계정당 한 번 집계돼요"
            onClick={() => void act('heart', !stats?.hearted)}
          >
            <img src="/icons/heart.png" width={17} height={17} alt="" />
            {stats?.hearted ? '하트 보냄' : '하트 보내기'}
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
  if (demo) return <p>로그인 후 팔로우할 수 있어요.</p>;
  if (error) return <p role="status">{error}</p>;
  if (!people) return <p role="status">팔로우 목록을 불러오는 중…</p>;
  if (!people.length) return <p>아직 팔로우한 뮤지션이 없어요.</p>;
  return (
    <div className="followed-profiles">
      {people.map((person) => (
        <Button key={person.id} variant="choice" onClick={() => onSelect(person)}>
          {person.avatar.name}
          <small>프로필 보기</small>
        </Button>
      ))}
    </div>
  );
}
