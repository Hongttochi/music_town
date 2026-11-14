import { useConversationSounds } from '../../hooks/useConversationSounds';
import { useEffect, useId, useRef, useState } from 'react';
import { DialogPanel, PanelHeading } from '../ui/Panel';
import { Button } from '../ui/Button';
import rabbitImage from '../../assets/npc/school-rabbit.webp';
import './park-guide.css';

const topics = [
  {
    title: '산책과 휴식',
    items: [
      ['공원 돌아보기', '조이스틱이나 방향키로 움직여요. 강은 다리로 건널 수 있어요.'],
      ['벤치에 앉기', '벤치 가까이에서 의자 아이콘을 눌러요. 다시 움직이면 일어나요.'],
      [
        '커피 한 잔',
        '카페 앞 커피 아이콘을 눌러 메뉴를 고르세요. 준비가 끝나면 커피 받기를 눌러 마실 수 있어요.',
      ],
    ],
  },
  {
    title: '공연 즐기기',
    items: [
      [
        '공연 듣기',
        '공연하는 사람 가까이 가면 소리가 들려요. 오른쪽 공연 중인 무대에서 공연을 찾아보세요.',
      ],
      [
        '무대에 오르기',
        '뮤지션은 빈 무대를 눌러 공연을 시작할 수 있어요. 마이크 권한을 허용하면 가까운 관객에게 소리가 전달돼요.',
      ],
      [
        '공연 시간과 대기',
        '한 번에 최대 5분 공연할 수 있어요. 사용 중인 무대는 대기를 신청하고, 공연 종료로 일찍 내려올 수도 있어요.',
      ],
    ],
  },
  {
    title: '함께하기',
    items: [
      [
        '마음 전하기',
        '하트·박수·응원봉으로 반응해 보세요. 상대 프로필의 팔로우·하트 아이콘으로 마음을 전할 수도 있어요.',
      ],
      [
        '나를 소개하기',
        '오른쪽 위 프로필에서 소개와 캐릭터를 꾸며요. 등록된 Instagram·SoundCloud 링크는 다른 사람도 열어볼 수 있어요.',
      ],
      [
        '소리와 소식',
        '설정에서 효과음 볼륨을 조절해요. 카페 옆 게시판에서는 마을 공지사항을 볼 수 있어요.',
      ],
    ],
  },
];
export function ParkGuideDialog({ onClose }: { onClose: () => void }) {
  const play = useConversationSounds();
  const close = () => {
    play('conversationStart');
    onClose();
  };
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <DialogPanel
      ref={dialog}
      className="park-guide-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div id={titleId}>
        <PanelHeading title="모리의 공원 안내" onClose={close} />
      </div>
      <div className="park-guide-welcome">
        <img src={rabbitImage} width={38} height={44} alt="" />
        <p>처음 오셨나요? 궁금한 내용을 골라 보세요.</p>
      </div>
      <nav className="park-guide-topics" aria-label="안내 주제">
        {topics.map((topic, index) => (
          <Button
            key={topic.title}
            aria-pressed={selected === index}
            data-sound="none"
            onClick={() => {
              play('conversationStart');
              setSelected(index);
            }}
          >
            {topic.title}
          </Button>
        ))}
      </nav>
      <section className="park-guide-content" aria-label={topics[selected].title}>
        {topics[selected].items.map(([heading, description]) => (
          <div key={heading}>
            <h3>{heading}</h3>
            <p>{description}</p>
          </div>
        ))}
      </section>
    </DialogPanel>
  );
}
