export type Avatar = {
  name: string;
  profileIcon?: string;
  skin: string;
  shirt: string;
  pants: string;
  clothingStyle?:
    | 'plain'
    | 'stripe'
    | 'pocket'
    | 'suit'
    | 'street'
    | 'puffer'
    | 'shirt'
    | 'dress'
    | 'monk'
    | 'tank';
  hair: number;
  sprite?: number;
  skinTone?: string;
  eyeColor?: string;
  eyeShape?: number;
  noseShape?: number;
  hairColor?: string;
  headwear?: 'none' | 'snapback' | 'beanie' | 'bucket';
  earwear?: 'none' | 'headset' | 'airpods';
  eyewear?: 'none' | 'sunglasses' | 'glasses';
  bag?: 'none' | 'backpack' | 'crossbody';
  instrument?: 'none' | 'guitar' | 'microphone' | 'electric' | 'ukulele' | 'tambourine';
};
export type Stage = {
  id: number;
  name: string;
  artist: string;
  genre: string;
  bio: string;
  followers: number;
  listeners: number;
  x: number;
  y: number;
  color: string;
};
export const stages: Stage[] = [
  {
    id: 0,
    name: '느티나무 아래',
    artist: '서우',
    genre: '어쿠스틱 · 싱어송라이터',
    bio: '평범한 하루에 작은 노래를 더해요. 오늘도 잠깐 쉬어가세요.',
    followers: 128,
    listeners: 6,
    x: 480,
    y: 355,
    color: '#d8a174',
  },
  {
    id: 1,
    name: '분수 옆 작은 무대',
    artist: '윤슬',
    genre: '인디 · 포크',
    bio: '반짝이는 순간들을 노래합니다.',
    followers: 86,
    listeners: 4,
    x: 860,
    y: 450,
    color: '#8d9aab',
  },
  {
    id: 2,
    name: '꽃길 모퉁이',
    artist: '오후네시',
    genre: '팝 · 보컬',
    bio: '느린 오후에 어울리는 목소리.',
    followers: 64,
    listeners: 3,
    x: 420,
    y: 660,
    color: '#bfa1ad',
  },
  {
    id: 3,
    name: '연못가 쉼터',
    artist: '',
    genre: '빈 자리',
    bio: '',
    followers: 0,
    listeners: 0,
    x: 830,
    y: 200,
    color: '#b2bd98',
  },
  {
    id: 4,
    name: '잔디 언덕',
    artist: '',
    genre: '빈 자리',
    bio: '',
    followers: 0,
    listeners: 0,
    x: 1070,
    y: 690,
    color: '#b2bd98',
  },
  {
    id: 5,
    name: '다리 건너 강바람 무대',
    artist: '',
    genre: '빈 자리',
    bio: '',
    followers: 0,
    listeners: 0,
    x: 1500,
    y: 450,
    color: '#b2bd98',
  },
];
export const populations = [18, 24, 12, 30, 9];
export const defaultAvatar: Avatar = {
  name: '산책자',
  skin: '#eac09a',
  shirt: '#e7a677',
  pants: '#526e77',
  hair: 0,
};
export function readSaved<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
export function nearestStage(x: number, y: number) {
  return stages.reduce((a, b) =>
    Math.hypot(a.x - x, a.y - y) < Math.hypot(b.x - x, b.y - y) ? a : b,
  );
}
export function koreanHour() {
  return (
    Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
    ) % 24
  );
}
