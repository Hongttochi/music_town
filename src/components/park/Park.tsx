import { useParkScene } from '../../hooks/useParkScene';
import type { ParkProps } from '../../types/park';
export type { Position } from '../../types/park';
import { NoticeBoardDialog } from './NoticeBoardDialog';
import { CoffeeOrderDialog } from './CoffeeOrderDialog';
import { Button } from '../ui/Button';
import { Flaticon } from '../ui/Flaticon';
import { findCoffee } from '../../data/coffeeMenu';
export function Park(props: ParkProps) {
  const {
    canvas,
    error,
    noticeBoardOpen,
    setNoticeBoardOpen,
    nearNoticeBoard,
    noticeBubble,
    coffeeMenuOpen,
    setCoffeeMenuOpen,
    useCoffee,
    coffeeAction,
    coffeeBubble,
    benchAction,
    benchBubble,
    useBench,
  } = useParkScene(props);

  return (
    <>
      <canvas
        ref={canvas}
        id="park"
        aria-label="3D 음악 공원. 조이스틱 또는 방향키로 산책하세요."
      />
      {noticeBoardOpen && <NoticeBoardDialog onClose={() => setNoticeBoardOpen(false)} />}
      {nearNoticeBoard && !error && props.performing === null && (
        <Button
          ref={noticeBubble}
          className="bench-action notice-board-action"
          style={{ visibility: 'hidden' }}
          aria-label="마을 공지사항 보기"
          title="마을 게시판"
          onClick={() => setNoticeBoardOpen(true)}
        >
          <Flaticon name="blackboard" size={24} />
        </Button>
      )}
      {coffeeMenuOpen && (
        <CoffeeOrderDialog
          onClose={() => setCoffeeMenuOpen(false)}
          onOrder={(id) => {
            setCoffeeMenuOpen(false);
            useCoffee.current(id);
          }}
        />
      )}
      {coffeeAction && !error && props.performing === null && (
        <Button
          ref={coffeeBubble}
          className="bench-action coffee-action"
          style={{ visibility: 'hidden' }}
          aria-label={coffeeAction}
          title={coffeeAction}
          disabled={coffeeAction.endsWith('중…')}
          onClick={() => useCoffee.current()}
        >
          <img
            src={findCoffee('americano').icon}
            width={24}
            height={24}
            alt=""
            aria-hidden="true"
          />
        </Button>
      )}
      {benchAction && !error && props.performing === null && (
        <Button
          ref={benchBubble}
          className="bench-action"
          style={{ visibility: 'hidden' }}
          aria-label="의자에 앉기"
          title="앉기"
          onClick={() => useBench.current()}
        >
          <Flaticon name="bench" size={24} />
        </Button>
      )}
      <span
        id="player-reaction"
        className="player-reaction pointer-events-none absolute z-10"
        aria-hidden="true"
      >
        {props.reaction && (
          <span
            key={props.reaction.at}
            className="reaction-burst"
            data-kind={props.reaction.symbol}
          >
            {[0, 1, 2].map((index) => (
              <img
                key={index}
                src={`/icons/${props.reaction?.symbol === '♡' ? 'heart' : props.reaction?.symbol === '👏' ? 'clap' : 'lightstick'}.png`}
                alt=""
              />
            ))}
          </span>
        )}
      </span>
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-[#e5ead8] p-8 text-center">
          이 브라우저에서 3D를 시작하지 못했어요. WebGL을 지원하는 브라우저에서 다시 열어 주세요.
        </div>
      )}
    </>
  );
}
