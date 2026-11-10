import { useEffect, useState } from 'react';
import { supabase } from '../../services/auth';
import type { Participant } from '../../hooks/useTown';
import { Button } from '../ui/Button';
import { ModularPortrait } from '../avatar/ModularPortrait';
import './musician-rankings.css';

type Ranking = Participant & { rank: number; hearts: number; weeklyHearts: number };
type Snapshot = { entries: Ranking[]; weekStart: string; weekEnd: string };
const date = (value: string) =>
  new Date(value).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  });

export function MusicianRankings({
  demo,
  onSelect,
}: {
  demo: boolean;
  onSelect: (person: Participant) => void;
}) {
  const [period, setPeriod] = useState<'weekly' | 'all'>('weekly');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let pending = false;
    setSnapshot(null);
    setError('');
    if (demo) return;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        if (!supabase) throw new Error();
        const { data, error } = await supabase.rpc('musician_rankings', { period });
        if (error) throw error;
        if (active) {
          setSnapshot(data as Snapshot);
          setError('');
        }
      } catch {
        if (active) setError('랭킹을 불러오지 못했어요. 다시 시도해 주세요.');
      } finally {
        pending = false;
      }
    };
    void refresh();
    const update = () => {
      if (!document.hidden) void refresh();
    };
    const timer = setInterval(update, 15000);
    window.addEventListener('music-town-fans-changed', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('music-town-fans-changed', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [period, demo, retry]);

  return (
    <section className="musician-rankings" aria-label="뮤지션 하트 랭킹">
      <div className="ranking-periods" role="group" aria-label="집계 기간">
        <Button
          variant="ghost"
          aria-pressed={period === 'weekly'}
          onClick={() => setPeriod('weekly')}
        >
          주간
        </Button>
        <Button variant="ghost" aria-pressed={period === 'all'} onClick={() => setPeriod('all')}>
          누적
        </Button>
      </div>
      {period === 'weekly' && snapshot && (
        <p className="ranking-dates">
          {date(snapshot.weekStart)} ~{' '}
          {date(new Date(new Date(snapshot.weekEnd).getTime() - 1).toISOString())}
        </p>
      )}
      {demo ? (
        <p role="status">로그인하면 뮤지션들의 랭킹을 볼 수 있어요.</p>
      ) : error ? (
        <p role="status">
          {error}{' '}
          <Button variant="ghost" onClick={() => setRetry((v) => v + 1)}>
            다시 시도
          </Button>
        </p>
      ) : !snapshot ? (
        <p role="status">랭킹을 불러오고 있어요…</p>
      ) : snapshot.entries.length === 0 ? (
        <p className="ranking-empty" role="status">
          {period === 'weekly' ? '이번 주 랭킹이 없습니다.' : '아직 랭킹이 없습니다.'}
        </p>
      ) : (
        <ol className="ranking-list">
          {snapshot.entries.map((person) => (
            <li key={person.id}>
              <Button
                variant="choice"
                onClick={() => onSelect(person)}
                aria-label={`${person.rank}위 ${person.avatar.name} 프로필 보기`}
              >
                <strong className="ranking-position" data-top={person.rank <= 3}>
                  {person.rank}
                  <span>위</span>
                </strong>
                <span className="ranking-avatar" aria-hidden="true">
                  <ModularPortrait avatar={person.avatar} lazy />
                </span>
                <span className="ranking-name">{person.avatar.name}</span>
                <span className="ranking-hearts">
                  <img
                    src="/icons/profile-received-heart.png?v=20261110-flat"
                    width={18}
                    height={18}
                    alt="하트"
                  />
                  {(period === 'weekly' ? person.weeklyHearts : person.hearts).toLocaleString(
                    'ko-KR',
                  )}
                </span>
              </Button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
