import { useEffect, useState } from 'react';
import { supabase } from '../../services/auth';
import type { Participant } from '../../hooks/useTown';
import { Button } from '../ui/Button';
import './musician-rankings.css';

type Ranking = Participant & { rank: number; hearts: number; weeklyHearts: number };
type Snapshot = { entries: Ranking[]; weekStart: string; weekEnd: string };
const date = (value: string) =>
  new Date(value).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
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
          주간 랭킹
        </Button>
        <Button variant="ghost" aria-pressed={period === 'all'} onClick={() => setPeriod('all')}>
          누적 랭킹
        </Button>
      </div>
      <p className="ranking-description">
        {period === 'weekly' ? '이번 주, 마음을 사로잡은 뮤지션' : '지금까지 받은 마음이 쌓이는 곳'}
      </p>
      {period === 'weekly' && snapshot && (
        <p className="ranking-dates">
          {date(snapshot.weekStart)} ~{' '}
          {date(new Date(new Date(snapshot.weekEnd).getTime() - 1).toISOString())} · 한국 시간
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
          {period === 'weekly'
            ? '이번 주 첫 하트를 기다리고 있어요.'
            : '아직 하트를 받은 뮤지션이 없어요.'}
          <br />
          마음에 드는 라이브에 하트를 보내 보세요.
        </p>
      ) : (
        <ol className="ranking-list">
          {snapshot.entries.map((person) => (
            <li key={person.id}>
              <Button variant="choice" onClick={() => onSelect(person)}>
                <strong className="ranking-position" data-top={person.rank <= 3}>
                  {person.rank}
                  <span>위</span>
                </strong>
                <span className="ranking-name">
                  {person.avatar.name}
                  <small>프로필 보기</small>
                </span>
                <span className="ranking-hearts">
                  <img src="/icons/profile-received-heart.png" width={18} height={18} alt="하트" />
                  {(period === 'weekly' ? person.weeklyHearts : person.hearts).toLocaleString(
                    'ko-KR',
                  )}
                </span>
              </Button>
            </li>
          ))}
        </ol>
      )}
      <p className="ranking-note">
        매주 월요일 0시부터 새 주간 집계가 시작돼요. 누적 하트는 초기화되지 않아요. 팬 등록은 순위에
        포함되지 않아요. 동점은 공동 순위로 표시해요. 상위 100명을 표시하며 15초마다 갱신돼요.
      </p>
    </section>
  );
}
