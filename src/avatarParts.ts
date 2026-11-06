import type { Avatar } from './model';
export const hairNames = [
  '바가지머리',
  '단발머리',
  '곱슬머리',
  '옆가르마',
  '가르마 단발',
  '삐죽머리',
  '긴 웨이브',
  '포니테일',
  '양갈래 번',
  '빡빡이',
  '포마드',
  '드레드',
  '스포츠머리',
  '모히칸',
  '시스루뱅',
  '리프컷',
  '히메컷',
  '울프컷',
  '양갈래 땋기',
  '하이 번',
];
export const eyeNames = ['동그란 눈', '웃는 눈', '느긋한 눈', '아몬드 눈', '콩알 눈', '순한 눈'];
export const noseNames = [
  '세모 코',
  '동그란 코',
  '작은 코',
  '둥근 세모 코',
  '납작한 코',
  '네모 코',
];
export const hairColors = ['#67402a', '#b17a46', '#352d34', '#d87593', '#76a68b'];
const part = (value: number | undefined, count: number) =>
  Number.isInteger(value) && value! >= 0 && value! < count ? value! : 0;
export function resolveParts(avatar: Partial<Avatar>) {
  return {
    hair: part(avatar.hair, hairNames.length),
    eyes: part(avatar.eyeShape, eyeNames.length),
    nose: part(avatar.noseShape, noseNames.length),
    skin: avatar.skinTone || '',
    hairColor: avatar.hairColor || hairColors[0],
    eyeColor: avatar.eyeColor || '#34281f',
  };
}
export function npcAppearance(seed: number): Partial<Avatar> {
  return {
    hair: seed % hairNames.length,
    eyeShape: Math.floor(seed / 2) % eyeNames.length,
    noseShape: Math.floor(seed / 3) % noseNames.length,
    hairColor: hairColors[seed % hairColors.length],
    skinTone: ['', '#f5cfad', '#d6a078', '#a87551'][seed % 4],
  };
}
