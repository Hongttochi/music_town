import { supabase } from './auth';
import type { Avatar } from '../data/model';
import type { MemberProfile } from '../components/auth/Registration';

export type SavedProfile = { avatar: Avatar; profile: MemberProfile };

export async function loadProfile(id: string): Promise<SavedProfile | null> {
  if (!supabase) throw new Error('로그인 연결을 확인해 주세요.');
  const { data, error } = await supabase
    .from('member_profiles')
    .select('role,bio,instagram,soundcloud,avatar,completed')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('프로필을 불러오지 못했어요. DB 설정과 연결을 확인해 주세요.');
  if (!data) return null;
  const { avatar, ...profile } = data;
  return { avatar: avatar as Avatar, profile: profile as MemberProfile };
}

export async function saveProfile(id: string, profile: MemberProfile, avatar: Avatar) {
  if (!supabase) throw new Error('로그인 연결을 확인해 주세요.');
  const { error } = await supabase
    .from('member_profiles')
    .upsert(
      {
        id,
        ...profile,
        avatar,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id')
    .single();
  if (error) throw new Error('저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
}
