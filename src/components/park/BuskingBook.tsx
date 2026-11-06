import type { Stage } from '../../data/model';
import { Button } from '../ui/Button';
import './busking-book.css';

export function BuskingBook({
  stage,
  performing,
  busy = false,
  musician = true,
  onJoin,
}: {
  stage: Stage;
  performing: boolean;
  busy?: boolean;
  musician?: boolean;
  onJoin: () => void;
}) {
  return (
    <div className="busking-book">
      <section className="book-page book-stage">
        <span className="book-kicker">MUSIC TOWN · BUSKING</span>
        <svg className="book-illustration" viewBox="0 0 240 180" aria-hidden="true">
          <ellipse cx="120" cy="145" rx="85" ry="17" fill="#e1d7b7" />
          <ellipse cx="120" cy="137" rx="77" ry="17" fill="#c3a574" />
          <path d="M49 137h142M62 145h116" stroke="#ac8c5d" strokeWidth="2" />
          <path d="M120 89v45m-20 1h40" stroke="#65725a" strokeWidth="5" strokeLinecap="round" />
          <rect x="109" y="42" width="22" height="45" rx="11" fill="#889777" />
          <path
            d="M102 70v9a18 18 0 0 0 36 0v-9M114 51h12m-12 8h12m-12 8h12"
            fill="none"
            stroke="#59684d"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M54 100q-25-29-28-8 1 21 28 8m132 9q23-34 29-13-1 21-29 13" fill="#a4b582" />
          <path d="M165 51v27m0-23 15-4v22" fill="none" stroke="#c7a766" strokeWidth="3" />
          <ellipse cx="160" cy="79" rx="6" ry="4" fill="#c7a766" />
          <ellipse cx="175" cy="74" rx="6" ry="4" fill="#c7a766" />
        </svg>
        <h3>{stage.name}</h3>
        <p>{stage.artist ? `${stage.artist} 공연 중` : '지금 비어 있는 자리예요'}</p>
      </section>
      <section className="book-page book-guide">
        <h3>한 번에 5분, 자유롭게 공연해요</h3>
        <p className="book-summary">
          {stage.artist ? '내 차례가 되면 무대로 이동해요.' : '마이크를 켜고 공연을 시작해 보세요.'}
        </p>
        <p className="book-demo-note">
          {stage.artist
            ? '채널을 옮기거나 나가면 대기가 취소돼요.'
            : '마이크 접근 권한이 필요해요.'}
        </p>
        <Button
          variant="primary"
          className="book-join"
          disabled={performing || busy || !musician}
          onClick={onJoin}
        >
          {!musician
            ? '뮤지션 등록 후 이용할 수 있어요'
            : busy
              ? '신청 중…'
              : performing
                ? '이미 공연 중이에요'
                : stage.artist
                  ? '대기 신청하기'
                  : '공연 시작하기'}
        </Button>
      </section>
    </div>
  );
}
