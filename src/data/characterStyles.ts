export const characterStyles = [
  { name: '빨강 · 장난꾸러기', top: 0, bottom: 275 },
  { name: '노랑 · 웃음쟁이', top: 275, bottom: 525 },
  { name: '곱슬 · 느긋한 친구', top: 525, bottom: 805 },
  { name: '분홍 · 주근깨 친구', top: 805, bottom: 1038 },
  { name: '남색 · 무심한 친구', top: 1038, bottom: 1308 },
  { name: '민트 · 안경 친구', top: 1308, bottom: 1536 },
];
export const normalizeStyle = (value = 0) =>
  Number.isInteger(value) && value >= 0 && value < 6 ? value : 0;
