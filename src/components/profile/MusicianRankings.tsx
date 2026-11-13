import { useEffect, useId, useRef, useState } from 'react';
import { RankingCalendar } from './RankingCalendar';
import { CalendarDays, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { koreaDate, rankingWeek, shiftRankingWeek } from '../../data/rankingWeeks';
import { supabase } from '../../services/auth';
import type { Participant } from '../../hooks/useTown';
import { Button } from '../ui/Button';
import { ModularPortrait } from '../avatar/ModularPortrait';
import './musician-rankings.css';

type Ranking = Participant & { rank: number; hearts: number; weeklyHearts: number };
type Snapshot = { entries: Ranking[]; weekStart: string; weekEnd: string };
const date = (value: string) => koreaDate(new Date(value)).replaceAll('-', '.');

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
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarId = useId();
  const calendarToggle = useRef<HTMLButtonElement>(null);
  const closeCalendar = () => {
    setCalendarOpen(false);
    calendarToggle.current?.focus();
  };
  const today = koreaDate();
  const currentWeek = rankingWeek(today);
  const displayedWeek = selectedWeek ?? currentWeek;
  const historical = displayedWeek < currentWeek;
  const chooseWeek = (day: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today) return;
    const week = rankingWeek(day);
    if (week === displayedWeek) return;
    setSnapshot(null);
    setSelectedWeek(week === currentWeek ? null : week);
  };
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
        const { data, error } =
          period === 'weekly' && selectedWeek
            ? await supabase.rpc('musician_rankings_week', { selected_date: selectedWeek })
            : await supabase.rpc('musician_rankings', { period });
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
  }, [period, demo, retry, selectedWeek]);

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
      {period === 'weekly' && !demo && (
        <>
          <div className="ranking-dates">
            <Button
              variant="ghost"
              size="icon"
              aria-label="이전 주"
              onClick={() => chooseWeek(shiftRankingWeek(displayedWeek, -1))}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              className="ranking-calendar-toggle"
              ref={calendarToggle}
              aria-expanded={calendarOpen}
              aria-controls={calendarId}
              onClick={() => setCalendarOpen((open) => !open)}
            >
              <CalendarDays size={14} aria-hidden="true" />
              <span>
                {date(`${displayedWeek}T00:00:00+09:00`)}
              </span>
              <span aria-hidden="true">~</span>
              <CalendarDays size={14} aria-hidden="true" />
              <span>
                {date(
                  new Date(
                    new Date(`${shiftRankingWeek(displayedWeek, 1)}T00:00:00+09:00`).getTime() - 1,
                  ).toISOString(),
                )}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="다음 주"
              disabled={!historical}
              onClick={() => chooseWeek(shiftRankingWeek(displayedWeek, 1))}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </Button>
          </div>
          {calendarOpen && (
            <RankingCalendar
              id={calendarId}
              selectedWeek={displayedWeek}
              today={today}
              onSelect={(day) => {
                chooseWeek(day);
                closeCalendar();
              }}
              onClose={closeCalendar}
            />
          )}
          {snapshot && !error && snapshot.entries.some((person) => person.rank === 1) && (
            <div className="ranking-winners" aria-live="polite">
              <Trophy size={16} aria-hidden="true" />
              <span>
                {historical ? '주간' : '이번 주'}{' '}
                {snapshot.entries.filter((person) => person.rank === 1).length > 1
                  ? '공동 1위'
                  : '1위'}
              </span>
              <strong>
                {snapshot.entries
                  .filter((person) => person.rank === 1)
                  .map((person) => person.avatar.name)
                  .join(' · ')}
              </strong>
            </div>
          )}
        </>
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
        <div className="ranking-loading" role="status" aria-label="랭킹을 불러오고 있어요">
          <span className="ranking-spinner" aria-hidden="true" />
        </div>
      ) : snapshot.entries.length === 0 ? (
        <p className="ranking-empty" role="status">
          {period === 'weekly' ? '선택한 주의 랭킹이 없습니다.' : '아직 랭킹이 없습니다.'}
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
