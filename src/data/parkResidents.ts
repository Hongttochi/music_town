export type ResidentActivity = 'walk' | 'watch' | 'rest' | 'bar' | 'chat' | 'coffee';
export const parkResidents = [
  {
    id: 'bori',
    name: '보리',
    species: '곰',
    column: 0,
    lines: ['급할 거 없죠. 좀 쉬다 가요.', '이 노래 들으러 또 왔어요.', '저 벤치, 은근 편해요.'],
  },
  {
    id: 'roa',
    name: '로아',
    species: '여우',
    column: 1,
    lines: ['무슨 노래 좋아해요?', '아, 이 노래 알아요!', '저쪽도 가 봤어요?'],
  },
  {
    id: 'nabi',
    name: '나비',
    species: '고양이',
    column: 2,
    lines: ['여기 바람 좋다.', '조금만 더 앉아 있을래요.', '같이 들으니까 좋네요.'],
  },
  {
    id: 'dodo',
    name: '도도',
    species: '오리',
    column: 3,
    lines: ['한 바퀴 더 돌까요?', '벌써 집에 가긴 아쉬운데.', '이따 바에서 만나요!'],
  },
  {
    id: 'tori',
    name: '토리',
    species: '다람쥐',
    column: 0,
    extra: true,
    lines: ['도토리를 어디 뒀더라…', '꼬리가 자꾸 박자를 타요.', '커피부터 한 잔 할까요?'],
  },
  {
    id: 'pingu',
    name: '핑구',
    species: '펭귄',
    column: 1,
    extra: true,
    lines: ['저 춤추는 거 아니에요. 걷는 거예요.', '강가가 좀 더 시원해요.', '첫 곡부터 좋은데요?'],
  },
  {
    id: 'ruru',
    name: '루루',
    species: '사슴',
    column: 2,
    extra: true,
    lines: ['이 노래 제목 뭘까요?', '앗, 벌써 끝났어요?', '친구 기다리고 있어요. 같이 있을래요?'],
  },
  {
    id: 'momo',
    name: '모모',
    species: '너구리',
    column: 3,
    extra: true,
    lines: ['여기 자리 괜찮죠?', '오늘 바에 누가 오려나.', '아까 그 노래가 계속 맴돌아요.'],
  },
] as const;
export type ResidentId = (typeof parkResidents)[number]['id'];
export type ResidentTalk = { id: ResidentId; activity: ResidentActivity };
const activityLines: Record<ResidentActivity, string[]> = {
  coffee: ['커피 냄새에 끌려왔어요.', '한 잔 하고 가요.'],
  walk: ['같이 걸을래요?', '오늘 나오길 잘했네요.'],
  watch: ['이 노래 좋죠?', '딱 한 곡만 더!', '와, 잘한다.'],
  rest: ['잠깐 쉬는 중이에요.', '여기 앉으니까 졸리네요.'],
  bar: ['여기 분위기 좋네요.', '조금만 더 있다 가려고요.'],
  chat: ['마침 얘기하고 있었어요. 같이 있어요.', '다음 공연 같이 보러 갈래요?'],
};
export function residentLine(talk: ResidentTalk, previous = '', random = Math.random) {
  const resident = parkResidents.find((r) => r.id === talk.id)!;
  const choices = [...resident.lines, ...activityLines[talk.activity]].filter(
    (line) => line !== previous,
  );
  return choices[Math.floor(random() * choices.length)] ?? resident.lines[0];
}
