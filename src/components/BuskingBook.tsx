import type { Stage } from '../model';
import { Button } from './ui/Button';
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
        <h3>무대에 오르기 전에</h3>
        <ol>
          <li>
            <span>01</span>
            <p>
              대기 중에도 같은 채널에서
              <br />
              자유롭게 산책해요.
            </p>
          </li>
          <li>
            <span>02</span>
            <p>
              내 차례가 오면 무대로 이동해요.
              {stage.artist && <small>신청 순서대로 입장해요. 공연은 한 번에 5분이에요.</small>}
            </p>
          </li>
          <li>
            <span>03</span>
            <p>
              채널을 옮기거나 접속을 종료하면
              <br />
              대기가 취소돼요.
            </p>
          </li>
        </ol>
        <p className="book-demo-note">
          내 차례가 되면 마이크 권한을 요청해요. 허용하면 가까운 관객에게 목소리가 전달돼요. 이어폰
          사용을 권장해요.
        </p>
        <a
          className="book-conduct-link"
          href="/terms/#conduct"
          target="_blank"
          rel="noopener noreferrer"
        >
          성적 괴롭힘·욕설·공연 방해 금지 · 이용 규칙
        </a>
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
