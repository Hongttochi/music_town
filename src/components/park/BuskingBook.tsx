import type { Stage } from '../../data/model';
import { Flaticon } from '../ui/Flaticon';
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
        <img
          className="book-logo"
          src="/art/busking-town-logo.png"
          alt="MUSIC TOWN"
          width={110}
          height={39}
        />
        <span className="book-stage-label">작은 무대, 가까운 음악</span>
        <img
          className="book-illustration"
          src="/art/mori-singing.png"
          alt="마이크를 들고 노래하는 모리"
          width={190}
          height={170}
        />
        <h3>{stage.name}</h3>
        <p className="book-stage-status" data-live={!!stage.artist}>
          <span aria-hidden="true" />
          {stage.artist ? `${stage.artist} 공연 중` : '지금 공연할 수 있어요'}
        </p>
      </section>
      <section className="book-page book-guide">
        <h3>당신의 음악을 들려주세요</h3>
        <div className="book-details">
          <span>
            <Flaticon name="alarm" size={14} />
            최대 5분
          </span>
          <span>
            <Flaticon name="mic" size={14} />
            마이크로 라이브
          </span>
        </div>
        <div className="book-instructions">
          <p className="book-summary">
            {stage.artist
              ? '대기를 신청하면 순서대로 무대에 올라요. 내 차례가 되면 무대로 이동하고 마이크 권한을 요청해요.'
              : '마이크를 켜면 가까이 있는 관객에게 목소리와 연주가 들려요. 노래나 악기 연주로 나만의 무대를 만들어 보세요.'}
          </p>
          <p className="book-demo-note">
            {stage.artist
              ? '공연은 최대 5분이에요. 채널을 옮기거나 나가면 대기가 취소돼요.'
              : '* 마이크 접근을 허용해 주세요. 공연은 최대 5분이며, 끝내고 싶을 때 공연 종료를 누르면 돼요.'}
          </p>
        </div>
        <Button
          variant="primary"
          className="book-join"
          disabled={performing || busy || !musician}
          onClick={onJoin}
        >
          <Flaticon name="mic" size={16} />
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
