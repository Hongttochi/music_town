export type Notice = { id: string; label: string; title: string; paragraphs: string[] };

// Public notices are maintained here and published with the app deployment.
export const notices: Notice[] = [
  {
    id: 'welcome',
    label: '마을 안내',
    title: '음악이 머무는 마을에 오신 걸 환영해요',
    paragraphs: [
      '산책하다 마음에 드는 무대를 만나면 잠시 멈춰 들어보세요. 하트와 박수, 응원봉으로 공연하는 이에게 마음을 전할 수 있어요.',
      '마을의 새 소식은 이 게시판에서 전해 드릴게요.',
    ],
  },
  {
    id: 'rest',
    label: '산책 메모',
    title: '커피 한 잔, 잠깐의 쉼',
    paragraphs: [
      '카페 가까이에서 커피 아이콘을 눌러 원하는 음료를 골라 보세요. 벤치 옆의 의자 아이콘을 누르면 앉아서 쉬어갈 수 있어요.',
    ],
  },
];
