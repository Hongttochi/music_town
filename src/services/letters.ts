import { supabase } from './auth';
import type { Participant } from '../hooks/useTown';

export type TownLetter = {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  recipientName: string;
  subject: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};
const messages: Record<string, string> = {
  FOLLOW_REQUIRED: '현재 팔로우한 유저에게만 보낼 수 있어요. 받는 사람 목록을 새로고침해 주세요.',
  PROFILE_REQUIRED: '등록을 완료한 유저끼리 편지를 보낼 수 있어요.',
  LETTER_LIMIT: '편지는 24시간 동안 최대 50통까지 보낼 수 있어요.',
  AUTH_REQUIRED: '다시 로그인해 주세요.',
  LETTER_NOT_FOUND: '편지를 찾을 수 없어요.',
  INVALID_LETTER: '제목은 80자, 내용은 2,000자 이내로 입력해 주세요.',
};
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('로그인 후 이용해 주세요.');
  const { data, error } = await supabase.rpc(name, args);
  if (error)
    throw new Error(
      messages[error.message] || '편지함에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  return data as T;
}
export const letterRecipients = () => rpc<Participant[]>('my_followed_profiles');
export const listLetters = (box: 'inbox' | 'sent', offset = 0) =>
  rpc<TownLetter[]>('my_town_letters', { box, page_offset: offset });
export const readLetter = (id: string) => rpc<string>('read_town_letter', { letter_id: id });
export const sendLetter = (recipient: string, subject: string, body: string, requestId: string) =>
  rpc<string>('send_town_letter', { recipient, subject, body, request_id: requestId });
